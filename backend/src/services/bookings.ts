import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { ConflictError, ValidationError } from "./errors.js";

/**
 * Buchungen: anlegen mit Konfliktprüfung (Anforderung 1).
 *
 * Der Urheber wird solange als Text geführt, bis die SSO-/Login-Klärung beim
 * Kunden abgeschlossen ist (siehe Migration 003). Den Status setzt die
 * Datenbank auf den Default 'bestaetigt' – sobald der Genehmigungsworkflow
 * kommt, vergibt die Service-Schicht ihn je Raum (Anforderung 7).
 */

/** Eine gespeicherte Buchung in der API-Form (Zeiten als ISO-8601-UTC-Text). */
export interface Booking {
  id: number;
  roomId: number;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  status: string;
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

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    roomId: row.roomId,
    createdBy: row.createdBy,
    startsAt: new Date(row.startsAt).toISOString(),
    endsAt: new Date(row.endsAt).toISOString(),
    status: row.status,
  };
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
 *    mit ConflictError (HTTP 409) und verständlicher Meldung abgelehnt.
 * 4. INSERT mit Urheber; Status kommt aus dem Spalten-Default 'bestaetigt'.
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

    // Schritt 2: Sperre auf die Raumzeile (s. Kommentar oben).
    const room = await client.query(
      "SELECT 1 FROM rooms WHERE id = $1 FOR UPDATE",
      [roomId]
    );
    if ((room.rowCount ?? 0) === 0) {
      throw new ValidationError("Der angegebene Raum existiert nicht.");
    }

    // Schritt 3: Kollisionen fachlich prüfen, bevor geschrieben wird.
    const overlaps = await findOverlappingBookings(client, roomId, startsAt, endsAt);
    if (overlaps.length > 0) {
      throw new ConflictError(
        "Der Raum ist im gewählten Zeitraum bereits gebucht."
      );
    }

    // Schritt 4: Speichern – der Status bleibt beim Spalten-Default.
    const { rows } = await client.query(
      `INSERT INTO bookings (room_id, created_by, starts_at, ends_at)
       VALUES ($1, $2, $3::timestamptz, $4::timestamptz)
       RETURNING id::int AS id,
                 room_id::int AS "roomId",
                 created_by AS "createdBy",
                 starts_at AS "startsAt",
                 ends_at AS "endsAt",
                 status`,
      [roomId, createdBy, startsAt.toISOString(), endsAt.toISOString()]
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
