import { PoolClient } from "pg";
import { pool } from "../db.js";
import { DomainNotFoundError, ValidationError } from "./errors.js";
import { parseAmenityKeys, RoomAmenity, setRoomAmenities } from "./amenities.js";
import type { Location } from "./locations.js";
// Derselbe Executor-Begriff wie im Buchungs-Service: Pool oder
// Transaktions-Client – für das gemeinsame Merkmals-Nachladen.
import type { SqlExecutor } from "./bookings.js";

/**
 * Räume: anlegen, lesen (einzeln und Liste), ändern und auf freie Zeiträume
 * prüfen (Anforderung 1: freie Räume für einen Wunschzeitraum).
 *
 * Pflichtfeld-Regeln (Anforderung 1):
 * - Name nicht leer,
 * - Standort muss als verwaltetes Objekt existieren (Beschluss 21.8.2026 –
 *   kein Freitext-Feld),
 * - Kapazität ganzzahlig größer 0.
 */

export interface Room {
  id: number;
  name: string;
  locationId: number;
  capacity: number;
  /**
   * Genehmigungspflicht je Raum (Anforderung 13): true bedeutet, dass neue
   * Buchungen zunächst den Status „ausstehend" erhalten (der Zeitraum wird
   * dennoch blockiert), false – der Default – bestätigt sie sofort.
   */
  requiresApproval: boolean;
}

/** Rohe Eingabefelder einer Änderung, wie sie der Client sendet. */
export interface RoomChangeInput {
  name?: unknown;
  locationId?: unknown;
  capacity?: unknown;
  /** Optionaler Schalter der Genehmigungspflicht (PATCH: fehlt = unverändert). */
  requiresApproval?: unknown;
}



/** Raum inklusive des zugeordneten Standorts (für die Raumliste). */
export interface RoomWithLocation extends Room {
  location: Location;
}

/**
 * Raum inklusive der zugeordneten Ausstattungsmerkmale. Die Merkmale kommen
 * als Liste von {key, label} mit – der Katalog-Schlüssel für die API-Nutzung,
 * das Label für die Anzeige.
 */
export interface RoomWithAmenities extends RoomWithLocation {
  amenities: RoomAmenity[];
}

/**
 * Rohe Zeile des Basis-Selects: Der Standort kommt flach (ID + Name) und wird
 * erst in TypeScript zum eingebetteten Objekt geformt – genau wie die
 * Ausstattungsmerkmale lädt bzw. formt withAmenities ihn. Bewusst KEINE
 * JSON-Funktionen im Select: Die In-Memory-DB der Vertragstests (pg-mem)
 * implementiert weder korrelierte Subqueries über Joins noch jsonb_agg oder
 * jsonb_build_object; funktional ist die TS-Form identisch.
 */
interface RoomBaseRow {
  id: number;
  name: string;
  locationId: number;
  capacity: number;
  locationName: string;
  requiresApproval: boolean;
}

// Join über locations: GET /api/rooms liefert je Raum den Standort als
// eingebettetes Objekt mit (Akzeptanzkriterium des Standort-Tickets). Die
// Merkmals-Anreicherung übernimmt withAmenities – siehe RoomBaseRow.
const ROOM_BASE_SELECT = `
  SELECT rooms.id::int AS id,
         rooms.name AS name,
         rooms.location_id::int AS "locationId",
         rooms.capacity,
         rooms.requires_approval AS "requiresApproval",
         locations.name AS "locationName"
  FROM rooms
  JOIN locations ON locations.id = rooms.location_id`;

/**
 * Formt rohe Raumzeilen in die vollständige API-Form: Standort eingebettet,
 * Ausstattungsmerkmale nachgeladen als Liste von {key, label}. Eine Abfrage
 * je Aufruf (IN-Liste) statt N korrelierter Subqueries; Räume ohne Zuordnung
 * erhalten [] statt null (Akzeptanzkriterium „liefert die zugeordneten
 * Merkmale mit", Reihenfolge stabil nach Schlüssel).
 *
 * `exec` ist der Pool oder – innerhalb einer offenen Transaktion – deren
 * Client, damit Anlegen/Ändern Lesen, INSERT und Nachladen auf derselben
 * Datenhaltung absetzen (dieselbe Wertung wie findOverlappingBookings im
 * Buchungs-Service).
 */
