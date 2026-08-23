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

const BOOKINGS_MIGRATION_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/db/migrations/003_bookings.sql"
);

/** Feste Testzeitpunkte für Buchungszeilen (UTC, Inhalt beliebig aber konstant). */
const STARTS_AT = "2026-08-24T10:00:00Z";
const ENDS_AT = "2026-08-24T11:00:00Z";

/** Legt Standort + Raum frisch an und liefert die Raum-ID (pg-mem gibt BIGINT als String). */
async function createTestRoom(db: InMemoryDb, name: string): Promise<number> {
  const loc = await db.query<{ id: number }>(
    "INSERT INTO locations (name) VALUES ('Teststandort') RETURNING id::int AS id"
  );
  const room = await db.query<{ id: number }>(
    "INSERT INTO rooms (name, location_id, capacity) VALUES ($1, $2, 8) RETURNING id::int AS id",
    [name, loc.rows[0].id]
  );
  return room.rows[0].id;
}

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

test("Migration 003 existiert und enthält bookings mit allen Pflichtspalten", async () => {
  const sql = await readFile(BOOKINGS_MIGRATION_FILE, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS bookings/);
  assert.match(sql, /id\s+BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY/);
  // Urheber-Feld: bis zur Users-/SSO-Klärung als Text geführt.
  assert.match(sql, /created_by\s+TEXT NOT NULL/);
  assert.match(sql, /starts_at\s+TIMESTAMPTZ NOT NULL/);
  assert.match(sql, /ends_at\s+TIMESTAMPTZ NOT NULL/);
});

test("bookings.room_id ist NOT NULL, per FK an rooms gebunden und Löschverhalten ist definiert", async () => {
  const sql = await readFile(BOOKINGS_MIGRATION_FILE, "utf8");
  assert.match(
    sql,
    /room_id\s+BIGINT NOT NULL REFERENCES rooms\s*\(id\)\s*ON DELETE RESTRICT/
  );
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
    assert.deepEqual(applied, [
      "001_locations_rooms.sql",
      "002_amenities.sql",
      "003_bookings.sql",
    ]);

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

    // Die neue Buchungs-Tabelle ist Teil des Schemas und bleibt vom
    // wiederholten Lauf unberührt (leer, solange nichts hineingeschrieben wurde).
    const bookingsCount = await db.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM bookings"
    );
    assert.equal(bookingsCount.rows[0].n, 0);
  } finally {
    await db.end();
  }
});

// ---------------------------------------------------------------------------
// Migration 003 (Buchungen): dieselben DB-Integrationssätze wie oben gegen die
// In-Memory-Postgres – Referenzierbarkeit eines buchungsfreien Raums,
// Status-Default, FK-Fehlerfall und Löschverhalten.
// ---------------------------------------------------------------------------

test("DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt", async () => {
  const db = await InMemoryDb.migrated();
  try {
    const roomId = await createTestRoom(db, "Konferenzraum Ost");
    const res = await db.query<{ id: number; status: string }>(
      "INSERT INTO bookings (room_id, created_by, starts_at, ends_at) " +
        "VALUES ($1, $2, $3::timestamptz, $4::timestamptz) RETURNING id::int AS id, status",
      [roomId, "mitarbeiter@example.com", STARTS_AT, ENDS_AT]
    );

    assert.ok(res.rows[0].id > 0);
    assert.equal(res.rows[0].status, "bestaetigt");

    // Der buchungsfreie Raum lässt sich referenzieren – hier per Rücklesen
    // über den FK belegt.
    const back = await db.query<{ room_id: number; created_by: string }>(
      "SELECT room_id::int AS room_id, created_by FROM bookings WHERE id = $1",
      [res.rows[0].id]
    );
    assert.equal(back.rows[0].room_id, roomId);
    assert.equal(back.rows[0].created_by, "mitarbeiter@example.com");
  } finally {
    await db.end();
  }
});

test("DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt", async () => {
  const db = await InMemoryDb.migrated();
  try {
    await assert.rejects(
      db.query(
        "INSERT INTO bookings (room_id, created_by, starts_at, ends_at) " +
          "VALUES ($1, $2, $3::timestamptz, $4::timestamptz)",
        [999999, "mitarbeiter@example.com", STARTS_AT, ENDS_AT]
      )
    );
  } finally {
    await db.end();
  }
});

test("DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert", async () => {
  const db = await InMemoryDb.migrated();
  try {
    const roomId = await createTestRoom(db, "Konferenzraum West");
    await db.query(
      "INSERT INTO bookings (room_id, created_by, starts_at, ends_at) " +
        "VALUES ($1, $2, $3::timestamptz, $4::timestamptz)",
      [roomId, "mitarbeiter@example.com", STARTS_AT, ENDS_AT]
    );

    // RESTRICT: Das DELETE muss scheitern und darf keine Buchung mitlöschen.
    await assert.rejects(db.query("DELETE FROM rooms WHERE id = $1", [roomId]));

    const remaining = await db.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM bookings WHERE room_id = $1",
      [roomId]
    );
    assert.equal(
      remaining.rows[0].n,
      1,
      "RESTRICT darf keine Buchung kaskadierend mitlöschen"
    );
  } finally {
    await db.end();
  }
});
