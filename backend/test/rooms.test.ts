import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { __restorePoolForTests, __setPoolForTests } from "../src/db.js";
import { InMemoryDb } from "./helpers/in-memory-db.js";
import {
  createRoom,
  getRoom,
  listAvailableRooms,
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

// ---------------------------------------------------------------------------
// Aufbau: Eine In-Memory-Postgres mit dem echten Migrationsschema für die
// gesamte Datei, als Pool in die Produktions-Naht (src/db.ts) eingesetzt.
// Alle Service- und API-Aufrufe dieser Datei laufen damit real gegen SQL
// (DDL, Identity-Spalten, Fremdschlüssel, timestamptz-Vergleiche) – ohne
// Container. Die Instanz stirbt mit dem Testlauf, Aufräumen entfällt.
//
// Damit entfällt auch der frühere DB-Erreichbarkeits-Zweig: Die ehemals nur
// im Compose-Stack laufenden Integrationstests dieser Datei werden jetzt
// immer ausgeführt.
// ---------------------------------------------------------------------------

const db = await InMemoryDb.migrated();
__setPoolForTests(db.pool);

after(async () => {
  // Ursprünglichen Pool zurückgeben und In-Memory-Instanz schließen, damit
  // der Lauf sauber endet.
  __restorePoolForTests();
  await db.end();
});

let baseLocationId: number;
let otherLocationId: number;

before(async () => {
  const base = await db.query<{ id: number }>(
    "INSERT INTO locations (name) VALUES ('Raumtest – Basisstandort') RETURNING id::int AS id"
  );
  baseLocationId = base.rows[0].id;
  const other = await db.query<{ id: number }>(
    "INSERT INTO locations (name) VALUES ('Raumtest – Anderer Standort') RETURNING id::int AS id"
  );
  otherLocationId = other.rows[0].id;
});

/** Legt einen frischen Raum an – je Test einer, damit sich nichts beeinflusst. */
async function createTestRoom(
  name: string,
  locationId: number = baseLocationId,
  capacity = 8
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO rooms (name, location_id, capacity) VALUES ($1, $2, $3) RETURNING id::int AS id",
    [name, locationId, capacity]
  );
  return rows[0].id;
}

/** Legt eine Buchungszeile direkt per SQL an (Arrangement für Kollisions-/Suchtests). */
async function seedBooking(
  roomId: number,
  startsAt: string,
  endsAt: string
): Promise<void> {
  await db.query(
    "INSERT INTO bookings (room_id, created_by, starts_at, ends_at) " +
      "VALUES ($1, 'vorhanden@example.com', $2::timestamptz, $3::timestamptz)",
    [roomId, startsAt, endsAt]
  );
}

function bookingBody(roomId: number, startsAt: string, endsAt: string) {
  return {
    roomId,
    startsAt,
    endsAt,
    createdBy: "mitarbeiter@example.com",
  };
}

/** IDs der Räume in einer /available-Antwort. */
function listedIds(body: Array<{ id: number }>): number[] {
  return body.map((room) => room.id);
}

// ---------------------------------------------------------------------------
// Teil 1: Pflichtfeld-Validierung von POST/PUT/PATCH – sie greift, BEVOR die
// Datenbank berührt wird, und liefert verlässlich 400 mit Meldung.
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
  // Ohne Felder gibt es nichts zu validieren – die Route nimmt die Anfrage
  // grundsätzlich an. Gegen die In-Memory-DB ist das Verhalten deterministisch:
  // Der Raum mit ID 1 existiert hier nicht, also 404 mit Meldung aus dem
  // Router (keine stille Antwort und kein roher 500).
  const res = await request(app).patch("/api/rooms/1").send({});
  assert.equal(res.status, 404, "Leeres PATCH auf unbekannter ID war kein 404");
  assert.ok(
    typeof res.body?.error === "string" && res.body.error.length > 0,
    "404 ohne verständliche Fehlermeldung"
  );
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
// Teil 2: Containerlose Service-Tests über den Fake-Pool (protokollierende
// Naht). Sie prüfen Eigenschaften, die gegen eine echte Datenbank unsichtbar
// blieben: dass bei ungültigen Pflichtfeldern gar kein Statement abgesetzt
// wird und dass die Listenabfrage die erwartete Form hat. Das reale
// SQL-Verhalten prüfen die übrigen Teile dieser Datei gegen die
// In-Memory-DB.
// ---------------------------------------------------------------------------

