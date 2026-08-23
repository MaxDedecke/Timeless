import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../src/db/migrate.js";
import { InMemoryDb } from "./helpers/in-memory-db.js";

const MIGRATION_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/db/migrations/001_locations_rooms.sql"
);

// ---------------------------------------------------------------------------
// Teil 1: Statische Prüfung der SQL-Datei.
// ---------------------------------------------------------------------------

test("Migration 001 existiert und enthält locations (id, name)", async () => {
  const sql = await readFile(MIGRATION_FILE, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS locations/);
  assert.match(sql, /id\s+BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY/);
  assert.match(sql, /name\s+TEXT NOT NULL/);
});

test("Migration 001 enthält rooms (id, name, location_id, capacity)", async () => {
  const sql = await readFile(MIGRATION_FILE, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS rooms/);
  assert.match(sql, /name\s+TEXT NOT NULL/);
  assert.match(sql, /location_id\s+BIGINT NOT NULL/);
  assert.match(sql, /capacity\s+INTEGER NOT NULL/);
});

test("rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden", async () => {
  const sql = await readFile(MIGRATION_FILE, "utf8");
  assert.match(sql, /location_id\s+BIGINT NOT NULL REFERENCES locations\s*\(id\)/);
});

// ---------------------------------------------------------------------------
// Teil 2: DB-Integration gegen die In-Memory-Postgres des Helpers
// (pg-mem). Die Suite läuft damit vollständig containerlos grün statt den
// Integrationsteil ohne erreichbare Postgres zu überspringen – dieselben
// Aussagen wie zuvor gegen eine echte Postgres, weil pg-mem dasselbe SQL
// wirklich ausführt (DDL, Identity-Spalten, Fremdschlüssel).
//
// Jeder Test arbeitet auf einer eigenen Instanz mit frischem Schema, damit
// sich Tabellenbestand und Seed nicht zwischen den Tests herumreichen. Eine
// Ausnahme macht der „wiederholtes Setup“-Test bewusst nicht: Er wiederholt
// das Migration-Setup innerhalb desselben Tests gegen dieselbe Instanz, um
// nachzuweisen, dass es nicht an bereits existierenden Objekten scheitert
// (IF-NOT-EXISTS-Behandlung im Helper).
// ---------------------------------------------------------------------------

test("DB: Migration läuft auf frischer In-Memory-Instanz an und erzeugt die Tabellen", async () => {
  const db = new InMemoryDb();
  try {
    const applied = await runMigrations(db);
    assert.ok(
      applied.includes("001_locations_rooms.sql"),
      "001_locations_rooms.sql wurde nicht angewendet"
    );

    const tables = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const names = tables.rows.map((r) => r.table_name);
    assert.ok(names.includes("locations"), "locations fehlt");
    assert.ok(names.includes("rooms"), "rooms fehlt");
    assert.ok(names.includes("schema_migrations"), "schema_migrations fehlt");
  } finally {
    await db.end();
  }
});

test("DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt", async () => {
  const db = await InMemoryDb.migrated();
  try {
    await assert.rejects(
      db.query("INSERT INTO rooms (name, location_id, capacity) VALUES ('X', 999999, 4)")
    );
  } finally {
    await db.end();
  }
});

test("DB: gültiger Standort + Raum lässt sich anlegen", async () => {
  const db = await InMemoryDb.migrated();
  try {
    const loc = await db.query<{ id: number }>(
      "INSERT INTO locations (name) VALUES ('Teststandort') RETURNING id::int AS id"
    );
    const res = await db.query<{ id: number }>(
      "INSERT INTO rooms (name, location_id, capacity) VALUES ('Testraum', $1, 8) RETURNING id::int AS id",
      [loc.rows[0].id]
    );
    assert.ok(res.rows[0].id > 0);
  } finally {
    await db.end();
  }
});

test("DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr", async () => {
  const db = new InMemoryDb();
  try {
    const applied = await runMigrations(db);
    assert.deepEqual(applied, ["001_locations_rooms.sql", "002_amenities.sql"]);

    // Zweiter Lauf über denselben connect()-Client-Pfad: Das CREATE TABLE IF
    // NOT EXISTS für schema_migrations trifft jetzt ein existierendes Objekt
    // und muss als No-op durchgehen (pg-mem-AST-Defekt im Helper umgangen),
    // die vermerkten Dateien dürfen nicht erneut laufen.
    const second = await runMigrations(db);
    assert.deepEqual(second, [], "Zweiter Lauf darf keine Dateien erneut anwenden");

    // Schema-/Datenstand unverändert: Der Seed darf nicht doppelt eingefügt sein.
    const seed = await db.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM amenities"
    );
    assert.equal(seed.rows[0].n, 3);

    const third = await runMigrations(db);
    assert.deepEqual(third, []);
  } finally {
    await db.end();
  }
});
