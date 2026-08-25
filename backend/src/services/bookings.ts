import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { getConfig } from "./config.js";
import {
  ConflictError,
  DomainNotFoundError,
  ValidationError,
} from "./errors.js";

/**
 * Buchungen: anlegen mit Konfliktprüfung (Anforderung 1) und Check-in der
 * aktuell laufenden Buchung (Anforderung 2).
 *
 * Der Urheber wird solange als Text geführt, bis die SSO-/Login-Klärung beim
 * Kunden abgeschlossen ist (siehe Migration 003). Den Anfangsstatus leitet
 * die Service-Schicht beim Anlegen aus dem Genehmigungspflicht-Schalter des
 * Raums ab (Anforderung 13): 'ausstehend' im pflichtigen Raum, sonst wie
 * bisher 'bestaetigt'. Die weitere Bearbeitung (genehmigt/abgelehnt)
 * übernimmt das Genehmigungsworkflow-Ticket.
 */

/** Eine gespeicherte Buchung in der API-Form (Zeiten als ISO-8601-UTC-Text). */
export interface Booking {
  id: number;
  roomId: number;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  status: string;
  /**
   * No-Show-Frist in Minuten, die für diese Buchung gilt (aus der
   * System-Konfiguration): Das Check-in-Fenster im Frontend endet spätestens
   * `StartsAt + noShowAfterMinutes`. Wird pro Buchung mitgeliefert, damit das
   * Frontend ohne separates Config-Request die Frist kennt.
   */
  noShowAfterMinutes: number;
}

/** Rohe Eingabefelder einer Buchung, wie sie der Client sendet. */
export interface BookingInput {
  roomId?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  createdBy?: unknown;
}

/** Alles, was SQL ausführen kann: der Pool oder ein Transaktions-Client. */
export interface SqlExecutor {
  query(
    sql: string,
    values?: unknown[]
  ): Promise<{ rows: any[]; rowCount: number | null }>;
}

/** Rohzeile aus der Datenbank (Zeiten kommen als Date bzw. datumsähnlicher Text). */
interface BookingRow {
  id: number;
  roomId: number;
  createdBy: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
}

const BOOKING_SELECT = `
  SELECT id::int AS id,
         room_id::int AS "roomId",
         created_by AS "createdBy",
         starts_at AS "startsAt",
         ends_at AS "endsAt",
         status
  FROM bookings`;

/** Liefert die System-Konfiguration (No-Show-Frist) für eine Booking-Antwort. */
function noShowFrist(): number {
  return getConfig().noShowAfterMinutes;
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    roomId: row.roomId,
    createdBy: row.createdBy,
    startsAt: new Date(row.startsAt).toISOString(),
    endsAt: new Date(row.endsAt).toISOString(),
    status: row.status,
    noShowAfterMinutes: noShowFrist(),
  };
}

/**
 * Liest den Tag aus einem „YYYY-MM-DD"-String als UTC-Intervall [Tagbeginn,
 * nächste-Mitternacht). Andere Formen (leer, „kein Datum", mit Uhrzeit)
 * gelten wie in der Raum-ID-Prüfung als nicht gefunden – der Kalender zeigt
 * dann schlicht nichts, statt einen Serverfehler zu riskieren.
 */