// Eigene Fake-Pool-Sitzung je Test (begin/end im finally): So bleibt die Naht
// nur für den jeweiligen Service-Test aktiv und die übrigen Tests treffen
// weiterhin die In-Memory-Postgres.
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
  // Ein Raum mit Zuordnung, einer ohne: Die Merkmals-Abfrage liefert je
  // Raum-ID die Join-Zeilen, das Nachladen im Service ordnet sie zu – Räume
  // ohne Treffer erhalten garantiert ein leeres Array (statt null).
  const amenitiesByRoom = new Map<number, Array<{ roomId: number; key: string; label: string }>>([
    [101, [{ roomId: 101, key: "beamer", label: "Beamer" }]],
    [102, []],
  ]);
  fake.respondWith((record) => {
    const sql = normalizeSql(record.sql);
    if (/FROM room_amenities ra JOIN amenities a/i.test(sql)) {
      assert.match(
        sql,
        /ORDER BY ra\.room_id, a\.key/i,
        "Merkmale müssen stabil nach Raum und Schlüssel geordnet geliefert werden"
      );
      const ids = record.values as number[];
      assert.deepEqual(
        [...ids].sort((a, b) => a - b),
        [101, 102],
        "Merkmals-Nachladen fragt nicht genau die gelisteten Räume ab"
      );
      return { rows: ids.flatMap((id) => amenitiesByRoom.get(id) ?? []) };
    }
    assert.match(
      normalizeSql(record.sql),
      /FROM rooms JOIN locations/i,
      "Raumliste fragt nicht den erwarteten Select ab"
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
// Teil 3: Containerlose Service-Tests für Anlegen und Ändern (Fake-Pool).
//
// Geprüft wird die Fachlogik von services/rooms – Anlegen inkl. GET-Nachweis,
// drei Pflichtfeld-Ablehnungen und Änderung von Standort/Kapazität. Das
// reale Schreibverhalten bestätigen die API-Tests in Teil 4 gegen die
// In-Memory-DB.
// ---------------------------------------------------------------------------

/** Zeile des flachen Basis-Selects für einen Raum (Form wie aus der DB). */
function roomRow(
  id: number,
  name: string,
  locationId: number,
  capacity: number,
  locationName: string
): Record<string, unknown> {
  return { id, name, locationId, capacity, locationName };
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
      if (/FROM room_amenities ra JOIN amenities a/i.test(sql)) {
        // Merkmals-Nachladen des Service – im Fake ohne Zuordnungen.
        return { rows: [] };
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

// ---------------------------------------------------------------------------
// Teil 4: API-Integration gegen die In-Memory-Postgres – Anlegen und Ändern
// über HTTP, inklusive Fremdschlüssel-Prüfung des Standorts.
// ---------------------------------------------------------------------------

test("POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort", async () => {
  const created = await request(app).post("/api/rooms").send({
    name: "API-Angelegt – Besprechung",
    locationId: baseLocationId,
    capacity: 12,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.name, "API-Angelegt – Besprechung");
  assert.equal(created.body.locationId, baseLocationId);
  assert.equal(created.body.capacity, 12);
  assert.deepEqual(created.body.location, {
    id: baseLocationId,
    name: "Raumtest – Basisstandort",
  });

  const list = await request(app).get("/api/rooms");
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body));
  const listed = list.body.find(
    (room: { id: number }) => room.id === created.body.id
  );
  assert.ok(listed, "angelegter Raum fehlt in GET /api/rooms");
  assert.equal(listed.name, "API-Angelegt – Besprechung");
  assert.equal(listed.capacity, 12);
  assert.deepEqual(listed.location, {
    id: baseLocationId,
    name: "Raumtest – Basisstandort",
  });
});

test("POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt", async () => {
  const res = await request(app).post("/api/rooms").send({
    name: "API ohne Standort",
    locationId: 99999999,
    capacity: 4,
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Standort/i);
});

test("PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar", async () => {
  const roomId = await createTestRoom("API alter Name");

  const updated = await request(app)
    .put(`/api/rooms/${roomId}`)
    .send({
      name: "API neuer Name",
      locationId: otherLocationId,
      capacity: 14,
    });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "API neuer Name");
  assert.equal(updated.body.locationId, otherLocationId);
  assert.equal(updated.body.capacity, 14);

  const readBack = await request(app).get(`/api/rooms/${roomId}`);
  assert.equal(readBack.status, 200);
  assert.equal(readBack.body.name, "API neuer Name");
  assert.equal(readBack.body.locationId, otherLocationId);
  assert.equal(readBack.body.capacity, 14);
});

test("PATCH ändert nur die übergebenen Felder", async () => {
  const roomId = await createTestRoom("API patch");

  const updated = await request(app)
    .patch(`/api/rooms/${roomId}`)
    .send({ capacity: 20 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.capacity, 20);
  assert.equal(updated.body.name, "API patch");
  assert.equal(updated.body.locationId, baseLocationId);

  const readBack = await request(app).get(`/api/rooms/${roomId}`);
  assert.equal(readBack.body.locationId, baseLocationId);
  assert.equal(readBack.body.name, "API patch");
});

test("PATCH mit leerem Körper lässt den Raum unverändert", async () => {
  const roomId = await createTestRoom("API leer");

  const updated = await request(app)
    .patch(`/api/rooms/${roomId}`)
    .send({});
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "API leer");
  assert.equal(updated.body.capacity, 8);
});

test("Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt", async () => {
  const roomId = await createTestRoom("API standortfehler");

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
        ? { name: "API egal", locationId: baseLocationId, capacity: 2 }
        : { capacity: 2 };
    const res = await request(app)[verb]("/api/rooms/99999999").send(body);
    assert.equal(res.status, 404, `${verb} auf unbekannte ID war nicht 404`);
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Antwort enthält keine verständliche Fehlermeldung"
    );
  }
});

// ---------------------------------------------------------------------------
// Teil 5: Vertragstests GET /api/rooms/available?from=&to= (Anforderung 1:
// freie Räume für einen Wunschzeitraum) – real gegen die In-Memory-DB.
//
// Semantik identisch zur Konfliktprüfung (services/bookings.ts):
// halboffenes Intervall [from, to), Back-to-back zählt als frei.
// ---------------------------------------------------------------------------

test("GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung", async () => {
  const freeRoom = await createTestRoom("Suche – freier Raum");
  const busyRoom = await createTestRoom("Suche – belegter Raum");
  await seedBooking(busyRoom, "2026-10-01T09:00:00Z", "2026-10-01T10:30:00Z");

  const res = await request(app)
    .get("/api/rooms/available")
    .query({ from: "2026-10-01T08:00:00Z", to: "2026-10-01T12:00:00Z" });

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));

  const ids = listedIds(res.body);
  assert.ok(ids.includes(freeRoom), "freier Raum fehlt in der Verfügbarkeitsliste");
  assert.ok(
    !ids.includes(busyRoom),
    "Raum mit kollidierender Buchung wurde als frei gelistet"
  );

  // Antwortform = Raumliste (wie GET /api/rooms), damit die Suche dieselben
  // Felder anbieten kann: Standort eingebettet, Merkmale als Liste.
  const listed = res.body.find((room: { id: number }) => room.id === freeRoom);
  assert.equal(listed.name, "Suche – freier Raum");
  assert.equal(listed.locationId, baseLocationId);
  assert.equal(listed.capacity, 8);
  assert.deepEqual(listed.amenities, []);
  assert.deepEqual(listed.location, {
    id: baseLocationId,
    name: "Raumtest – Basisstandort",
  });
});

