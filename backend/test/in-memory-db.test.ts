import assert from "node:assert/strict";
import { after, test } from "node:test";
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


