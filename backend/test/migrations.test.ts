import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { runMigrations } from "../src/db/migrate.js";
import { pool } from "../src/db.js";

const MIGRATION_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/db/migrations/001_locations_rooms.sql"
);

after(async () => {
  await pool.end();
});

// ---------------------------------------------------------------------------
// Teil 1: Statische Prüfung der SQL-Datei (läuft auch ohne Datenbank).
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
// Teil 2: DB-Integration – läuft nur, wenn eine Postgres erreichbar ist
// (in der Sandbox normalerweise nicht; im Compose-Stack dagegen schon).
// Gegen ein Wegwerf-Schema unter eigener search_path, damit der Test die
// Entwickler-/Testdatenbank nicht anfasst.
// ---------------------------------------------------------------------------

const canReachDb = await pool
  .query("SELECT 1")
  .then(() => true)
  .catch(() => false);

if (canReachDb) {
  const schema = `migrate_test_${Date.now()}_${process.pid}`;
  const testPool = new Pool({ ...pool.options, options: `-c search_path=${schema}` });

  before(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    // Advisory Locks sind global – für den Test ein eigener Lock-Scope nötig,
    // damit der Test nicht mit einem parallelen Serverstart kollidiert.
  });

  after(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await testPool.end();
  });

  test("DB: Migration läuft auf frischem Schema an und erzeugt die Tabellen", async () => {
    const applied = await runMigrations(testPool);
    assert.ok(applied.includes("001_locations_rooms.sql"));
    const tables = await testPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1",
      [schema]
    );
    const names = tables.rows.map((r) => r.table_name).sort();
    assert.ok(names.includes("locations"), "locations fehlt");
    assert.ok(names.includes("rooms"), "rooms fehlt");
  });

  test("DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt", async () => {
    await assert.rejects(
      testPool.query("INSERT INTO rooms (name, location_id, capacity) VALUES ('X', 999999, 4)")
    );
  });

  test("DB: gültiger Standort + Raum lässt sich anlegen", async () => {
    const loc = await testPool.query(
      "INSERT INTO locations (name) VALUES ('Teststandort') RETURNING id"
    );
    const res = await testPool.query(
      "INSERT INTO rooms (name, location_id, capacity) VALUES ('Testraum', $1, 8) RETURNING id",
      [loc.rows[0].id]
    );
    assert.ok(res.rows[0].id > 0);
  });

  test("DB: wiederholte Ausführung ist fehlerfrei und ändert nichts mehr", async () => {
    const second = await runMigrations(testPool);
    assert.deepEqual(second, []);
  });
} else {
  test("DB-Integrationsteil übersprungen (keine Postgres erreichbar)", () => {
    assert.ok(true);
  });
}
