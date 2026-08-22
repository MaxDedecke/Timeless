import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool } from "../src/db.js";
import {
  createRoom,
  getRoom,
  listRooms,
  updateRoom,
} from "../src/services/rooms.js";
import { ValidationError } from "../src/services/errors.js";
import {
  FakeDbSession,
  FakePool,
  normalizeSql,
  queriesMatching,
} from "./helpers/fake-pool.js";

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
  // Ohne Felder gibt es nichts zu validieren – hier geht es nur darum, dass
  // die Route die Anfrage grundsätzlich annimmt und keinen Pflichtfeld-Verstoß
  // meldet. Je nach Umfeld existiert der Raum mit ID 1 (200), existiert er
  // nicht (404 – DB erreichbar, Tabelle leer) oder ist die DB unerreichbar
  // (500) – beides kein Validierungsproblem. Nur im 404-Fall kommt eine
  // verständliche JSON-Fehlermeldung aus unserem Router zurück.
  const res = await request(app).patch("/api/rooms/1").send({});
  assert.ok(
    [200, 404, 500].includes(res.status),
    `Unerwarteter Status ${res.status} für leeres PATCH`
  );
  if (res.status === 404) {
    assert.ok(
      typeof res.body?.error === "string" && res.body.error.length > 0,
      "404 ohne verständliche Fehlermeldung"
    );
  }
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

// ---------------------------------------------------------------------------
// Teil 1b: Containerlose Service-Tests über den Fake-Pool (Test-Naht in
// src/db.ts). Sie prüfen die Leselogik der Raumliste ohne Postgres:
// GET /api/rooms bzw. listRooms() muss je Raum die zugeordneten Merkmale
// mitliefern – Räume ohne Zuordnung als leeres Array, nicht null und
// nicht mit Fehler (Akzeptanzkriterien dieses Tickets).
//
// Bewusst Service-Ebene statt supertest: Der Fake beantwortet Abfragen nur
// protokollierend; die Route fügt hier keine Logik hinzu, und ein Fake auf
// HTTP-Ebene müsste JSON-Serialisierung nachbauen, um nichts zu prüfen.
// ---------------------------------------------------------------------------

// Eigene Fake-Pool-Sitzung je Test (begin/end im finally): So bleibt die Naht
// nur für den jeweiligen Service-Test aktiv und die DB-Integrationstests
// derselben Datei treffen im Compose-Stack weiterhin die echte Postgres.
function beginFakeSession(): FakeDbSession {
  const session = new FakeDbSession();
  session.begin();
  return session;
}

// Transaktions-SQL läuft über den Client aus pool.connect() und landet damit
// laut Protokoll-Dokumentation in fake-pool.ts nur im Protokoll DIESES Clients,
// nicht in pool.queries. Zählungen über Schreibzugriffe müssen Pool und
// Clients deshalb gemeinsam betrachten.
function recordedSql(fake: FakePool): string[] {
  return [
    ...fake.queries.map((record) => normalizeSql(record.sql)),
    ...fake.clients.flatMap((client) =>
      client.queries.map((record) => normalizeSql(record.sql))
    ),
  ];
}

function countRecorded(fake: FakePool, pattern: RegExp): number {
  return recordedSql(fake).filter((sql) => pattern.test(sql)).length;
}

