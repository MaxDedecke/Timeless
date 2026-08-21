import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool } from "../src/db.js";

const testRun = `rooms_test_${Date.now()}`;

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
// Teil 1: API-Tests gegen die App (laufen auch ohne Datenbank).
//
// Die Pflichtfeld-Validierung greift, BEVOR die Datenbank berührt wird –
// deshalb sind diese Fälle auch in der Sandbox (ohne Postgres) prüfbar.
// ---------------------------------------------------------------------------

test("PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt", async () => {
  const cases = [
    undefined,
    {},
    { name: "" },
    { name: "   ", locationId: 1, capacity: 4 },
    { name: "Raum", locationId: 1 },
    { name: "Raum", locationId: 1, capacity: 0 },
    { name: "Raum", locationId: 1, capacity: 2.5 },
    { name: "Raum", locationId: 1, capacity: "viel" },
    { name: "Raum", capacity: 4 },
    { name: "Raum", locationId: "Hamburg", capacity: 4 },
  ];
  for (const body of cases) {
    const res = await request(app).put("/api/rooms/1").send(body);
    assert.equal(res.status, 400, `Status für ${JSON.stringify(body)} war nicht 400`);
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Antwort enthält keine verständliche Fehlermeldung"
    );
  }
});

test("PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt", async () => {
  const cases = [{ name: "" }, { capacity: null }, { locationId: null }];
  for (const body of cases) {
    const res = await request(app).patch("/api/rooms/1").send(body);
    assert.equal(res.status, 400, `Status für ${JSON.stringify(body)} war nicht 400`);
    assert.ok(res.body.error.length > 0);
  }
});

test("PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)", async () => {
  // Ohne Felder gibt es nichts zu validieren – der Fall läuft in den
  // Datenbankteil und wird dort nur ausgeführt, wenn eine DB erreichbar ist;
  // hier geht es nur darum, dass die Route die Anfrage grundsätzlich annimmt.
  // Ohne DB schlägt der Aufruf mit einem Verbindungsfehler (500) fehl – das
  // ist dann erwartbar und kein Validierungsproblem.
  const res = await request(app).patch("/api/rooms/1").send({});
  assert.ok([200, 500].includes(res.status));
});

test("GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff", async () => {
  const res = await request(app).get("/api/rooms/kein-id");
  assert.equal(res.status, 404);
  assert.ok(typeof res.body.error === "string" && res.body.error.length > 0);
});

test("POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt", async () => {
  const cases = [
    undefined,
    {},
    { name: "" },
    { name: "   " },
    { name: "Raum 1" }, // Standort fehlt
    { name: "Raum 1", locationId: 1 }, // Kapazität fehlt
    { name: "Raum 1", capacity: 4 }, // Standort fehlt
    { locationId: 1, capacity: 4 }, // Name fehlt
    { name: "Raum 1", locationId: null, capacity: 4 },
    { name: "Raum 1", locationId: "Hamburg", capacity: 4 },
    { name: "Raum 1", locationId: 1, capacity: 0 },
    { name: "Raum 1", locationId: 1, capacity: -2 },
    { name: "Raum 1", locationId: 1, capacity: 2.5 },
    { name: "Raum 1", locationId: 1, capacity: "viel" },
  ];
  for (const body of cases) {
    const res = await request(app).post("/api/rooms").send(body);
    assert.equal(
      res.status,
      400,
      `Status für ${JSON.stringify(body)} war nicht 400`
    );
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Antwort enthält keine verständliche Fehlermeldung"
    );
  }
});

// ---------------------------------------------------------------------------
// Teil 2: API-Integration – läuft nur, wenn eine Postgres erreichbar ist
// (in der Sandbox normalerweise nicht; im Compose-Stack dagegen schon).
//
// Bestehende PUT/PATCH-Tests legen Räume direkt per SQL an, um unabhängig vom
// Anlegen zu bleiben; die POST-Tests unten nutzen die API selbst.
// ---------------------------------------------------------------------------

const canReachDb = await pool
  .query("SELECT 1")
  .then(() => true)
  .catch(() => false);

async function createTestRoom(
  name: string,
  locationId: number,
  capacity: number
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO rooms (name, location_id, capacity) VALUES ($1, $2, $3) RETURNING id::int AS id",
    [name, locationId, capacity]
  );
  return rows[0].id;
}

