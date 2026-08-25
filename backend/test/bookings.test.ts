import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { __restorePoolForTests, __setPoolForTests } from "../src/db.js";
import { InMemoryDb } from "./helpers/in-memory-db.js";
import {
  checkIn,
  createBooking,
  findOverlappingBookings,
} from "../src/services/bookings.js";
import {
  ConflictError,
  DomainNotFoundError,
  ValidationError,
} from "../src/services/errors.js";

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

/** Legt einen frischen Raum an – je Test einer, damit sich nichts beeinflusst.
 *  Optionaler Genehmigungspflicht-Schalter (Anforderung 13); Default false
 *  entspricht dem Spalten-Default und lässt bestehende Aufrufe unverändert. */
async function createTestRoom(
  name: string,
  requiresApproval = false
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO rooms (name, location_id, capacity, requires_approval) VALUES ($1, $2, 8, $3) RETURNING id::int AS id",
    [name, locationId, requiresApproval]
  );
  return rows[0].id;
}

/** Legt eine Buchungszeile direkt per SQL an (Arrangement für Kollisionstests).
 *  Optionaler Status, z. B. 'ausstehend', um Anfragen ohne Umweg über die
 *  Status-Ableitung zu arrangieren. */
async function seedBooking(
  roomId: number,
  startsAt: string,
  endsAt: string,
  status?: string
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO bookings (room_id, created_by, starts_at, ends_at, status) " +
      "VALUES ($1, 'vorhanden@example.com', $2::timestamptz, $3::timestamptz, COALESCE($4, 'bestaetigt')) " +
      "RETURNING id::int AS id",
    [roomId, startsAt, endsAt, status ?? null]
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

/** Eine Minute in Millisekunden – für Zeiträume relativ zur aktuellen Zeit. */
const MINUTE_MS = 60 * 1000;

/** Legt eine bestätigte Buchung relativ zur aktuellen Zeit an (Check-in-Tests). */
async function seedRunningBooking(
  roomId: number,
  startOffsetMs: number,
  endOffsetMs: number
): Promise<number> {
  const now = Date.now();
  const startsAt = new Date(now + startOffsetMs).toISOString();
  const endsAt = new Date(now + endOffsetMs).toISOString();
  const { rows } = await db.query<{ id: number }>(
    "INSERT INTO bookings (room_id, created_by, starts_at, ends_at) " +
      "VALUES ($1, 'laeuft@example.com', $2::timestamptz, $3::timestamptz) RETURNING id::int AS id",
    [roomId, startsAt, endsAt]
  );
  return rows[0].id;
}

/** Status einer Buchung direkt aus der DB lesen (Sicherstellung unverändert). */
async function bookingStatus(id: number): Promise<string> {
  const { rows } = await db.query<{ status: string }>(
    "SELECT status FROM bookings WHERE id = $1",
    [id]
  );
  return rows[0]?.status ?? "";
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

// ---------------------------------------------------------------------------
// Teil 2b: Status-Ableitung beim Anlegen (Anforderung 13) und Blockwirkung
// ausstehender Buchungen.
//
// createBooking leitet den Anfangsstatus aus dem Genehmigungspflicht-Schalter
// des Raums ab: 'ausstehend' bei requires_approval, sonst 'bestaetigt'. Die
// Konfliktprüfung wertet den Status dabei bewusst NICHT aus – sie zählt jede
// Buchungszeile als belegend, sodass eine ausstehende Buchung den Zeitraum
// blockiert.
//
// Bewusst NICHT Teil dieses Tickets: dass eine ABGELEHNTe oder STORNIERTE
// Buchung den Zeitraum wieder freigibt. Derzeit blockiert der Intervall-
// Vergleich jede Zeile unabhängig vom Status; die Freigabe bei Ablehnung ist
// Akzeptanzkriterium des Genehmigungsworkflow-Tickets und muss dort durch
// einen Statusfilter in findOverlappingBookings ergänzt werden.
// ---------------------------------------------------------------------------

test("Buchung im genehmigungspflichtigen Raum erhält Status 'ausstehend' und blockiert den Zeitraum", async () => {
  const roomId = await createTestRoom("Pflichtig Ausstehend", true);

  const res = await request(app)
    .post("/api/bookings")
    .send(
      bookingBody(roomId, "2026-10-17T10:00:00Z", "2026-10-17T11:00:00Z")
    );
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "ausstehend");

  // Nicht nur in der Antwort: wirklich mit diesem Status persistiert.
  assert.equal(await bookingStatus(res.body.id), "ausstehend");

  // Die ausstehende Buchung belegt den Zeitraum – überschneidend wird auf
  // Service- und API-Ebene abgelehnt.
  const overlaps = await findOverlappingBookings(
    db,
    roomId,
    new Date("2026-10-17T10:30:00Z"),
    new Date("2026-10-17T11:30:00Z")
  );
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].status, "ausstehend");

  await assert.rejects(
    createBooking(
      bookingBody(roomId, "2026-10-17T10:30:00Z", "2026-10-17T11:30:00Z")
    ),
    (err: unknown) => {
      assert.ok(err instanceof ConflictError);
      assert.match((err as Error).message, /bereits gebucht/);
      return true;
    }
  );

  const apiRes = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-17T09:30:00Z", "2026-10-17T10:30:00Z"));
  assert.equal(apiRes.status, 409);
  assert.match(apiRes.body.error, /bereits gebucht/);

  assert.equal(
    await countBookings(roomId),
    1,
    "Abgelehnte Buchungsversuche dürfen keine Zeilen hinterlassen"
  );
});