test("listRooms liefert je Raum die zugeordneten Merkmale mit", async () => {
  const session = beginFakeSession();
  const fake = session.fake;
  const amenityRow = { key: "beamer", label: "Beamer" };
  // Ein Raum mit Zuordnung, einer ohne: Der Responder gibt pro Raum-ID zurück,
  // was die korrelierte Merkmals-Subquery in Postgres liefern würde.
  const amenitiesByRoom = new Map<number, Array<Record<string, unknown>>>([
    [101, [amenityRow]],
    [102, []],
  ]);
  fake.respondWith((record) => {
    assert.match(
      normalizeSql(record.sql),
      /FROM rooms JOIN locations/i,
      "Raumliste fragt nicht den erwarteten Select ab"
    );
    assert.ok(
      normalizeSql(record.sql).includes("COALESCE"),
      "Raumliste sichert fehlende Zuordnungen nicht per COALESCE ab"
    );
    return {
      rows: [
        {
          id: 101,
          name: "Besprechung klein",
          locationId: 11,
          capacity: 6,
          amenities: amenitiesByRoom.get(101),
          location: { id: 11, name: "Hamburg" },
        },
        {
          id: 102,
          name: "Besprechung groß",
          locationId: 11,
          capacity: 20,
          amenities: amenitiesByRoom.get(102),
          location: { id: 11, name: "Hamburg" },
        },
      ],
    };
  });

  try {
    const rooms = await listRooms();

    assert.equal(rooms.length, 2);
    const withAmenity = rooms.find((room) => room.id === 101);
    assert.ok(withAmenity, "Raum 101 fehlt in der Liste");
    assert.deepEqual(withAmenity.amenities, [
      { key: "beamer", label: "Beamer" },
    ]);

    const withoutAmenities = rooms.find((room) => room.id === 102);
    assert.ok(withoutAmenities, "Raum 102 fehlt in der Liste");
    assert.deepEqual(
      withoutAmenities.amenities,
      [],
      "Raum ohne Merkmale muss ein leeres Array liefern"
    );
    assert.equal(Array.isArray(withoutAmenities.amenities), true);
  } finally {
    session.end();
  }
});

test("listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu", async () => {
  const session = beginFakeSession();
  const fake = session.fake;
  fake.respondWith(() => ({
    rows: [
      {
        id: 201,
        name: `Solo ${Date.now()}`,
        locationId: 12,
        capacity: 4,
        amenities: [],
        location: { id: 12, name: "Berlin" },
      },
    ],
  }));

  try {
    const rooms = await listRooms();
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].id, 201);
    assert.deepEqual(rooms[0].amenities, []);

    const listQueries = queriesMatching(fake, /FROM rooms JOIN locations/i);
    assert.equal(listQueries.length, 1);
  } finally {
    session.end();
  }
});

// ---------------------------------------------------------------------------
// Teil 1c: Containerlose Service-Tests für Anlegen und Ändern (dieses Ticket).
//
// Gleiche Naht wie in locations.test.ts: Der Fake protokolliert die Statements
// der Transaktion und beantwortet sie so, wie es Postgres täte. Geprüft wird
// die Fachlogik von services/rooms – Anlegen inkl. GET-Nachweis, drei
// Pflichtfeld-Ablehnungen und Änderung von Standort/Kapazität.
// ---------------------------------------------------------------------------

/** Zeile des ROOM_WITH_LOCATION_SELECT für einen Raum (Form wie in Postgres). */
function roomRow(
  id: number,
  name: string,
  locationId: number,
  capacity: number,
  locationName: string
): Record<string, unknown> {
  return {
    id,
    name,
    locationId,
    capacity,
    amenities: [],
    location: { id: locationId, name: locationName },
  };
}

/**
 * Responder, der die Transaktion von createRoom nachstellt:
 * Standort-Existenzcheck -> INSERT -> Rücklesen über den Standort-Join.
 */
function respondToCreate(
  fake: FakePool,
  expected: { name: string; locationId: number; capacity: number; locationName: string }
): void {
  fake.respondWith((record) => {
    const sql = normalizeSql(record.sql);
    // Transaktionsrahmen von createRoom – wird nur protokolliert.
    if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(sql)) return { rows: [] };
    if (/^SELECT 1 FROM locations WHERE id = \$1$/i.test(sql)) {
      assert.deepEqual(
        record.values,
        [expected.locationId],
        "Der Standort-Check muss mit der gelieferten Standort-ID laufen"
      );
      return { rows: [{ id: expected.locationId }], rowCount: 1 };
    }
    if (/^INSERT INTO rooms/i.test(sql)) {
      assert.deepEqual(
        record.values,
        [expected.name, expected.locationId, expected.capacity],
        "INSERT muss Name, Standort und Kapazität als Parameter übernehmen"
      );
      return { rows: [{ id: 777 }], rowCount: 1 };
    }
    if (/FROM rooms JOIN locations/i.test(sql)) {
      return {
        rows: [
          roomRow(777, expected.name, expected.locationId, expected.capacity, expected.locationName),
        ],
      };
    }
    throw new Error(`Unerwartete Abfrage in respondToCreate: ${record.sql}`);
  });
}