function parseDay(rawDate: string): { from: Date; until: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate);
  if (match === null) return null;
  const from = new Date(`${rawDate}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime())) return null;
  const until = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, until };
}

/**
 * Listet die Buchungen eines Raums auf, optional auf einen Tag begrenzt.
 *
 * Grundlage der Kalenderansicht je Raum (Anforderung 1) und später der
 * Tagesansicht je Standort sowie des iCal-Abos: Der Client bekommt alle
 * Buchungen mit Start-/Endzeit, Urheber und Status, sortiert nach Beginn.
 * Ohne `date` liefert die Funktion ALLE Buchungen des Raums – die Ansichten
 * filtern clientseitig auf ihren dargestellten Tag, damit ein Datumswechsel
 * ohne erneuten Request möglich ist.
 */
export async function listBookingsForRoom(
  roomId: number,
  date?: string
): Promise<Booking[]> {
  const conditions = ["room_id = $1"];
  const values: unknown[] = [roomId];
  if (date !== undefined) {
    const day = parseDay(date);
    if (day === null) return [];
    values.push(day.from.toISOString(), day.until.toISOString());
    // Parameterplatzhalter je gebundenem Wert ($n) – ohne Dollarzeichen wird
    // aus dem Platzhalter eine Zahlkonstante und die Abfrage ist unbrauchbar
    // („cannot cast type integer to timestamp with time zone").
    const bisPlatzhalter = "$" + values.length;
    const vonPlatzhalter = "$" + (values.length - 1);
    conditions.push(
      "starts_at < " + bisPlatzhalter + "::timestamptz",
      "ends_at > " + vonPlatzhalter + "::timestamptz"
    );
  }

  // Existenz zuerst klären: Eine unbekannte Raum-ID ist „nicht gefunden"
  // (404, dieselbe Wertung wie getRoom) und keine stille leere Liste – sonst
  // zeigte der Kalender einen gelöschten Raum als frei an.
  const existing = await pool.query("SELECT 1 FROM rooms WHERE id = $1", [
    roomId,
  ]);
  if ((existing.rowCount ?? 0) === 0) {
    throw new DomainNotFoundError("Raum nicht gefunden.");
  }

  const { rows } = await pool.query(
    `${BOOKING_SELECT}
     WHERE ${conditions.join(" AND ")}
     ORDER BY starts_at`,
    values
  );
  return rows.map((row) => toBooking(row as BookingRow));
}

function validateRoomId(raw: unknown): number {
  // Auch null explizit abweisen: Number(null) wäre 0 und fiele durch den
  // Ganzzahl-Test nur scheinbar hindurch.
  const value = raw === null || raw === undefined ? NaN : Number(raw);
  if (!Number.isInteger(value)) {
    throw new ValidationError("Eine Buchung benötigt einen Raum (roomId).");
  }
  return value;
}

function validateTimestamp(raw: unknown, label: string): Date {
  if (typeof raw !== "string" && !(raw instanceof Date)) {
    throw new ValidationError(`Eine Buchung benötigt eine gültige ${label}.`);
  }
  const value = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw new ValidationError(`Die ${label} ist kein gültiges Datum.`);
  }
  return value;
}

function validateCreatedBy(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError(
      "Eine Buchung benötigt einen Urheber (createdBy), z. B. die E-Mail-Adresse des Buchenden."
    );
  }
  return raw.trim();
}

/**
 * Findet bestehende Buchungen desselben Raums, die den Zeitraum schneiden.
 *
 * Überschneidung als halboffenes Intervall: Eine bestehende Buchung kollidiert
 * genau dann, wenn ihr Beginn vor dem neuen Ende UND ihr Ende nach dem neuen
 * Beginn liegt. Dadurch sind direkt aneinander angrenzende Buchungen
 * (Ende == Beginn) automatisch zulässig, ohne Sonderfall im Code.
 *
 * Eigenständige Funktion statt inline im Speicherpfad: Wiederkehrende Buchungen
 * (Anforderung 6) rufen sie später je Serientermin innerhalb derselben
 * Transaktion auf.
 *
 * `db` ist bewusst ein Parameter (Pool oder Transaktions-Client): Innerhalb
 * einer offenen Transaktion muss die Prüfung denselben Client nutzen wie das
 * anschließende INSERT, damit beide dieselbe Sicht auf die Daten haben.
 */
export async function findOverlappingBookings(
  db: SqlExecutor,
  roomId: number,
  startsAt: Date,
  endsAt: Date
): Promise<Booking[]> {
  const { rows } = await db.query(
    `${BOOKING_SELECT}
     WHERE room_id = $1
       AND starts_at < $3::timestamptz
       AND ends_at > $2::timestamptz
     ORDER BY starts_at`,
    [roomId, startsAt.toISOString(), endsAt.toISOString()]
  );
  return rows.map((row) => toBooking(row as BookingRow));
}

/**
 * Legt eine Buchung an (Anforderung 1).
 *
 * Ablauf in einer Transaktion:
 * 1. Pflichtfelder prüfen (Raum, Start, Ende, Urheber); Ende muss strikt nach
 *    Anfang liegen – eine leere Dauer ist keine Buchung.
 * 2. Raumzeile sperren (`SELECT ... FOR UPDATE`): Zwei gleichzeitig
 *    abgesendete Buchungen desselben Raums serialisieren sich an dieser
 *    Sperre – der zweite Aufruf führt seine Überschneidungsprüfung erst nach
 *    dem Commit des ersten aus und sieht dessen Buchung, sodass genau eine
 *    der beiden erfolgreich ist und die andere mit 409 abgelehnt wird.
 * 3. Überschneidungsprüfung (siehe findOverlappingBookings); ein Treffer wird
 *    mit ConflictError (HTTP 409) und verständlicher Meldung abgelehnt. Die
 *    Prüfung wertet den Status bewusst nicht aus: Jede Buchungszeile – auch
 *    eine ausstehende – belegt den Zeitraum (Anforderung 13).
 * 4. INSERT mit Urheber; der Status ergibt sich aus dem Genehmigungs-
 *    pflicht-Schalter des Raums (Schritt 2): 'ausstehend' bei Pflicht, sonst
 *    'bestaetigt'.
 *
 * Wirft ValidationError (HTTP 400) bei ungültigen Feldern und auch dann, wenn
 * der Raum nicht existiert – das ist ein Validierungsfehler des Clients, kein
 * fehlendes Objekt (dieselbe Wertung wie beim Standort-Check in createRoom).
 */
export async function createBooking(input: BookingInput): Promise<Booking> {
  const roomId = validateRoomId(input.roomId);
  const startsAt = validateTimestamp(input.startsAt, "Startzeit");
  const endsAt = validateTimestamp(input.endsAt, "Endzeit");
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new ValidationError("Die Endzeit muss nach der Startzeit liegen.");
  }
  const createdBy = validateCreatedBy(input.createdBy);

  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    // Schritt 2: Sperre auf die Raumzeile (s. Kommentar oben). Der Schalter
    // wird im selben gesperrten Lesevorgang mitgelesen – die Status-Ableitung
    // sieht also garantiert den Wert, zu dem die Sperre gehört.
    const room = await client.query<{ requiresApproval: boolean }>(
      "SELECT requires_approval AS \"requiresApproval\" FROM rooms WHERE id = $1 FOR UPDATE",
      [roomId]
    );
    if ((room.rowCount ?? 0) === 0) {
      throw new ValidationError("Der angegebene Raum existiert nicht.");
    }
    const requiresApproval = room.rows[0].requiresApproval;

    // Schritt 3: Kollisionen fachlich prüfen, bevor geschrieben wird.
    const overlaps = await findOverlappingBookings(client, roomId, startsAt, endsAt);
    if (overlaps.length > 0) {
      throw new ConflictError(
        "Der Raum ist im gewählten Zeitraum bereits gebucht."
      );
    }

    // Schritt 4: Speichern – der Anfangsstatus folgt dem Genehmigungs-
    // pflicht-Schalter des Raums (Anforderung 13): 'ausstehend' im
    // pflichtigen Raum (der Zeitraum blockiert dennoch), sonst wie bisher
    // sofort 'bestaetigt'. Der Schalter wurde in Schritt 2 unter derselben
    // Zeilensperre gelesen, die Ableitung ist also konsistent zur Prüfung.
    const status = requiresApproval ? "ausstehend" : "bestaetigt";
    const { rows } = await client.query(
      `INSERT INTO bookings (room_id, created_by, starts_at, ends_at, status)
       VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5)
       RETURNING id::int AS id,
                 room_id::int AS "roomId",
                 created_by AS "createdBy",
                 starts_at AS "startsAt",
                 ends_at AS "endsAt",
                 status`,
      [roomId, createdBy, startsAt.toISOString(), endsAt.toISOString(), status]
    );

    await client.query("COMMIT");
    return toBooking(rows[0] as BookingRow);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check-in der aktuell laufenden Buchung (Anforderung 2).
 *
 * „Laufend" heißt: `Start <= jetzt < Ende` – ein Check-in vor Beginn oder
 * nach Ende wird mit ConflictError (HTTP 409) abgelehnt; eine nicht
 * existierende Buchung mit DomainNotFoundError (HTTP 404). Nur bestätigte
 * Buchungen checken ein – ausstehende, stornierte und bereits als „nicht
 * erschienen" freigegebene bleiben draußen.
 *
 * Bereits eingecheckt ist kein Fehler, sondern idempotent: Die Buchung wird
 * unverändert zurückgegeben, damit ein zweiter Klick bzw. wiederholtes
 * Absenden den Status nicht verschlechtern kann.
 *
 * `now` ist bewusst injizierbar (Default `new Date()`): Tests legen laufende
 * Buchungen relativ zur aktuellen Zeit an und die spätere No-Show-Freigabe
 * (Anforderung 1) prüft dieselbe Lauf-Bedingung gegen denselben Parameter.
 */
export async function checkIn(
  bookingId: number,
  now: Date = new Date()
): Promise<Booking> {
  const { rows } = await pool.query(`${BOOKING_SELECT} WHERE id = $1`, [
    bookingId,
  ]);
  if (rows.length === 0) {
    throw new DomainNotFoundError("Buchung nicht gefunden.");
  }
  const booking = toBooking(rows[0] as BookingRow);

  if (booking.status === "eingecheckt") {
    return booking;
  }

  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);
  if (booking.status !== "bestaetigt") {
    throw new ConflictError(
      "Nur bestätigte Buchungen können eingecheckt werden."
    );
  }
  const running = startsAt.getTime() <= now.getTime() && now < endsAt;
  if (!running) {
    throw new ConflictError(
      "Die Buchung läuft derzeit nicht – ein Check-in ist nur während des gebuchten Zeitraums möglich."
    );
  }

  // Platzhalter je gebundenem Wert ($n), damit echte Postgres die Abfrage
  // binden kann – Literale statt Platzhalter brechen dort mit Bind-Fehler.
  await pool.query(`UPDATE bookings SET status = 'eingecheckt' WHERE id = $1`, [
    bookingId,
  ]);

  return { ...booking, status: "eingecheckt" };
}