async function withAmenities(
  exec: SqlExecutor,
  rows: RoomBaseRow[]
): Promise<RoomWithAmenities[]> {
  if (rows.length === 0) return [];
  // IN-Liste als echte Platzhalter ($1, $2 …) zu den Werten: Literale ohne
  // $-Präfix würden die mitgegebenen Werte zählen lassen und an echter
  // Postgres mit „supplies N parameters, but prepared statement requires 0"
  // brechen (pg-mem der Vertragstests toleriert überschüssige Werte).
  const plaetze = rows
    .map((_: RoomBaseRow, i: number) => "$" + String(i + 1))
    .join(", ");
  const amenityRows = (
    await exec.query(
      `SELECT ra.room_id::int AS "roomId", a.key, a.label
       FROM room_amenities ra
       JOIN amenities a ON a.id = ra.amenity_id
       WHERE ra.room_id IN (${plaetze})
       ORDER BY ra.room_id, a.key`,
      rows.map((row) => row.id)
    )
  ).rows as Array<{ roomId: number; key: string; label: string }>;
  const byRoom = new Map<number, RoomAmenity[]>();
  for (const amenityRow of amenityRows) {
    const list = byRoom.get(amenityRow.roomId) ?? [];
    list.push({ key: amenityRow.key, label: amenityRow.label });
    byRoom.set(amenityRow.roomId, list);
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    locationId: row.locationId,
    capacity: row.capacity,
    requiresApproval: row.requiresApproval,
    amenities: byRoom.get(row.id) ?? [],
    location: { id: row.locationId, name: row.locationName },
  }));
}

function parseRoomId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id)) {
    throw new DomainNotFoundError("Raum nicht gefunden.");
  }
  return id;
}

function validateName(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new ValidationError(
      "Ein Raum benötigt einen Namen, der nicht leer sein darf."
    );
  }
  return raw.trim();
}

function validateCapacity(raw: unknown): number {
  // Auch null explizit abweisen: Number(null) wäre 0 und fiele durch den
  // Ganzzahl-Test – eine geleerte Kapazität soll aber abgelehnt werden.
  const value = raw === null ? NaN : Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new ValidationError(
      "Ein Raum benötigt eine Kapazität als ganze Zahl größer als 0."
    );
  }
  return value;
}

function validateLocationId(raw: unknown): number {
  const value = raw === null ? NaN : Number(raw);
  if (!Number.isInteger(value)) {
    throw new ValidationError("Ein Raum benötigt einen Standort.");
  }
  return value;
}

/**
 * Genehmigungspflicht-Schalter (Anforderung 13): Nur die booleschen Werte
 * true/false sind gültig – alles andere (auch Strings wie „true", Zahlen,
 * null) ist ein ValidationError. Rückgabe undefined heißt „nicht geliefert"
 * und bleibt in createRoom über den Spalten-Default false abgedeckt.
 */
function validateRequiresApproval(raw: unknown): boolean | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "boolean") {
    throw new ValidationError(
      "Die Genehmigungspflicht (requiresApproval) muss ein boolean sein."
    );
  }
  return raw;
}

/**
 * Listet alle Räume inklusive ihres Standorts und ihrer Ausstattungsmerkmale,
 * sortiert nach Raumname.
 * (GET /api/rooms – Akzeptanzkriterium: „liefert die zugeordneten Merkmale
 * mit".)
 */
export async function listRooms(): Promise<RoomWithAmenities[]> {
  const { rows } = await pool.query<RoomBaseRow>(
    `${ROOM_BASE_SELECT} ORDER BY rooms.name`
  );
  return withAmenities(pool, rows);
}

/**
 * Zeitraum-Eingabe der Verfügbarkeitssuche, wie sie der Client sendet.
 */
export interface AvailabilityInput {
  from?: unknown;
  to?: unknown;
}