test("Buchung im Raum ohne Genehmigungspflicht bleibt wie bisher sofort 'bestaetigt'", async () => {
  const roomId = await createTestRoom("Unpflichtig Bestaetigt", false);

  const res = await request(app)
    .post("/api/bookings")
    .send(
      bookingBody(roomId, "2026-10-18T10:00:00Z", "2026-10-18T11:00:00Z")
    );
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "bestaetigt");
  assert.equal(await bookingStatus(res.body.id), "bestaetigt");

  // Regression zum bisherigen Verhalten: Der Spalten-Default greift weiter,
  // auch wenn der Schalter am Raum ausdrücklich false geliefert wurde.
  const serviceRes = await createBooking(
    bookingBody(roomId, "2026-10-18T12:00:00Z", "2026-10-18T13:00:00Z")
  );
  assert.equal(serviceRes.status, "bestaetigt");
});

test("Eine ausstehende Buchung blockiert den Zeitraum: überschneidende neue Buchung wird abgelehnt", async () => {
  const roomId = await createTestRoom("Ausstehend Blockiert");
  const pendingId = await seedBooking(
    roomId,
    "2026-10-09T10:00:00Z",
    "2026-10-09T11:00:00Z",
    "ausstehend"
  );
  assert.equal(await bookingStatus(pendingId), "ausstehend");

  // Service-Ebene: Überschneidung hinten schneidend …
  const overlaps = await findOverlappingBookings(
    db,
    roomId,
    new Date("2026-10-09T10:30:00Z"),
    new Date("2026-10-09T11:30:00Z")
  );
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].status, "ausstehend");

  await assert.rejects(
    createBooking(
      bookingBody(roomId, "2026-10-09T10:30:00Z", "2026-10-09T11:30:00Z")
    ),
    (err: unknown) => {
      assert.ok(err instanceof ConflictError);
      assert.match((err as Error).message, /bereits gebucht/);
      return true;
    }
  );

  // API-Ebene: verständliche Fehlermeldung (409), keine zweite Zeile.
  const res = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-09T09:30:00Z", "2026-10-09T10:30:00Z"));
  assert.equal(res.status, 409);
  assert.match(res.body.error, /bereits gebucht/);

  assert.equal(
    await countBookings(roomId),
    1,
    "Abgelehnte Buchungsversuche dürfen keine Zeilen hinterlassen"
  );
});

