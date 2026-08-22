import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool } from "../src/db.js";
import {
  FakeDbSession,
  normalizeSql,
  queriesMatching,
} from "./helpers/fake-pool.js";
import {
  createLocation,
  listLocations,
  ValidationError,
} from "../src/services/locations.js";

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
  // -----------------------------------------------------------------------
  // Containerloser Teil über den Fake-Pool (Test-Naht in src/db.ts).
  //
  // Ohne Postgres laufen die Service-Aufrufe gegen den In-Memory-Fake: Er
  // protokolliert die Statements und liefert die vom Test gesetzten Zeilen.
  // So sind Anlegen und Ablehnung auch in der Sandbox real geprüft – mit
  // echter Assertion auf das Ergebnis, nicht als durchlaufender Platzhalter.
  //
  // Bewusst Service-Ebene statt supertest gegen den Fake: Die Route serialisiert
  // hier nur JSON; was geprügt werden soll, ist die Fachlogik in services/locations
  // und ihr SQL – genau das, was der Fake sichtbar macht.
  // -----------------------------------------------------------------------

  function beginFakeSession(): FakeDbSession {
    const session = new FakeDbSession();
    session.begin();
    return session;
  }

  test("Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar", async () => {
    const session = beginFakeSession();
    const fake = session.fake;
    const insertedName = `locations_fake_${Date.now()} – München`;

    try {
      // Der Fake beantwortet INSERT und anschließende Liste so, wie es
      // Postgres für diese Statements täte (Zeilenform wie RETURNING/SELECT).
      let insertSeen = false;
      fake.respondWith((record) => {
        if (/INSERT INTO locations/i.test(normalizeSql(record.sql))) {
          insertSeen = true;
          assert.deepEqual(
            record.values,
            [insertedName],
            "Der Name muss unverändert (getrimmt) als Parameter übergeben werden"
          );
          return { rows: [{ id: 501, name: insertedName }] };
        }
        if (/^SELECT id::int AS id, name FROM locations/i.test(normalizeSql(record.sql))) {
          return { rows: [{ id: 42, name: "Bestand" }, { id: 501, name: insertedName }] };
        }
        throw new Error(`Unerwartete Abfrage im Test: ${record.sql}`);
      });

      const created = await createLocation(insertedName);

      assert.ok(insertSeen, "Es wurde kein INSERT INTO locations ausgeführt");
      assert.equal(created.id, 501);
      assert.equal(created.name, insertedName);

      // „Anschließend abrufbar": dieselbe Session, dieselbe Quelle wie die Route.
      const list = await listLocations();
      const match = list.find((location) => location.id === created.id);
      assert.ok(match, "angelegter Standort fehlt in der Standortliste");
      assert.equal(match.name, insertedName);

      // Genau ein INSERT und genau eine Listenabfrage – kein versteckter
      // zweiter Schreibzugriff.
      assert.equal(queriesMatching(fake, /INSERT INTO locations/i).length, 1);
      assert.equal(
        queriesMatching(fake, /FROM locations(?!.*INSERT)/i).length,
        1,
        "Die Standortliste soll genau einmal je Abruf abgefragt werden"
      );
    } finally {
      session.end();
    }
  });

  test("Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird", async () => {
    const session = beginFakeSession();
    const fake = session.fake;

    try {
      for (const invalid of ["", "   ", undefined, null, 42]) {
        await assert.rejects(
          createLocation(invalid),
          (err: unknown) => {
            assert.ok(
              err instanceof ValidationError,
              `Fehlender Name ${JSON.stringify(invalid)} war kein ValidationError`
            );
            assert.ok(
              typeof (err as Error).message === "string" &&
                (err as Error).message.length > 0,
              "Die Ablehnung enthält keine verständliche Fehlermeldung"
            );
            return true;
          },
          `Fehlender Name ${JSON.stringify(invalid)} wurde nicht abgelehnt`
        );
      }

      // Kein einziger Schreibzugriff darf bei ungültigem Namen passiert sein.
      assert.deepEqual(
        queriesMatching(fake, /INSERT INTO locations/i),
        [],
        "Bei fehlendem Namen darf kein INSERT abgesetzt werden"
      );
    } finally {
      session.end();
    }
  });
}