test("Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar", async () => {
  const session = beginFakeSession();
  const fake = session.fake;
  const name = `rooms_fake_${Date.now()} – Besprechung`;

  try {
    respondToCreate(fake, {
      name,
      locationId: 11,
      capacity: 12,
      locationName: "Hamburg",
    });

    const created = await createRoom(name, 11, 12);

    // Genau ein INSERT – kein versteckter zweiter Schreibzugriff. Das INSERT
    // läuft innerhalb der Transaktion über den Client und ist deshalb im
    // Client-Protokoll (siehe recordedSql), nicht in pool.queries.
    assert.equal(countRecorded(fake, /INSERT INTO rooms/i), 1);
    assert.equal(created.id, 777);
    assert.equal(created.name, name);
    assert.equal(created.locationId, 11);
    assert.equal(created.capacity, 12);
    assert.deepEqual(created.location, { id: 11, name: "Hamburg" });

    // GET-Nachweis: derselbe Raum ist einzeln abrufbar und trägt alle drei
    // Pflichtfelder (Akzeptanzkriterium „erscheint danach in der Raumliste“,
    // hier auf der Service-Ebene als Detailabruf).
    const readBack = await getRoom(created.id);
    assert.equal(readBack.id, created.id);
    assert.equal(readBack.name, name);
    assert.equal(readBack.locationId, 11);
    assert.equal(readBack.capacity, 12);
    assert.equal(readBack.location.name, "Hamburg");
  } finally {
    session.end();
  }
});

for (const missing of [
  { label: "fehlendem Namen", rawName: "", rawLocationId: 11, rawCapacity: 12 },
  { label: "fehlendem Standort", rawName: "Raum", rawLocationId: null, rawCapacity: 12 },
  { label: "fehlender Kapazität", rawName: "Raum", rawLocationId: 11, rawCapacity: null },
]) {
  test(`Raum anlegen mit ${missing.label} wird abgelehnt, bevor die Datenbank berührt wird`, async () => {
    const session = beginFakeSession();
    const fake = session.fake;

    try {
      await assert.rejects(
        createRoom(missing.rawName, missing.rawLocationId, missing.rawCapacity),
        (err: unknown) => {
          assert.ok(
            err instanceof ValidationError,
            `${missing.label} führte nicht zu einem ValidationError`
          );
          assert.ok(
            typeof (err as Error).message === "string" &&
              (err as Error).message.length > 0,
            "Die Ablehnung enthält keine verständliche Fehlermeldung"
          );
          return true;
        },
        `${missing.label} wurde nicht abgelehnt`
      );

      // Weder Standort-Check noch INSERT dürfen bei ungültigen Pflichtfeldern
      // passiert sein – kein Persistieren eines halben Raums.
      assert.deepEqual(
        queriesMatching(fake, /INSERT INTO rooms/i),
        [],
        "Bei fehlendem Pflichtfeld darf kein INSERT abgesetzt werden"
      );
      assert.deepEqual(
        queriesMatching(fake, /SELECT 1 FROM locations/i),
        [],
        "Bei fehlendem Pflichtfeld darf noch nicht einmal der Standort geprüft werden"
      );
      // Und auch auf Client-Ebene (Transaktions-Protokoll) darf nichts
      // abgesetzt worden sein – siehe recordedSql oben.
      assert.deepEqual(
        recordedSql(fake).filter((sql) => /^(BEGIN|COMMIT|ROLLBACK)$/.test(sql) === false),
        [],
        "Bei fehlendem Pflichtfeld darf noch keine Transaktion Statements absetzen"
      );
    } finally {
      session.end();
    }
  });
}

