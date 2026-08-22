import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { InMemoryDb } from "./helpers/in-memory-db.js";

/**
 * Smoke-Test für die InMemoryDb-Naht (pg-mem).
 *
 * Geprüft wird genau das, was das Ticket verspricht: Dieselbe
 * Aufrufschnittstelle wie die Produktions-Naht (query mit Text+Values,
 * connect() für Transaktionen), aber SQL wird echt ausgeführt – DDL, Identity-
 * Spalten, Parameter-Binding, Transaktionssemantik und Fehlerfälle verhalten
 * sich wie gegen eine echte Postgres, ohne dass ein Container nötig ist.
 */

const db = new InMemoryDb();

after(async () => {
  await db.end();
});

test("InMemoryDb: CREATE TABLE/INSERT/SELECT-Roundtrip mit Identity und Parameter-Binding", async () => {
  // Schema bringt der Test selbst mit – der Helper ist bewusst schemaneutral.
  await db.query(`
    CREATE TABLE smoke_locations (
      id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  await db.query(`
    CREATE TABLE smoke_rooms (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name        TEXT NOT NULL,
      location_id BIGINT NOT NULL REFERENCES smoke_locations (id),
      capacity    INTEGER NOT NULL
    )
  `);

  const insertedLocation = await db.query<{ id: number }>(
    "INSERT INTO smoke_locations (name) VALUES ($1) RETURNING id::int AS id",
    ["Hamburg"]
  );
  assert.equal(insertedLocation.rowCount, 1);
  assert.equal(insertedLocation.rows[0].id, 1);

  const insertedRoom = await db.query<{ id: number }>(
    "INSERT INTO smoke_rooms (name, location_id, capacity) VALUES ($1, $2, $3) RETURNING id::int AS id",
    ["Besprechung klein", insertedLocation.rows[0].id, 6]
  );
  assert.equal(insertedRoom.rowCount, 1);
  assert.ok(insertedRoom.rows[0].id > 0);

  const selected = await db.query<{
    id: number;
    name: string;
    capacity: number;
  }>(
    "SELECT id::int AS id, name, capacity FROM smoke_rooms WHERE location_id = $1",
    [insertedLocation.rows[0].id]
  );
  assert.equal(selected.rowCount, 1);
  assert.equal(selected.rows[0].name, "Besprechung klein");
  assert.equal(selected.rows[0].capacity, 6);
});

test("InMemoryDb: Transaktionen über connect() – COMMIT hält, ROLLBACK macht rückgängig", async () => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO smoke_locations (name) VALUES ($1)",
      ["Berlin"]
    );
    await client.query("COMMIT");
  } finally {
    client.release();
  }

  const committed = await db.query("SELECT name FROM smoke_locations WHERE name = $1", [
    "Berlin",
  ]);
  assert.equal(committed.rowCount, 1);

  const rollbackClient = await db.connect();
  try {
    await rollbackClient.query("BEGIN");
    await rollbackClient.query(
      "INSERT INTO smoke_locations (name) VALUES ($1)",
      ["München"]
    );
    // Innerhalb der offenen Transaktion ist die Zeile sichtbar – genau wie
    // in einer echten Postgres.
    const insideTx = await rollbackClient.query(
      "SELECT name FROM smoke_locations WHERE name = $1",
      ["München"]
    );
    assert.equal(insideTx.rowCount, 1);
    await rollbackClient.query("ROLLBACK");
  } finally {
    rollbackClient.release();
  }

  // Bewusst auf einem FRISCHEN Client geprüft: Die Snapshot-Abbildung gilt pro
  // Datenbank, nicht je Session – innerhalb desselben Clients wäre die Zeile
  // weiterhin sichtbar (siehe Grenzen im Klassenkommentar des Helpers).
  const rolledBack = await db.query(
    "SELECT name FROM smoke_locations WHERE name = $1",
    ["München"]
  );
  assert.equal(
    rolledBack.rowCount,
    0,
    "Nach ROLLBACK darf die Zeile nicht mehr existieren"
  );
});

test("InMemoryDb: Abfrage gegen nicht existierende Tabelle führt zu einem verständlichen Fehler", async () => {
  await assert.rejects(
    db.query("SELECT * FROM diese_tabelle_existiert_nicht"),
    (err: unknown) => {
      assert.ok(err instanceof Error, "Fehler ist kein Error");
      assert.ok(
        (err as Error).message.length > 0,
        "Fehler enthält keine Meldung"
      );
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// Migrationen in der In-Memory-DB (dieses Ticket): applyMigrations() spielt
// das reale Schema aus src/db/migrations ein – Tabellenbestand, Seed, Isolation
// und der Fehlerpfad für nicht unterstütztes SQL.
//
// Bewusst eine frische InMemoryDb je Test (kein geteiltes Exemplar): Genau
// das ist Teil des Akzeptanzkriteriums „Jeder Testlauf startet mit frischem
// Schema“.
// ---------------------------------------------------------------------------

const EXPECTED_TABLES = [
  "amenities",
  "locations",
  "room_amenities",
  "rooms",
] as const;

test("applyMigrations erzeugt alle Tabellen aus 001 und 002", async () => {
  const db = new InMemoryDb();
  try {
    const applied = await db.applyMigrations();
    assert.deepEqual(applied, ["001_locations_rooms.sql", "002_amenities.sql"]);

    // Introspektion über den pg-Katalog statt Annahme: Nur so ist bewiesen,
    // dass die Tabellen tatsächlich existieren und nicht nur „nichts schiefging“.
    const { rows } = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    assert.deepEqual(
      rows.map((row) => row.table_name),
      [...EXPECTED_TABLES]
    );

    // Der Seed aus Migration 002 muss ebenfalls da sein (fester Katalog laut
    // Beschluss vom 21.8.2026).
    const seed = await db.query<{ key: string; label: string }>(
      "SELECT key, label FROM amenities ORDER BY key"
    );
    assert.deepEqual(seed.rows, [
      { key: "beamer", label: "Beamer" },
      { key: "videokonferenz", label: "Videokonferenz" },
      { key: "whiteboard", label: "Whiteboard" },
    ]);
  } finally {
    await db.end();
  }
});

test("Jede Instanz erhält ein frisches Schema; Instanzen beeinflussen sich nicht gegenseitig", async () => {
  const first = new InMemoryDb();
  const second = new InMemoryDb();
  try {
    await first.applyMigrations();

    // Erstinstanz beschreiben (Raum mit gültigem Standort, FK-geprüft).
    const loc = await first.query<{ id: number }>(
      "INSERT INTO locations (name) VALUES ($1) RETURNING id::int AS id",
      [`migrations_frisch_${Date.now()} – Hamburg`]
    );
    const roomId = (
      await first.query<{ id: number }>(
        "INSERT INTO rooms (name, location_id, capacity) VALUES ($1, $2, $3) RETURNING id::int AS id",
        ["Besprechung", loc.rows[0].id, 6]
      )
    ).rows[0].id;
    assert.ok(roomId > 0, "Raum ließ sich in der ersten Instanz nicht anlegen");

    // Zweite Instanz kennt weder Schema noch Daten der ersten.
    const secondTables = await second.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    assert.deepEqual(
      secondTables.rows.map((row) => row.table_name),
      [],
      "Zweite Instanz darf vor applyMigrations keine Tabellen aus der ersten kennen"
    );
    await second.applyMigrations();
    const empty = await second.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM rooms"
    );
    assert.equal(
      empty.rows[0].n,
      0,
      "Daten der ersten Instanz dürfen in der zweiten nicht auftauchen"
    );

    // Und umgekehrt bleibt die erste von der zweiten unberührt.
    const stillThere = await first.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM rooms WHERE id = $1",
      [roomId]
    );
    assert.equal(stillThere.rows[0].n, 1);
  } finally {
    await first.end();
    await second.end();
  }
});

test("Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab", async () => {
  // Wegwerf-Migrationsverzeichnis mit einer Datei, deren Inhalt pg-mem nicht
  // abbilden kann. Die echten Migrationen bleiben unangetastet; auf einer
  // frischen Instanz laufen sie nachweislich sauber (siehe Tests oben).
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "inmemory-migration-"));
  try {
    await writeFile(
      path.join(tmpDir, "999_nicht_unterstuetzt.sql"),
      "-- Wegwerf-Migration für den Fehlerpfad\nCREATE FUNCTION probe_fn() RETURNS trigger AS $\nBEGIN RETURN NEW; END;\n$ LANGUAGE plpgsql;\n"
    );
    const db = new InMemoryDb();
    try {
      await assert.rejects(
        db.applyMigrations(tmpDir),
        (err: unknown) => {
          assert.ok(err instanceof Error, "Fehler ist kein Error");
          assert.match(err.message, /999_nicht_unterstuetzt\.sql/);
          assert.match(err.message, /Ursache:/);
          assert.ok(
            err.message.length > 0 && err.cause instanceof Error,
            "Fehler ohne verständliche Meldung oder ohne Ursache"
          );
          return true;
        }
      );
    } finally {
      await db.end();
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig", async () => {
  const before = await db.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM smoke_locations"
  );

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO smoke_locations (name) VALUES ($1)",
      ["Kiel"]
    );
    // Fachliche Prüfung schlägt fehl (wie z. B. ein nicht existierender
    // Standort in createRoom) – der Client sieht eine verständliche Meldung
    // und die Transaktion wird zurückgerollt.
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  const after = await db.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM smoke_locations"
  );
  assert.equal(
    after.rows[0].count,
    before.rows[0].count,
    "Der verworfene Schreibversuch darf keine Zeile hinterlassen"
  );
});