test("Jede Form der Überschneidung schließt den Raum aus", async () => {
  const busyRoom = await createTestRoom("Suche – Überschneidungen");
  const freeRoom = await createTestRoom("Suche – Kontrollraum ohne Buchung");
  await seedBooking(busyRoom, "2026-10-02T10:00:00Z", "2026-10-02T11:00:00Z");

  // Teilweise vorne, teilweise hinten, umschließend und vollständig enthalten.
  const colliding = [
    ["2026-10-02T09:30:00Z", "2026-10-02T10:30:00Z"],
    ["2026-10-02T10:30:00Z", "2026-10-02T11:30:00Z"],
    ["2026-10-02T09:00:00Z", "2026-10-02T12:00:00Z"],
    ["2026-10-02T10:15:00Z", "2026-10-02T10:45:00Z"],
  ];
  for (const [from, to] of colliding) {
    const res = await request(app)
      .get("/api/rooms/available")
      .query({ from, to });
    assert.equal(res.status, 200, `Status für ${from}–${to} war nicht 200`);
    assert.ok(
      !listedIds(res.body).includes(busyRoom),
      `Raum war für ${from}–${to} fälschlich als frei gelistet`
    );
    assert.ok(
      listedIds(res.body).includes(freeRoom),
      `Kontrollraum fehlte für ${from}–${to}`
    );
  }
});

