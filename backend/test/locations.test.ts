import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool } from "../src/db.js";

after(async () => {
  await pool.end();
});

// ---------------------------------------------------------------------------
// Teil 1: API-Tests gegen die App (läuft auch ohne Datenbank).
//
// Die Sandbox hat keine Postgres, deshalb schlagen hier nur die Endpunkte
// fehl, die wirklich an die Datenbank gehen. Diese Tests prüfen trotzdem
// schon das Routing und die Validierung: Ein Name-Verstoß muss mit 400 und
// verständlicher Fehlermeldung abgelehnt werden, BEVOR die Datenbank
// berührt wird.
// ---------------------------------------------------------------------------

test("POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt", async () => {
  for (const body of [undefined, {}, { name: "" }, { name: "   " }, { name: 42 }]) {
    const res = await request(app).post("/api/locations").send(body);
    assert.equal(res.status, 400, `Status für ${JSON.stringify(body)} war nicht 400`);
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Antwort enthält keine verständliche Fehlermeldung"
    );
  }
});

test("PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt", async () => {
  const res = await request(app).put("/api/locations/1").send({ name: "  " });
  assert.equal(res.status, 400);
});

test("PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt", async () => {
  const res = await request(app).patch("/api/locations/1").send({});
  assert.equal(res.status, 400);
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
  // Eigene Standorte, damit der Test nicht an fremden Daten hängt.
  const testRun = `locations_test_${Date.now()}`;

  test("POST legt einen Standort an und GET /api/locations listet ihn", async () => {
    const created = await request(app)
      .post("/api/locations")
      .send({ name: `${testRun} – München` });
    assert.equal(created.status, 201);
    assert.equal(created.body.name, `${testRun} – München`);
    assert.ok(Number.isInteger(created.body.id));

    const list = await request(app).get("/api/locations");
    assert.equal(list.status, 200);
    const match = list.body.find(
      (l: { id: number }) => l.id === created.body.id
    );
    assert.ok(match, "angelegter Standort fehlt in der Liste");
    assert.equal(match.name, `${testRun} – München`);
  });

  test("PUT ändert den Namen eines bestehenden Standorts", async () => {
    const created = await request(app)
      .post("/api/locations")
      .send({ name: `${testRun} – alt` });
    assert.equal(created.status, 201);

    const updated = await request(app)
      .put(`/api/locations/${created.body.id}`)
      .send({ name: `${testRun} – neu` });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.name, `${testRun} – neu`);

    const list = await request(app).get("/api/locations");
    const match = list.body.find((l: { id: number }) => l.id === created.body.id);
    assert.ok(match, "Standort nach Änderung verschwunden");
    assert.equal(match.name, `${testRun} – neu`);
  });

  test("PATCH ändert den Namen eines bestehenden Standorts ebenfalls", async () => {
    const created = await request(app)
      .post("/api/locations")
      .send({ name: `${testRun} – patch alt` });
    assert.equal(created.status, 201);

    const updated = await request(app)
      .patch(`/api/locations/${created.body.id}`)
      .send({ name: `${testRun} – patch neu` });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.name, `${testRun} – patch neu`);
  });

  test("PUT/PATCH auf unbekannte Standort-ID liefert 404 mit Fehlermeldung", async () => {
    for (const verb of ["put", "patch"] as const) {
      const res = await request(app)[verb]("/api/locations/99999999").send({
        name: `${testRun} – egal`,
      });
      assert.equal(res.status, 404, `${verb} auf unbekannte ID war nicht 404`);
      assert.ok(res.body.error.length > 0);
    }
  });
} else {
  test("API-Integrationsteil übersprungen (keine Postgres erreichbar)", () => {
    assert.ok(true);
  });
}