/**
 * Validiert `from`/`to` der Verfügbarkeitssuche (GET /api/rooms/available).
 *
 * Dieselbe Wertung wie die Zeitfelder der Konfliktprüfung in
 * services/bookings.ts (validateTimestamp): fehlend oder unlesbar ist ein
 * ValidationError (HTTP 400). Zusätzlich wird ein leeres Intervall
 * (`from >= to`) abgelehnt – ein solcher Zeitraum kann keinen Raum frei
 * haben, und eine Antwort ohne Aussagekraft wäre irreführend.
 *
 * Dieselbe Fehlerklasse wie beim Buchen (die Raumsuche und die Konflikt-
 * prüfung teilen sich dieselbe Zeit-Semantik), aber eigener Wortlaut, der
 * die Parameter der Suche beim Namen nennt.
 */
function validateAvailabilityInterval(
  raw: AvailabilityInput
): { from: Date; to: Date } {
  const from = parseAvailabilityBound(raw.from, "Startzeit (from)");
  const to = parseAvailabilityBound(raw.to, "Endzeit (to)");
  if (to.getTime() <= from.getTime()) {
    throw new ValidationError(
      "Die Endzeit (to) muss nach der Startzeit (from) liegen."
    );
  }
  return { from, to };
}

/**
 * Ein Zeitgrenzen-Wert der Suche: String oder Date, in ein gültiges Datum
 * auflösbar – sonst ValidationError mit suchspezifischer Meldung.
 */
function parseAvailabilityBound(raw: unknown, label: string): Date {
  if (typeof raw !== "string" && !(raw instanceof Date)) {
    throw new ValidationError(`Die Raumsuche benötigt eine gültige ${label}.`);
  }
  const value = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw new ValidationError(
      `Die ${label} der Raumsuche ist kein gültiges Datum.`
    );
  }
  return value;
}

/**
 * Listet die Räume, die im halboffenen Intervall [from, to) keine
 * überschneidende Buchung haben (Anforderung 1: freie Räume ermitteln).
 *
 * Überschneidung mit derselben Semantik wie findOverlappingBookings in
 * services/bookings.ts: Eine bestehende Buchung kollidiert genau dann, wenn
 * ihr Beginn vor dem Intervall-Ende UND ihr Ende nach dem Intervall-Beginn
 * liegt. Back-to-back (Buchung endet exakt bei `from` oder beginnt exakt bei
 * `to`) kollidiert dadurch nicht – der Raum bleibt gelistet.
 *
 * Umsetzung als Anti-Join (LEFT JOIN bookings … WHERE b.id IS NULL): Ein
 * Raum ohne Kollision bleibt stehen, ein Raum mit mindestens einer
 * kollidierenden Buchung fällt heraus – unabhängig vom Status der Buchung,
 * denn ein ausstehender Zeitraum blockiert ebenfalls (Anforderung 4).
 *
 * Antwortform = Raumliste (ROOM_WITH_LOCATION_SELECT): dieselbe Darstellung
 * wie GET /api/rooms, damit die Raumsuche dieselben Felder anbietet. Die
 * Merkmale kommen hier als separate Abfrage je Raum (IN-Liste) statt als
 * korrelierte Subquery – funktional identisch, aber von der In-Memory-DB der
 * Vertragstests (pg-mem) ausführbar, die korrelierte Subqueries über Joins
 * nicht trägt.
 *
 * Wirft ValidationError (HTTP 400) bei fehlenden/unlesbaren Zeitangaben und
 * bei `to <= from`.
 */

/** Rohe Zeile des Verfügbarkeits-Selects vor der Merkmals-Zusammenführung. */
interface AvailableRoomRow {
  id: number;
  name: string;
  locationId: number;
  capacity: number;
  locationName: string;
}