test("Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar", async () => {
  const session = beginFakeSession();
  const fake = session.fake;
  const newName = "Besprechung (neuer Standort)";

  try {
    fake.respondWith((record) => {
      const sql = normalizeSql(record.sql);
      if (/^BEGIN$/i.test(sql)) return { rows: [] };
      if (/^SELECT 1 FROM rooms WHERE id = \$1$/i.test(sql)) {
        assert.deepEqual(record.values, [777], "Änderung läuft gegen die falsche Raum-ID");
        return { rows: [{ id: 777 }], rowCount: 1 };
      }
      if (/^SELECT 1 FROM locations WHERE id = \$1$/i.test(sql)) {
        assert.deepEqual(
          record.values,
          [12],
          "Der neue Standort muss fachlich geprüft werden"
        );
        return { rows: [{ id: 12 }], rowCount: 1 };
      }
      if (/^UPDATE rooms SET/i.test(sql)) {
        // Platzhalter zählen statt Positionen zu raten: Ein PATCH ohne
        // Namensfeld vergibt $1/$2 an Standort/Kapazität; die ID kommt als
        // letzter gebundener Platzhalter – egal, wie viele Felder gesetzt
        // sind. Genau diese Assertion hätte den fehlenden $ vor dem
        // ID-Platzhalter im Service aufgedeckt (WHERE id = 3 statt $3).
        const placeholders = sql.match(/\$\d+/g) ?? [];
        assert.equal(
          placeholders.length,
          record.values.length,
          "Jeder gebundene Wert braucht genau einen Platzhalter im SQL-Text"
        );
        assert.match(
          sql,
          /location_id = \$1/i,
          "Der Standort muss als erster Parameter im UPDATE gesetzt werden"
        );
        assert.match(
          sql,
          /capacity = \$2/i,
          "Die Kapazität muss als zweiter Parameter im UPDATE gesetzt werden"
        );
        assert.match(
          sql,
          /WHERE id = \$3$/i,
          "Die Raum-ID muss als letzter gebundener Parameter im WHERE stehen"
        );
        assert.doesNotMatch(
          sql,
          /\bname\s*=/i,
          "Ein PATCH ohne Namensfeld darf den Namen nicht anfassen"
        );
        assert.deepEqual(
          record.values,
          [12, 20, 777],
          "UPDATE muss die neuen Werte und zuletzt die Raum-ID binden"
        );
        return { rows: [], rowCount: 1 };
      }
      if (/FROM rooms JOIN locations/i.test(sql)) {
        return {
          rows: [roomRow(777, "Besprechung alt", 12, 20, "Berlin")],
        };
      }
      if (/^COMMIT$/i.test(sql)) return { rows: [] };
      if (/^ROLLBACK$/i.test(sql)) return { rows: [] };
      throw new Error(`Unerwartete Abfrage im Test: ${record.sql}`);
    });

    const updated = await updateRoom(777, { locationId: 12, capacity: 20 }, "patch");

    // Kein zweites UPDATE – die Änderung ist ein einzelner Schreibzugriff.
    // Das UPDATE läuft innerhalb der Transaktion über den Client und steht
    // deshalb im Client-Protokoll (siehe recordedSql), nicht in pool.queries.
    assert.equal(countRecorded(fake, /^UPDATE rooms SET/i), 1);
    assert.equal(updated.locationId, 12);
    assert.equal(updated.capacity, 20);
    assert.deepEqual(updated.location, { id: 12, name: "Berlin" });

    // GET-Nachweis: die Änderung ist über den Detailabruf sichtbar, der
    // unangetastete Name bleibt erhalten.
    const readBack = await getRoom(777);
    assert.equal(readBack.name, "Besprechung alt");
    assert.equal(readBack.locationId, 12);
    assert.equal(readBack.capacity, 20);
    assert.equal(readBack.location.name, "Berlin");
  } finally {
    session.end();
  }
});

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
}

