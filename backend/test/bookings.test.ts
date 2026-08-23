import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { __restorePoolForTests, __setPoolForTests } from "../src/db.js";
import { InMemoryDb } from "./helpers/in-memory-db.js";
import {
  createBooking,
  findOverlappingBookings,
} from "../src/services/bookings.js";
import { ConflictError, ValidationError } from "../src/services/errors.js";

// ---------------------------------------------------------------------------
// Aufbau: Eine In-Memory-Postgres mit dem echten Migrationsschema für die
// gesamte Datei, als Pool in die Produktions-Naht (src/db.ts) eingesetzt.
// Alle Service- und API-Aufrufe dieser Datei laufen damit real gegen SQL
// (DDL, Identity-Spalten, Fremdschlüssel, timestamptz-Vergleiche) – ohne
// Container. Die Instanz stirbt mit dem Testlauf, Aufräumen entfällt.
// ---------------------------------------------------------------------------

const db = await InMemoryDb.migrated();
__setPoolForTests(db.pool);

after(async () => {
  // Ursprünglichen Pool zurückgeben und In-Memory-Instanz schließen, damit
  // der Lauf sauber endet.
  __restorePoolForTests();
  await db.end();
});

let locationId: number;

before(async () => {
  const loc = await db.query<{ id: number }>(
    "INSERT INTO locations (name) VALUES ('Buchungsteststandort') RETURNING id::int AS id"
  );
  locationId = loc.rows[0].id;
});

/** Legt einen frischen Raum an – je Test einer, damit sich nichts beeinflusst. */
async function createTestRoom(name: string): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO rooms (name, location_id, capacity) VALUES ($1, $2, 8) RETURNING id::int AS id",
    [name, locationId]
  );
  return rows[0].id;
}

/** Legt eine Buchungszeile direkt per SQL an (Arrangement für Kollisionstests). */
async function seedBooking(
  roomId: number,
  startsAt: string,
  endsAt: string
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO bookings (room_id, created_by, starts_at, ends_at) " +
      "VALUES ($1, 'vorhanden@example.com', $2::timestamptz, $3::timestamptz) RETURNING id::int AS id",
    [roomId, startsAt, endsAt]
  );
  return rows[0].id;
}

async function countBookings(roomId: number): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM bookings WHERE room_id = $1",
    [roomId]
  );
  return rows[0].n;
}

function bookingBody(roomId: number, startsAt: string, endsAt: string) {
  return {
    roomId,
    startsAt,
    endsAt,
    createdBy: "mitarbeiter@example.com",
  };
}

// ---------------------------------------------------------------------------
// Teil 1: API – POST /api/bookings (Erfolg, Kollision, Back-to-back, 400).
// ---------------------------------------------------------------------------

test("POST /api/bookings legt eine Buchung an und liefert sie mit Urheber und Status zurück", async () => {
  const roomId = await createTestRoom("API Erfolg");

  const res = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-01T08:00:00.000Z", "2026-10-01T09:30:00.000Z"));

  assert.equal(res.status, 201);
  assert.ok(res.body.id > 0, "Antwort enthält keine erzeugte ID");
  assert.equal(res.body.roomId, roomId);
  assert.equal(res.body.createdBy, "mitarbeiter@example.com");
  assert.equal(res.body.startsAt, "2026-10-01T08:00:00.000Z");
  assert.equal(res.body.endsAt, "2026-10-01T09:30:00.000Z");
  assert.equal(res.body.status, "bestaetigt");

  // Die Buchung ist wirklich gespeichert – mit Urheber und Status.
  const { rows } = await db.query(
    "SELECT room_id::int AS room_id, created_by, status, starts_at, ends_at " +
      "FROM bookings WHERE id = $1",
    [res.body.id]
  );
  assert.equal(rows.length, 1, "Buchung wurde nicht persistiert");
  assert.equal(rows[0].room_id, roomId);
  assert.equal(rows[0].created_by, "mitarbeiter@example.com");
  assert.equal(rows[0].status, "bestaetigt");
});