test("Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus", async () => {
  const room = await createTestRoom("Suche – Back-to-back");
  await seedBooking(room, "2026-10-03T10:00:00Z", "2026-10-03T11:00:00Z");

  // Vorläufer endet exakt bei Beginn der Bestehenden …
  const before = await request(app)
    .get("/api/rooms/available")
    .query({ from: "2026-10-03T09:00:00Z", to: "2026-10-03T10:00:00Z" });
  assert.equal(before.status, 200);
  assert.ok(
    listedIds(before.body).includes(room),
    "Zeitraum direkt VOR bestehender Buchung galt als belegt"
  );

  // … Anschluss beginnt exakt bei deren Ende.
  const after = await request(app)
    .get("/api/rooms/available")
    .query({ from: "2026-10-03T11:00:00Z", to: "2026-10-03T12:00:00Z" });
  assert.equal(after.status, 200);
  assert.ok(
    listedIds(after.body).includes(room),
    "Zeitraum direkt NACH bestehender Buchung galt als belegt"
  );

  // Kontrolle: derselbe Raum ist im Schnittbereich weiterhin ausgeschlossen.
  const overlap = await request(app)
    .get("/api/rooms/available")
    .query({ from: "2026-10-03T10:30:00Z", to: "2026-10-03T11:30:00Z" });
  assert.ok(
    !listedIds(overlap.body).includes(room),
    "Überschneidender Zeitraum wurde nicht als belegt erkannt"
  );
});

test("Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei", async () => {
  const room = await createTestRoom("Suche – nach Buchung");
  const query = { from: "2026-10-04T14:00:00Z", to: "2026-10-04T15:00:00Z" };

  const before = await request(app).get("/api/rooms/available").query(query);
  assert.ok(
    listedIds(before.body).includes(room),
    "Raum ohne Buchung wurde nicht als frei gelistet"
  );

  const booked = await request(app)
    .post("/api/bookings")
    .send(bookingBody(room, query.from, query.to));
  assert.equal(booked.status, 201);

  const afterRes = await request(app).get("/api/rooms/available").query(query);
  assert.ok(
    !listedIds(afterRes.body).includes(room),
    "Raum erscheint nach eigener Buchung weiter als frei"
  );
});