if (canReachDb) {
  // Eigene Standorte, damit der Test nicht an fremden Daten hängt.
  const baseLocation = await request(app)
    .post("/api/locations")
    .send({ name: `${testRun} – Basisstandort` });
  const otherLocation = await request(app)
    .post("/api/locations")
    .send({ name: `${testRun} – Anderer Standort` });
  assert.equal(baseLocation.status, 201);
  assert.equal(otherLocation.status, 201);
  const baseLocationId: number = baseLocation.body.id;
  const otherLocationId: number = otherLocation.body.id;

  test("POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort", async () => {
    const created = await request(app).post("/api/rooms").send({
      name: `${testRun} – Besprechung`,
      locationId: baseLocationId,
      capacity: 12,
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.name, `${testRun} – Besprechung`);
    assert.equal(created.body.locationId, baseLocationId);
    assert.equal(created.body.capacity, 12);
    assert.deepEqual(created.body.location, {
      id: baseLocationId,
      name: `${testRun} – Basisstandort`,
    });

    const list = await request(app).get("/api/rooms");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body));
    const listed = list.body.find(
      (room: { id: number }) => room.id === created.body.id
    );
    assert.ok(listed, "angelegter Raum fehlt in GET /api/rooms");
    assert.equal(listed.name, `${testRun} – Besprechung`);
    assert.equal(listed.capacity, 12);
    assert.deepEqual(listed.location, {
      id: baseLocationId,
      name: `${testRun} – Basisstandort`,
    });
  });

  test("POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt", async () => {
    const res = await request(app).post("/api/rooms").send({
      name: `${testRun} – ohne Standort`,
      locationId: 99999999,
      capacity: 4,
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Standort/i);

    // Es wurde kein Raum angelegt.
    const list = await request(app).get("/api/rooms");
    assert.ok(
      !list.body.some(
        (room: { name: string }) => room.name === `${testRun} – ohne Standort`
      )
    );
  });

  test("PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar", async () => {
    const roomId = await createTestRoom(
      `${testRun} – alter Name`,
      baseLocationId,
      6
    );

    const updated = await request(app)
      .put(`/api/rooms/${roomId}`)
      .send({
        name: `${testRun} – neuer Name`,
        locationId: otherLocationId,
        capacity: 14,
      });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.name, `${testRun} – neuer Name`);
    assert.equal(updated.body.locationId, otherLocationId);
    assert.equal(updated.body.capacity, 14);

    const readBack = await request(app).get(`/api/rooms/${roomId}`);
    assert.equal(readBack.status, 200);
    assert.equal(readBack.body.name, `${testRun} – neuer Name`);
    assert.equal(readBack.body.locationId, otherLocationId);
    assert.equal(readBack.body.capacity, 14);
  });

  test("PATCH ändert nur die übergebenen Felder", async () => {
    const roomId = await createTestRoom(
      `${testRun} – patch`,
      baseLocationId,
      8
    );

    const updated = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({ capacity: 20 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.capacity, 20);
    assert.equal(updated.body.name, `${testRun} – patch`);
    assert.equal(updated.body.locationId, baseLocationId);

    const readBack = await request(app).get(`/api/rooms/${roomId}`);
    assert.equal(readBack.body.locationId, baseLocationId);
    assert.equal(readBack.body.name, `${testRun} – patch`);
  });

  test("PATCH mit leerem Körper lässt den Raum unverändert", async () => {
    const roomId = await createTestRoom(
      `${testRun} – leer`,
      baseLocationId,
      5
    );

    const updated = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({});
    assert.equal(updated.status, 200);
    assert.equal(updated.body.name, `${testRun} – leer`);
    assert.equal(updated.body.capacity, 5);
  });

  test("Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt", async () => {
    const roomId = await createTestRoom(
      `${testRun} – standortfehler`,
      baseLocationId,
      3
    );

    const updated = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .send({ locationId: 99999999 });
    assert.equal(updated.status, 400);
    assert.match(updated.body.error, /Standort/i);

    // Der Raum bleibt unverändert.
    const readBack = await request(app).get(`/api/rooms/${roomId}`);
    assert.equal(readBack.body.locationId, baseLocationId);
  });

  test("PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung", async () => {
    for (const verb of ["put", "patch"] as const) {
      const body =
        verb === "put"
          ? { name: `${testRun} – egal`, locationId: baseLocationId, capacity: 2 }
          : { capacity: 2 };
      const res = await request(app)[verb]("/api/rooms/99999999").send(body);
      assert.equal(res.status, 404, `${verb} auf unbekannte ID war nicht 404`);
      assert.ok(
        typeof res.body.error === "string" && res.body.error.length > 0,
        "Antwort enthält keine verständliche Fehlermeldung"
      );
    }
  });
} else {
  test("API-Integrationsteil übersprungen (keine Postgres erreichbar)", () => {
    assert.ok(true);
  });
}