export async function listAvailableRooms(
  input: AvailabilityInput
): Promise<RoomWithAmenities[]> {
  const { from, to } = validateAvailabilityInterval(input);

  // Dieselbe Raumform wie die Raumliste – die Anreicherung (Standort
  // eingebettet, Merkmale) läuft über denselben gemeinsamen Helfer
  // (withAmenities), statt die Logik an zwei Stellen zu pflegen.
  const { rows } = await pool.query<RoomBaseRow>(
    `SELECT r.id::int AS id,
            r.name AS name,
            r.location_id::int AS "locationId",
            r.capacity,
            r.requires_approval AS "requiresApproval",
            l.name AS "locationName"
     FROM rooms r
     JOIN locations l ON l.id = r.location_id
     LEFT JOIN bookings b
       ON b.room_id = r.id
      AND b.starts_at < $2::timestamptz
      AND b.ends_at > $1::timestamptz
     WHERE b.id IS NULL
     ORDER BY r.name`,
    [from.toISOString(), to.toISOString()]
  );
  return withAmenities(pool, rows);
}

/**
 * Legt einen Raum an – optional bereits mit Ausstattungsmerkmalen.
 *
 * Wirft ValidationError (400) bei Pflichtfeld-Verstößen, bei unbekannten
 * Merkmals-Schlüsseln und auch dann, wenn der angegebene Standort nicht
 * existiert; das ist ein Validierungsfehler des Clients, kein fehlender Raum.
 */