test("Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung", async () => {
  const cases: Array<Record<string, string>> = [
    {}, // beide Parameter fehlen
    { from: "2026-10-05T08:00:00Z" }, // to fehlt
    { to: "2026-10-05T12:00:00Z" }, // from fehlt
    { from: "kein-datum", to: "2026-10-05T12:00:00Z" },
    { from: "2026-10-05T08:00:00Z", to: "kein-datum" },
    { from: "", to: "2026-10-05T12:00:00Z" },
    { from: "2026-10-05T08:00:00Z", to: "" },
    { from: "2026-10-05T24:99:00Z", to: "2026-10-05T12:00:00Z" }, // unmögliche Uhrzeit
    { from: "2026-13-01T08:00:00Z", to: "2026-10-05T12:00:00Z" }, // Monat 13
  ];
  for (const query of cases) {
    const res = await request(app).get("/api/rooms/available").query(query);
    assert.equal(
      res.status,
      400,
      `Status für ${JSON.stringify(query)} war nicht 400`
    );
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      `Keine verständliche Fehlermeldung für ${JSON.stringify(query)}`
    );
  }
});

test("Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt", async () => {
  const equal = await request(app).get("/api/rooms/available").query({
    from: "2026-10-06T12:00:00Z",
    to: "2026-10-06T12:00:00Z",
  });
  assert.equal(equal.status, 400);
  assert.match(equal.body.error, /nach/);

  const inverted = await request(app).get("/api/rooms/available").query({
    from: "2026-10-06T12:00:00Z",
    to: "2026-10-06T11:00:00Z",
  });
  assert.equal(inverted.status, 400);
  assert.ok(typeof inverted.body.error === "string" && inverted.body.error.length > 0);
});

// ---------------------------------------------------------------------------
// Teil 6: Service-Ebene der Verfügbarkeitssuche – Merkmals-Zusammenführung
// über mehrere Räume und Fachfehler ohne Umweg über HTTP.
// ---------------------------------------------------------------------------

test("listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste", async () => {
  const withAmenity = await createTestRoom(
    "Service-Suche – mit Beamer",
    baseLocationId,
    10
  );
  const withoutAmenity = await createTestRoom(
    "Service-Suche – ohne Merkmal",
    otherLocationId,
    4
  );
  // Beamer-Zuordnung direkt setzen (Katalog kommt aus Migration 002); die
  // Zuordnung per Unterabfrage, weil pg-mem Parameter im INSERT..SELECT als
  // Text bindet.
  await db.query(
    "INSERT INTO room_amenities (room_id, amenity_id) " +
      "VALUES ((SELECT id FROM rooms WHERE name = 'Service-Suche – mit Beamer'), " +
      "(SELECT id FROM amenities WHERE key = 'beamer'))"
  );

  const rooms = await listAvailableRooms({
    from: "2026-10-07T08:00:00Z",
    to: "2026-10-07T18:00:00Z",
  });

  const ids = rooms.map((room) => room.id);
  assert.ok(ids.includes(withAmenity), "Raum mit Merkmal fehlt unter den freien");
  assert.ok(ids.includes(withoutAmenity), "Raum ohne Merkmal fehlt unter den freien");

  const listedWith = rooms.find((room) => room.id === withAmenity);
  assert.deepEqual(listedWith?.amenities, [{ key: "beamer", label: "Beamer" }]);
  assert.deepEqual(listedWith?.location, {
    id: baseLocationId,
    name: "Raumtest – Basisstandort",
  });

  const listedWithout = rooms.find((room) => room.id === withoutAmenity);
  assert.deepEqual(
    listedWithout?.amenities,
    [],
    "Raum ohne Merkmale muss ein leeres Array liefern"
  );
  assert.equal(listedWithout?.capacity, 4);
});

test("listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError", async () => {
  await assert.rejects(
    listAvailableRooms({}),
    (err: unknown) => err instanceof ValidationError
  );
  await assert.rejects(
    listAvailableRooms({ from: "2026-10-08T10:00:00Z", to: "2026-10-08T09:00:00Z" }),
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.match((err as Error).message, /nach/);
      return true;
    }
  );
});