test("POST /api/bookings mit überschneidendem Zeitraum wird mit 409 und verständlicher Meldung abgelehnt", async () => {
  const roomId = await createTestRoom("API Kollision");
  await seedBooking(roomId, "2026-10-02T10:00:00Z", "2026-10-02T11:00:00Z");

  // Alle Formen der Überschneidung: teilweise vorne, teilweise hinten,
  // vollständig umschließend und vollständig enthalten.
  const colliding = [
    ["2026-10-02T09:30:00Z", "2026-10-02T10:30:00Z"], // schneidet vorne
    ["2026-10-02T10:30:00Z", "2026-10-02T11:30:00Z"], // schneidet hinten
    ["2026-10-02T09:00:00Z", "2026-10-02T12:00:00Z"], // umschließt bestehend
    ["2026-10-02T10:15:00Z", "2026-10-02T10:45:00Z"], // liegt darin
  ];
  for (const [start, end] of colliding) {
    const res = await request(app)
      .post("/api/bookings")
      .send(bookingBody(roomId, start, end));
    assert.equal(res.status, 409, `Status für ${start}–${end} war nicht 409`);
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Antwort enthält keine verständliche Fehlermeldung"
    );
    assert.match(res.body.error, /bereits gebucht/);
  }

  // Abgelehnte Anfragen dürfen keine Zeilen hinterlassen.
  assert.equal(await countBookings(roomId), 1);
});

test("POST /api/bookings: direkt angrenzende Buchungen (Back-to-back) sind zulässig", async () => {
  const roomId = await createTestRoom("API Back-to-back");
  await seedBooking(roomId, "2026-10-03T10:00:00Z", "2026-10-03T11:00:00Z");

  const afterExisting = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-03T11:00:00Z", "2026-10-03T12:00:00Z"));
  assert.equal(afterExisting.status, 201, "Anschluss ab 11:00 wurde abgelehnt");

  const beforeExisting = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-03T09:00:00Z", "2026-10-03T10:00:00Z"));
  assert.equal(beforeExisting.status, 201, "Vorläufer bis 10:00 wurde abgelehnt");

  assert.equal(await countBookings(roomId), 3);
});

test("POST /api/bookings: gleicher Zeitraum in anderem Raum kollidiert nicht", async () => {
  const roomA = await createTestRoom("API Raum A");
  const roomB = await createTestRoom("API Raum B");
  await seedBooking(roomA, "2026-10-04T10:00:00Z", "2026-10-04T11:00:00Z");

  const res = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomB, "2026-10-04T10:00:00Z", "2026-10-04T11:00:00Z"));
  assert.equal(res.status, 201, "Buchung eines anderen Raums wurde zu Unrecht abgelehnt");
});

test("Nach erfolgreicher Buchung ist derselbe Zeitraum im Raum belegt (erneute Buchung -> 409)", async () => {
  const roomId = await createTestRoom("API Zeitraum belegt");
  const body = bookingBody(roomId, "2026-10-05T14:00:00Z", "2026-10-05T15:00:00Z");

  const first = await request(app).post("/api/bookings").send(body);
  assert.equal(first.status, 201);

  const second = await request(app).post("/api/bookings").send(body);
  assert.equal(second.status, 409);
  assert.match(second.body.error, /bereits gebucht/);
});