export async function createRoom(
  rawName: unknown,
  rawLocationId: unknown,
  rawCapacity: unknown,
  rawAmenities?: unknown,
  rawRequiresApproval?: unknown
): Promise<RoomWithAmenities> {
  const name = validateName(rawName);
  const locationId = validateLocationId(rawLocationId);
  const capacity = validateCapacity(rawCapacity);
  const requiresApproval =
    validateRequiresApproval(rawRequiresApproval) ?? false;
  const amenityKeys = parseAmenityKeys(rawAmenities);

  // Validierung und Einfügen in einer Transaktion: Der Standort-Check ist ein
  // fachlicher Test vor dem INSERT, damit der Client eine verständliche
  // Meldung erhält statt eines rohen Datenbankfehlers (SQLSTATE 23503).
  // resolveAmenityIds läuft innerhalb derselben Transaktion und wirft bei
  // unbekannten Schlüsseln, bevor etwas geschrieben wurde.
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rowCount } = await client.query("SELECT 1 FROM locations WHERE id = $1", [
      locationId,
    ]);
    if (rowCount === 0) {
      throw new ValidationError("Der angegebene Standort existiert nicht.");
    }

    const inserted = await client.query<{ id: number }>(
      `INSERT INTO rooms (name, location_id, capacity, requires_approval)
       VALUES ($1, $2, $3, $4)
       RETURNING id::int AS id,
                 name,
                 location_id::int AS "locationId",
                 capacity,
                 requires_approval AS "requiresApproval"`,
      [name, locationId, capacity, requiresApproval]
    );
    const roomId = inserted.rows[0].id;

    if (amenityKeys !== undefined) {
      await setRoomAmenities(client, roomId, amenityKeys);
    }

    // Standort und Merkmale für die Antwort nachladen (Standort wurde soeben
    // als existierend geprüft, der Join kann also nicht leer sein). Das
    // Merkmals-Nachladen läuft auf demselben Transaktions-Client.
    const { rows } = await client.query<RoomBaseRow>(
      `${ROOM_BASE_SELECT} WHERE rooms.id = $1`,
      [roomId]
    );
    const vollständigeZeile = (await withAmenities(client, rows))[0];

    await client.query("COMMIT");
    return vollständigeZeile;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Liest einen einzelnen Raum inklusive Standort und Merkmale; eine unbekannte
 * ID führt zu 404. (Raumdetail-Pfad des Akzeptanzkriteriums „liefert die
 * zugeordneten Merkmale mit".)
 */
export async function getRoom(rawId: unknown): Promise<RoomWithAmenities> {
  const id = parseRoomId(rawId);
  const { rows } = await pool.query<RoomBaseRow>(
    `${ROOM_BASE_SELECT} WHERE rooms.id = $1`,
    [id]
  );
  if (rows.length === 0) {
    throw new DomainNotFoundError("Raum nicht gefunden.");
  }
  return (await withAmenities(pool, rows))[0];
}

/**
 * Ändert einen Raum.
 *
 * - Modus "put": alle drei Pflichtfelder müssen geliefert werden (Ersetzen);
 *   amenities ist optional – wird es geliefert, ersetzt es die komplette
 *   Zuordnung.
 * - Modus "patch": nur die übergebenen Felder werden geändert, die übrigen
 *   bleiben unverändert (auch die Merkmale, solange "amenities" fehlt). Ein
 *   leeres Patch ändert nichts und liefert den unveränderten Datensatz zurück.
 *
 * Wirft DomainNotFoundError (404), wenn es keinen Raum mit dieser ID gibt,
 * und ValidationError (400) bei Pflichtfeld-Verstößen oder unbekannten
 * Merkmals-Schlüsseln – auch dann, wenn der angegebene Standort nicht
 * existiert; das ist ein Validierungsfehler des Clients, kein fehlender Raum.
 */
export async function updateRoom(
  rawId: unknown,
  raw: RoomChangeInput & { amenities?: unknown },
  mode: "put" | "patch"
): Promise<RoomWithAmenities> {
  const id = parseRoomId(rawId);

  const requireAllFields = mode === "put";
  const name =
    requireAllFields || raw.name !== undefined
      ? validateName(raw.name)
      : undefined;
  const locationId =
    requireAllFields || raw.locationId !== undefined
      ? validateLocationId(raw.locationId)
      : undefined;
  const capacity =
    requireAllFields || raw.capacity !== undefined
      ? validateCapacity(raw.capacity)
      : undefined;
  const requiresApproval =
    requireAllFields || raw.requiresApproval !== undefined
      ? validateRequiresApproval(raw.requiresApproval)
      : undefined;
  // Merkmale sind bei PUT wie PATCH optional: fehlt das Feld, bleibt die
  // bestehende Zuordnung unverändert; geliefert wird sie komplett ersetzt
  // (auch durch [], was alle Merkmale entfernt).
  const amenityKeys = parseAmenityKeys(raw.amenities);

  // Prüfung und Änderung in einer Transaktion: Der Client sieht entweder den
  // alten oder den vollständig gültigen neuen Zustand, nie etwas dazwischen.
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    // Existenz zuerst klären: Ein leeres PATCH oder eine reine Merkmals-Änderung
    // auf unbekannter ID muss 404 liefern, bevor irgendetwas geschrieben wird.
    const existing = await client.query("SELECT 1 FROM rooms WHERE id = $1", [id]);
    if ((existing.rowCount ?? 0) === 0) {
      throw new DomainNotFoundError("Raum nicht gefunden.");
    }

    // Fremdschlüssel fachlich prüfen, damit der Client eine verständliche
    // Meldung erhält statt eines rohen Datenbankfehlers (SQLSTATE 23503).
    if (locationId !== undefined) {
      const { rowCount } = await client.query(
        "SELECT 1 FROM locations WHERE id = $1",
        [locationId]
      );
      if (rowCount === 0) {
        throw new ValidationError("Der angegebene Standort existiert nicht.");
      }
    }

    // Dynamisches SET: nur die tatsächlich übergebenen Felder.
    const assignments: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) {
      values.push(name);
      assignments.push(`name = $${values.length}`);
    }
    if (locationId !== undefined) {
      values.push(locationId);
      assignments.push(`location_id = $${values.length}`);
    }
    if (capacity !== undefined) {
      values.push(capacity);
      assignments.push(`capacity = $${values.length}`);
    }
    if (requiresApproval !== undefined) {
      values.push(requiresApproval);
      assignments.push(`requires_approval = $${values.length}`);
    }

    if (assignments.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE rooms SET ${assignments.join(", ")} WHERE id = $${values.length}`,
        values
      );
    }

    if (amenityKeys !== undefined) {
      await setRoomAmenities(client, id, amenityKeys);
    }

    // Nachladen mit Merkmalen und Standort, damit die Antwort den vollständigen
    // neuen Zustand abbildet (auch bei leerem PATCH unverändert). Auch hier
    // läuft das Merkmals-Nachladen auf demselben Transaktions-Client.
    const { rows: full } = await client.query<RoomBaseRow>(
      `${ROOM_BASE_SELECT} WHERE rooms.id = $1`,
      [id]
    );
    const vollständigeZeile = (await withAmenities(client, full))[0];

    await client.query("COMMIT");
    return vollständigeZeile;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
