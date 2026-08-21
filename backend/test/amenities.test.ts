import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool } from "../src/db.js";

const testRun = `amenities_test_${Date.now()}`;

after(async () => {
  // Eigene Testdaten aufräumen und Pool schließen, damit der Lauf sauber endet.
  if (canReachDb) {
    await pool.query("DELETE FROM rooms WHERE name LIKE $1", [`${testRun}%`]);
    await pool.query("DELETE FROM locations WHERE name LIKE $1", [
      `${testRun}%`,
    ]);
  }
  await pool.end();
});

// ---------------------------------------------------------------------------
// Teil 1: Validierung ohne Datenbank.
//
// parseAmenityKeys läuft VOR jedem Datenbankzugriff – falsch geformte
// Merkmals-Angaben werden deshalb auch in der Sandbox (ohne Postgres)
// mit 400 abgelehnt.
// ---------------------------------------------------------------------------

test("POST /api/rooms mit nicht als Liste übergebenen Merkmalen wird mit 400 abgelehnt", async () => {
  const cases = [
    { name: `${testRun} – x`, locationId: 1, capacity: 4, amenities: "beamer" },
    { name: `${testRun} – x`, locationId: 1, capacity: 4, amenities: null },
    { name: `${testRun} – x`, locationId: 1, capacity: 4, amenities: 42 },
    { name: `${testRun} – x`, locationId: 1, capacity: 4, amenities: [7] },
    { name: `${testRun} – x`, locationId: 1, capacity: 4, amenities: [""] },
    { name: `${testRun} – x`, locationId: 1, capacity: 4, amenities: ["  "] },
  ];
  for (const body of cases) {
    const res = await request(app).post("/api/rooms").send(body);
    assert.equal(
      res.status,
      400,
      `Status für ${JSON.stringify(body.amenities)} war nicht 400`
    );
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Antwort enthält keine verständliche Fehlermeldung"
    );
  }
});

test("PUT/PATCH /api/rooms/:id mit nicht als Liste übergebenen Merkmalen wird mit 400 abgelehnt", async () => {
  const putRes = await request(app).put("/api/rooms/1").send({
    name: `${testRun} – x`,
    locationId: 1,
    capacity: 4,
    amenities: "beamer",
  });
  assert.equal(putRes.status, 400);
  assert.ok(putRes.body.error.length > 0);

  const patchRes = await request(app)
    .patch("/api/rooms/1")
    .send({ amenities: { key: "beamer" } });
  assert.equal(patchRes.status, 400);
  assert.ok(patchRes.body.error.length > 0);
});

// ---------------------------------------------------------------------------
// Teil 2: API-Integration – läuft nur, wenn eine Postgres erreichbar ist
// (in der Sandbox normalerweise nicht; im Compose-Stack dagegen schon).
// ---------------------------------------------------------------------------

const canReachDb = await pool
  .query("SELECT 1")
  .then(() => true)
  .catch(() => false);