test("POST /api/bookings weist ungültige Eingaben mit 400 und Meldung ab", async () => {
  const roomId = await createTestRoom("API Ungueltig");
  const before = await countBookings(roomId);

  const cases: Array<Record<string, unknown>> = [
    {}, // alles fehlt
    { startsAt: "2026-10-06T10:00:00Z", endsAt: "2026-10-06T11:00:00Z", createdBy: "x@example.com" }, // Raum fehlt
    { roomId: "kein-id", startsAt: "2026-10-06T10:00:00Z", endsAt: "2026-10-06T11:00:00Z", createdBy: "x@example.com" },
    { roomId, endsAt: "2026-10-06T11:00:00Z", createdBy: "x@example.com" }, // Start fehlt
    { roomId, startsAt: "kein Datum", endsAt: "2026-10-06T11:00:00Z", createdBy: "x@example.com" },
    { roomId, startsAt: "2026-10-06T10:00:00Z", createdBy: "x@example.com" }, // Ende fehlt
    { roomId, startsAt: "2026-10-06T10:00:00Z", endsAt: "kein Datum", createdBy: "x@example.com" },
    // Ende vor Anfang …
    { roomId, startsAt: "2026-10-06T11:00:00Z", endsAt: "2026-10-06T10:00:00Z", createdBy: "x@example.com" },
    // … und Ende gleich Anfang (leere Dauer ist keine Buchung)
    { roomId, startsAt: "2026-10-06T10:00:00Z", endsAt: "2026-10-06T10:00:00Z", createdBy: "x@example.com" },
    { roomId, startsAt: "2026-10-06T10:00:00Z", endsAt: "2026-10-06T11:00:00Z" }, // Urheber fehlt
    { roomId, startsAt: "2026-10-06T10:00:00Z", endsAt: "2026-10-06T11:00:00Z", createdBy: "   " },
  ];
  for (const body of cases) {
    const res = await request(app).post("/api/bookings").send(body);
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

  // Auch ein nicht existierender Raum ist ein Validierungsfehler des Clients
  // (gleiche Wertung wie beim Standort-Check im Raum-Service).
  const unknownRoom = await request(app)
    .post("/api/bookings")
    .send(
      bookingBody(99999999, "2026-10-06T10:00:00Z", "2026-10-06T11:00:00Z")
    );
  assert.equal(unknownRoom.status, 400);
  assert.match(unknownRoom.body.error, /Raum/);

  assert.equal(
    await countBookings(roomId),
    before,
    "Ungültige Anfragen dürfen keine Buchungen hinterlassen"
  );
});

// ---------------------------------------------------------------------------
// Teil 1b: API – GET /api/bookings?roomId= (Kalenderansicht je Raum,
// Anforderung 1): Buchungen eines Raums zeitlich geordnet, optional auf
// einen Tag begrenzt.
// ---------------------------------------------------------------------------

test("GET /api/bookings liefert die Buchungen eines Raums aufsteigend nach Beginn", async () => {
  const roomId = await createTestRoom("GET Liste");
  // Bewusst unsortiert anlegen: die Antwort muss nach starts_at geordnet sein.
  await seedBooking(roomId, "2026-10-10T14:00:00Z", "2026-10-10T15:00:00Z");
  await seedBooking(roomId, "2026-10-10T09:00:00Z", "2026-10-10T10:30:00Z");

  const res = await request(app).get(`/api/bookings?roomId=${roomId}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
  assert.equal(res.body[0].startsAt, "2026-10-10T09:00:00.000Z");
  assert.equal(res.body[0].endsAt, "2026-10-10T10:30:00.000Z");
  assert.equal(res.body[1].startsAt, "2026-10-10T14:00:00.000Z");
  // Vollständige Felder für die Kalenderansicht: Urheber und Status mit.
  assert.equal(res.body[0].roomId, roomId);
  assert.equal(res.body[0].createdBy, "vorhanden@example.com");
  assert.equal(res.body[0].status, "bestaetigt");
});

test("GET /api/bookings trennt Räume: Buchungen anderer Räume erscheinen nicht", async () => {
  const roomA = await createTestRoom("GET Raum A");
  const roomB = await createTestRoom("GET Raum B");
  await seedBooking(roomA, "2026-10-11T10:00:00Z", "2026-10-11T11:00:00Z");

  const resB = await request(app).get(`/api/bookings?roomId=${roomB}`);
  assert.equal(resB.status, 200);
  assert.deepEqual(resB.body, []);

  const resA = await request(app).get(`/api/bookings?roomId=${roomA}`);
  assert.equal(resA.body.length, 1);
  assert.equal(resA.body[0].roomId, roomA);
});

test("GET /api/bookings?date= begrenzt auf Buchungen, die diesen Tag schneiden", async () => {
  const roomId = await createTestRoom("GET Tagesfilter");
  await seedBooking(roomId, "2026-10-12T08:00:00Z", "2026-10-12T09:30:00Z"); // im Tag
  await seedBooking(roomId, "2026-10-13T08:00:00Z", "2026-10-13T09:30:00Z"); // Folgetag

  const res = await request(app).get(
    `/api/bookings?roomId=${roomId}&date=2026-10-12`
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].startsAt, "2026-10-12T08:00:00.000Z");
});

test("GET /api/bookings ohne Buchungen liefert eine leere Liste, mit ungültiger Raum-ID 404", async () => {
  const roomId = await createTestRoom("GET Leer");
  const res = await request(app).get(`/api/bookings?roomId=${roomId}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);

  const unknown = await request(app).get("/api/bookings?roomId=99999999");
  assert.equal(unknown.status, 404);
  assert.match(unknown.body.error, /Raum nicht gefunden/);

  // Nicht-numerische und fehlende Raum-ID: ebenfalls „nicht gefunden",
  // kein roher 500.
  const notNumeric = await request(app).get("/api/bookings?roomId=abc");
  assert.equal(notNumeric.status, 404);
  const missing = await request(app).get("/api/bookings");
  assert.equal(missing.status, 404);
});

test("GET /api/bookings mit unlesbarem date liefert eine leere Liste statt eines Fehlers", async () => {
  const roomId = await createTestRoom("GET Kaputtes Datum");
  await seedBooking(roomId, "2026-10-14T10:00:00Z", "2026-10-14T11:00:00Z");

  const res = await request(app).get(
    `/api/bookings?roomId=${roomId}&date=kein-datum`
  );
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

// ---------------------------------------------------------------------------
// Teil 2: Service-Ebene – die Überschneidungsprüfung als eigenständige,
// wiederverwendbare Funktion (Grundlage für Serienbuchungen) und die
// Fachfehler der Service-Funktion.
//
// Hinweis zur Absicherung gleichzeitiger Buchungen: Der Service prüft und
// fügt innerhalb einer Transaktion ein und sperrt zuvor die Raumzeile
// (SELECT ... FOR UPDATE). Auf echter Postgres serialisieren sich zwei
// gleichzeitige Buchungen desselben Raums dadurch, sodass genau eine
// erfolgreich ist. Die In-Memory-DB bildet keine Sperren/Isolation zwischen
// gleichzeitig offenen Clients ab (dokumentierte Grenze des Helpers), daher
// ist dieser Race hier nicht darstellbar – getestet wird das Verhalten bei
// nacheinander sichtbaren Buchungen, das derselbe Codepfad absichert.
// ---------------------------------------------------------------------------

test("findOverlappingBookings findet genau die wirklich überschneidenden Buchungen", async () => {
  const roomId = await createTestRoom("Service Überschneidung");
  await seedBooking(roomId, "2026-10-07T10:00:00Z", "2026-10-07T11:00:00Z");

  const overlaps = await findOverlappingBookings(
    db,
    roomId,
    new Date("2026-10-07T10:30:00Z"),
    new Date("2026-10-07T12:00:00Z")
  );
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].roomId, roomId);
  assert.equal(overlaps[0].startsAt, "2026-10-07T10:00:00.000Z");

  const adjacent = await findOverlappingBookings(
    db,
    roomId,
    new Date("2026-10-07T11:00:00Z"),
    new Date("2026-10-07T12:00:00Z")
  );
  assert.equal(adjacent.length, 0, "Angrenzende Buchung darf als Kollision gelten");

  const otherRoom = await createTestRoom("Service Anderer Raum");
  const elsewhere = await findOverlappingBookings(
    db,
    otherRoom,
    new Date("2026-10-07T10:30:00Z"),
    new Date("2026-10-07T12:00:00Z")
  );
  assert.equal(elsewhere.length, 0, "Kollision darf nicht raumübergreifend gelten");
});

test("createBooking wirft bei Konflikt einen ConflictError und bei ungültigen Feldern einen ValidationError", async () => {
  const roomId = await createTestRoom("Service Fehler");
  await seedBooking(roomId, "2026-10-08T10:00:00Z", "2026-10-08T11:00:00Z");

  await assert.rejects(
    createBooking(
      bookingBody(roomId, "2026-10-08T10:30:00Z", "2026-10-08T11:30:00Z")
    ),
    (err: unknown) => {
      assert.ok(err instanceof ConflictError, "Konflikt war kein ConflictError");
      assert.match((err as Error).message, /bereits gebucht/);
      return true;
    }
  );

  await assert.rejects(
    createBooking(
      bookingBody(roomId, "2026-10-08T11:00:00Z", "2026-10-08T10:00:00Z")
    ),
    (err: unknown) => {
      assert.ok(
        err instanceof ValidationError,
        "Ende vor Anfang war kein ValidationError"
      );
      return true;
    }
  );

  // Beide Ablehnungen dürfen keine Spuren hinterlassen: weiterhin genau eine
  // Buchung in diesem Raum.
  assert.equal(await countBookings(roomId), 1);
});