test("Direkt angrenzende Buchungen an eine ausstehende bleiben zulässig", async () => {
  const roomId = await createTestRoom("Ausstehend Back-to-back");
  await seedBooking(
    roomId,
    "2026-10-16T10:00:00Z",
    "2026-10-16T11:00:00Z",
    "ausstehend"
  );

  const afterPending = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-16T11:00:00Z", "2026-10-16T12:00:00Z"));
  assert.equal(afterPending.status, 201, "Anschluss ab 11:00 wurde abgelehnt");
  assert.equal(afterPending.body.status, "bestaetigt");

  const beforePending = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-16T09:00:00Z", "2026-10-16T10:00:00Z"));
  assert.equal(beforePending.status, 201, "Vorläufer bis 10:00 wurde abgelehnt");

  assert.equal(await countBookings(roomId), 3);
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

// ---------------------------------------------------------------------------
// Teil 3: Check-in der aktuell laufenden Buchung (Anforderung 2) – API und
// Service-Ebene. „Laufend" heißt Start <= jetzt < Ende; die Arrangements
// legen ihre Buchungen deshalb relativ zur aktuellen Zeit an.
// ---------------------------------------------------------------------------

test("POST /api/bookings/:id/check-in checkt eine laufende, bestätigte Buchung ein", async () => {
  const roomId = await createTestRoom("Checkin Erfolg");
  const id = await seedRunningBooking(roomId, -10 * MINUTE_MS, +30 * MINUTE_MS);

  const res = await request(app).post(`/api/bookings/${id}/check-in`);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, id);
  assert.equal(res.body.status, "eingecheckt");
  assert.equal(res.body.roomId, roomId);

  // Auch in der Datenbank wirklich gesetzt, nicht nur in der Antwort.
  assert.equal(await bookingStatus(id), "eingecheckt");
});

test("POST /api/bookings/:id/check-in ist bei bereits eingecheckter Buchung idempotent (200, Status bleibt)", async () => {
  const roomId = await createTestRoom("Checkin Idempotent");
  const id = await seedRunningBooking(roomId, -5 * MINUTE_MS, +20 * MINUTE_MS);

  const first = await request(app).post(`/api/bookings/${id}/check-in`);
  assert.equal(first.status, 200);
  assert.equal(first.body.status, "eingecheckt");

  const second = await request(app).post(`/api/bookings/${id}/check-in`);
  assert.equal(second.status, 200);
  assert.equal(second.body.status, "eingecheckt");
  assert.deepEqual(second.body, first.body);
});

test("POST /api/bookings/:id/check-in lehnt zukünftige Buchung mit 409 ab, Status bleibt unverändert", async () => {
  const roomId = await createTestRoom("Checkin Zukunft");
  const id = await seedRunningBooking(roomId, +15 * MINUTE_MS, +75 * MINUTE_MS);

  const res = await request(app).post(`/api/bookings/${id}/check-in`);
  assert.equal(res.status, 409);
  assert.match(res.body.error, /läuft derzeit nicht/);
  assert.equal(await bookingStatus(id), "bestaetigt");
});

test("POST /api/bookings/:id/check-in lehnt beendete Buchung mit 409 ab, Status bleibt unverändert", async () => {
  const roomId = await createTestRoom("Checkin Vergangenheit");
  const id = await seedRunningBooking(roomId, -90 * MINUTE_MS, -30 * MINUTE_MS);

  const res = await request(app).post(`/api/bookings/${id}/check-in`);
  assert.equal(res.status, 409);
  assert.match(res.body.error, /läuft derzeit nicht/);
  assert.equal(await bookingStatus(id), "bestaetigt");
});

test("POST /api/bookings/:id/check-in mit unbekannter ID liefert 404", async () => {
  const res = await request(app).post("/api/bookings/99999999/check-in");
  assert.equal(res.status, 404);
  assert.match(res.body.error, /Buchung nicht gefunden/);
});

test("checkIn lehnt stornierte und als 'nicht erschienen' behandelte Buchungen mit ConflictError ab", async () => {
  const roomId = await createTestRoom("Checkin Falscher Status");

  const stornoId = await seedRunningBooking(
    roomId,
    -10 * MINUTE_MS,
    +30 * MINUTE_MS
  );
  await db.query("UPDATE bookings SET status = 'storniert' WHERE id = $1", [
    stornoId,
  ]);
  await assert.rejects(
    () => checkIn(stornoId),
    (err: unknown) => {
      assert.ok(err instanceof ConflictError);
      assert.match((err as Error).message, /Nur bestätigte/);
      return true;
    }
  );

  // Die No-Show-Freigabe (Anforderung 3, Sprint-Ziel) setzt diesen Status –
  // auch solche Zeilen darf der Check-in nicht wiederbeleben.
  const noShowId = await seedRunningBooking(
    roomId,
    -10 * MINUTE_MS,
    +30 * MINUTE_MS
  );
  await db.query("UPDATE bookings SET status = 'nicht erschienen' WHERE id = $1", [
    noShowId,
  ]);
  await assert.rejects(() => checkIn(noShowId), ConflictError);

  const pendingId = await seedRunningBooking(
    roomId,
    -10 * MINUTE_MS,
    +30 * MINUTE_MS
  );
  await db.query("UPDATE bookings SET status = 'ausstehend' WHERE id = $1", [
    pendingId,
  ]);
  await assert.rejects(() => checkIn(pendingId), ConflictError);

  for (const id of [stornoId, noShowId, pendingId]) {
    assert.notEqual(await bookingStatus(id), "eingecheckt");
  }
});

test("checkIn wirft für unbekannte ID einen DomainNotFoundError", async () => {
  await assert.rejects(() => checkIn(42424242), DomainNotFoundError);
});

// ---------------------------------------------------------------------------
// Teil 4: Gäste einer Buchung (Anforderung 1: Buchung für Gäste ohne eigenen
// Account). Der POST übernimmt das optionale `guests`-Array, persistiert die
// Gäste in der Transaktion der Buchung und liefert sie in der Antwort zurück.
// GET /api/bookings lädt die Gäste separat pro Buchung – der leere Fall
// (keine Gäste) bleibt byte-ident zum bisherigen Vertrag.
// ---------------------------------------------------------------------------

test("POST /api/bookings persistiert erfasste Gäste und liefert sie in der Antwort zurück", async () => {
  const roomId = await createTestRoom("Gäste Erfolg");
  const body = {
    ...bookingBody(roomId, "2026-10-20T10:00:00Z", "2026-10-20T11:00:00Z"),
    guests: [
      { name: "Frida Lang", email: "frida@gast.example.org" },
      { name: "Tom Reuter", email: "tom@gast.example.org" },
    ],
  };

  const res = await request(app).post("/api/bookings").send(body);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, "bestaetigt");
  // Gäste kommen in der Antwort als Array mit id, name, email.
  assert.ok(Array.isArray(res.body.guests), "Antwort enthält keine guests-Liste");
  assert.equal(res.body.guests.length, 2);
  assert.equal(res.body.guests[0].name, "Frida Lang");
  assert.equal(res.body.guests[0].email, "frida@gast.example.org");
  assert.ok(res.body.guests[0].id > 0);
  assert.equal(res.body.guests[1].name, "Tom Reuter");
  assert.equal(res.body.guests[1].email, "tom@gast.example.org");

  // Die Gäste sind wirklich in der Tabelle booking_guests mit der
  // korrekten booking_id verknüpft.
  const { rows } = await db.query<{ name: string; email: string }>(
    "SELECT name, email FROM booking_guests WHERE booking_id = $1 ORDER BY id",
    [res.body.id]
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Frida Lang");
  assert.equal(rows[0].email, "frida@gast.example.org");
  assert.equal(rows[1].name, "Tom Reuter");
  assert.equal(rows[1].email, "tom@gast.example.org");
});

test("GET /api/bookings liefert Buchungen mit ihren Gästen", async () => {
  const roomId = await createTestRoom("Gäste GET");
  const bookingId = await createBooking({
    roomId,
    startsAt: "2026-10-21T10:00:00Z",
    endsAt: "2026-10-21T11:00:00Z",
    createdBy: "mitarbeiter@example.com",
    guests: [
      { name: "Frida Lang", email: "frida@gast.example.org" },
      { name: "Tom Reuter", email: "tom@gast.example.org" },
    ],
  });

  const res = await request(app).get(`/api/bookings?roomId=${roomId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.ok(Array.isArray(res.body[0].guests));
  assert.equal(res.body[0].guests.length, 2);
  assert.equal(res.body[0].guests[0].name, "Frida Lang");
  assert.equal(res.body[0].guests[1].name, "Tom Reuter");
});

test("POST /api/bookings ohne Gäste: Antwort enthält kein guests-Feld (byte-ident zum bisherigen Vertrag)", async () => {
  const roomId = await createTestRoom("Gäste Leer");

  const res = await request(app)
    .post("/api/bookings")
    .send(bookingBody(roomId, "2026-10-22T10:00:00Z", "2026-10-22T11:00:00Z"));

  assert.equal(res.status, 201);
  assert.equal(res.body.status, "bestaetigt");
  // Kein guests-Feld oder leeres Array – der Slot darf nicht crashen.
  assert.equal(
    res.body.guests === undefined || res.body.guests.length === 0,
    true
  );

  // Tabelle booking_guests ist leer für diese Buchung.
  const count = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM booking_guests WHERE booking_id = $1",
    [res.body.id]
  );
  assert.equal(count.rows[0].n, 0);
});

test("POST /api/bookings mit leerem guests-Array speichert ebenfalls keine Gäste", async () => {
  const roomId = await createTestRoom("Gäste Leeres Array");

  const res = await request(app)
    .post("/api/bookings")
    .send({
      ...bookingBody(roomId, "2026-10-23T10:00:00Z", "2026-10-23T11:00:00Z"),
      guests: [],
    });

  assert.equal(res.status, 201);
  const count = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM booking_guests WHERE booking_id = $1",
    [res.body.id]
  );
  assert.equal(count.rows[0].n, 0);
});

test("POST /api/bookings lehnt ungültige Gäste mit 400 ab – keine Zeile in booking_guests", async () => {
  const roomId = await createTestRoom("Gäste Ungueltig");

  const cases: Array<Record<string, unknown>> = [
    // guests ist kein Array
    { guests: "keine-liste" },
    // Gast ohne name
    { guests: [{ email: "x@gast.example.org" }] },
    // Gast ohne email
    { guests: [{ name: "Nur Name" }] },
    // Gast mit leerem Namen
    { guests: [{ name: "   ", email: "x@gast.example.org" }] },
    // Gast mit leerer E-Mail
    { guests: [{ name: "X", email: "" }] },
    // Gast weder name noch email
    { guests: [{ foo: "bar" }] },
  ];

  const before = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM booking_guests"
  );

  for (const extra of cases) {
    const res = await request(app)
      .post("/api/bookings")
      .send({
        ...bookingBody(roomId, "2026-10-24T10:00:00Z", "2026-10-24T11:00:00Z"),
        ...extra,
      });
    assert.equal(res.status, 400, `Status für ${JSON.stringify(extra)} war nicht 400`);
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Antwort enthält keine verständliche Fehlermeldung"
    );
  }

  // Keine Buchungen und keine Gäste angelegt – alles im Transaction-Rollback.
  assert.equal(await countBookings(roomId), 0);
  const after = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM booking_guests"
  );
  assert.equal(after.rows[0].n, before.rows[0].n, "Gäste dürfen aus ungültigen Anfragen stammen");
});

test("Buchungskonflikt mit Gästen: weder Buchung noch Gäste werden persistiert", async () => {
  const roomId = await createTestRoom("Gäste Konflikt");
  // Bestehende Buchung blockiert den Zeitraum.
  await seedBooking(roomId, "2026-10-25T10:00:00Z", "2026-10-25T11:00:00Z");

  // Gäste dürfen nicht ohne die Buchung in booking_guests zurückbleiben.
  // Wir zählen VOR dem POST, um nicht von Gästen anderer Tests beeinflusst zu werden.
  const before = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM booking_guests"
  );

  const res = await request(app)
    .post("/api/bookings")
    .send({
      ...bookingBody(roomId, "2026-10-25T10:30:00Z", "2026-10-25T11:30:00Z"),
      guests: [{ name: "Frida Lang", email: "frida@gast.example.org" }],
    });

  assert.equal(res.status, 409);
  assert.match(res.body.error, /bereits gebucht/);
  // Nach einem Konflikt darf keine neue booking_guests-Zeile hinzugekommen sein –
  // weder für diesen Gast noch irgend einen anderen.
  const after = await db.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM booking_guests"
  );
  assert.equal(
    after.rows[0].n,
    before.rows[0].n,
    "Gäste ohne gültige Buchung dürfen nicht persistiert sein"
  );
});