if (canReachDb) {
  const location = await request(app)
    .post("/api/locations")
    .send({ name: `${testRun} – Standort` });
  assert.equal(location.status, 201);
  const locationId: number = location.body.id;

  // Zuordnungen direkt per SQL prüfen, damit die Tests die Persistenzschicht
  // unabhängig von der Leselogik verifizieren.
  async function amenityKeysOf(roomId: number): Promise<string[]> {
    const { rows } = await pool.query<{ key: string }>(
      `SELECT a.key AS key FROM room_amenities ra
       JOIN amenities a ON a.id = ra.amenity_id
       WHERE ra.room_id = $1 ORDER BY a.key`,
      [roomId]
    );
    return rows.map((row) => row.key);
  }

  test("POST /api/rooms ordnet Merkmale zu; GET /api/rooms liefert sie je Raum mit", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – Ausstattung`,
      locationId,
      capacity: 10,
      amenities: ["beamer", "whiteboard"],
    });
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.amenities, [
      { key: "beamer", label: "Beamer" },
      { key: "whiteboard", label: "Whiteboard" },
    ]);

    // Persistenz unabhängig von der Leselogik prüfen.
    assert.deepEqual(await amenityKeysOf(created.body.id), [
      "beamer",
      "whiteboard",
    ]);

    const list = await request(app).get("/api/rooms");
    assert.equal(list.status, 200);
    const listed = list.body.find(
      (room: { id: number }) => room.id === created.body.id
    );
    assert.ok(listed, "angelegter Raum fehlt in GET /api/rooms");
    assert.deepEqual(listed.amenities, [
      { key: "beamer", label: "Beamer" },
      { key: "whiteboard", label: "Whiteboard" },
    ]);
  });

  test("POST /api/rooms ohne amenities liefert eine leere Merkmalsliste", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – ohne Merkmale`,
      locationId,
      capacity: 4,
    });
    assert.equal(created.status, 201);
    assert.deepEqual(created.body.amenities, []);
  });

  test("POST /api/rooms mit unbekanntem Merkmal wird mit 400 abgelehnt und ordnet nichts zu", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – unbekanntes Merkmal`,
      locationId,
      capacity: 6,
      amenities: ["beamer", "3d-drucker"],
    });
    assert.equal(created.status, 400);
    assert.match(created.body.error, /3d-drucker/);

    // Der Raum wurde durch den fehlgeschlagenen Validierungslauf nicht angelegt.
    const list = await request(app).get("/api/rooms");
    assert.ok(
      !list.body.some(
        (room: { name: string }) =>
          room.name === `${testRun} – unbekanntes Merkmal`
      )
    );
  });

  test("PUT ersetzt die komplette Merkmalszuordnung", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – put`,
      locationId,
      capacity: 8,
      amenities: ["beamer", "videokonferenz", "whiteboard"],
    });
    assert.equal(created.status, 201);
    const roomId: number = created.body.id;

    const updated = await request(app).put(`/api/rooms/${roomId}`).send({
      name: `${testRun} – put`,
      locationId,
      capacity: 8,
      amenities: ["videokonferenz"],
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body.amenities, [
      { key: "videokonferenz", label: "Videokonferenz" },
    ]);
    assert.deepEqual(await amenityKeysOf(roomId), ["videokonferenz"]);
  });

  test("PATCH ändert nur die Merkmale, wenn nur sie übergeben werden", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – patch`,
      locationId,
      capacity: 5,
      amenities: ["beamer"],
    });
    assert.equal(created.status, 201);
    const roomId: number = created.body.id;

    const updated = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({ amenities: ["beamer", "whiteboard"] });
    assert.equal(updated.status, 200);
    // Felder, die nicht im Patch stehen, bleiben unverändert.
    assert.equal(updated.body.name, `${testRun} – patch`);
    assert.equal(updated.body.capacity, 5);
    assert.deepEqual(updated.body.amenities, [
      { key: "beamer", label: "Beamer" },
      { key: "whiteboard", label: "Whiteboard" },
    ]);
    assert.deepEqual(await amenityKeysOf(roomId), [
      "beamer",
      "whiteboard",
    ]);
  });

  test("Ein zugeordnetes Merkmal lässt sich per API wieder entfernen", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – entfernen`,
      locationId,
      capacity: 12,
      amenities: ["beamer", "videokonferenz"],
    });
    assert.equal(created.status, 201);
    const roomId: number = created.body.id;

    // Nur ein Merkmal entfernen: Restmenge per PUT/PATCH neu setzen.
    const removedOne = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({ amenities: ["videokonferenz"] });
    assert.equal(removedOne.status, 200);
    assert.deepEqual(removedOne.body.amenities, [
      { key: "videokonferenz", label: "Videokonferenz" },
    ]);
    assert.deepEqual(await amenityKeysOf(roomId), ["videokonferenz"]);

    // Komplett entfernen: leere Liste räumt die Zuordnung ganz ab.
    const removedAll = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({ amenities: [] });
    assert.equal(removedAll.status, 200);
    assert.deepEqual(removedAll.body.amenities, []);
    assert.deepEqual(await amenityKeysOf(roomId), []);

    // GET zeigt den geräumten Zustand ebenfalls ohne Merkmale.
    const readBack = await request(app).get(`/api/rooms/${roomId}`);
    assert.equal(readBack.status, 200);
    assert.deepEqual(readBack.body.amenities, []);
  });

  test("PATCH ohne amenities-Feld lässt die bestehende Zuordnung unverändert", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – unangetastet`,
      locationId,
      capacity: 7,
      amenities: ["whiteboard"],
    });
    assert.equal(created.status, 201);
    const roomId: number = created.body.id;

    const updated = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({ capacity: 9 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.capacity, 9);
    assert.deepEqual(updated.body.amenities, [
      { key: "whiteboard", label: "Whiteboard" },
    ]);
    assert.deepEqual(await amenityKeysOf(roomId), ["whiteboard"]);
  });

  test("PATCH mit unbekanntem Merkmal wird mit 400 abgelehnt und ändert nichts", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – rollback`,
      locationId,
      capacity: 3,
      amenities: ["beamer"],
    });
    assert.equal(created.status, 201);
    const roomId: number = created.body.id;

    const rejected = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({ amenities: ["beamer", "kaffeemaschine"] });
    assert.equal(rejected.status, 400);
    assert.match(rejected.body.error, /kaffeemaschine/);

    // Die alte Zuordnung bleibt vollständig bestehen (Transaktion).
    assert.deepEqual(await amenityKeysOf(roomId), ["beamer"]);
  });

  test("Merkmals-Änderung auf unbekannter Raum-ID liefert 404", async () => {
    const res = await request(app)
      .patch("/api/rooms/99999999")
      .send({ amenities: ["beamer"] });
    assert.equal(res.status, 404);
    assert.ok(typeof res.body.error === "string" && res.body.error.length > 0);
  });
} else {
  test("API-Integrationsteil übersprungen (keine Postgres erreichbar)", () => {
    assert.ok(true);
  });
}
