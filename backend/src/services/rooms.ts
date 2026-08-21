import { PoolClient } from "pg";
import { pool } from "../db.js";
import { DomainNotFoundError, ValidationError } from "./errors.js";
import { parseAmenityKeys, RoomAmenity, setRoomAmenities } from "./amenities.js";
import type { Location } from "./locations.js";

/**
 * Räume: anlegen, lesen (einzeln und Liste) und ändern.
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
}

/** Rohe Eingabefelder einer Änderung, wie sie der Client sendet. */
export interface RoomChangeInput {
  name?: unknown;
  locationId?: unknown;
  capacity?: unknown;
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

// Join über locations: GET /api/rooms liefert je Raum den Standort als
// eingebettetes Objekt mit (Akzeptanzkriterium des Standort-Tickets).
// Die Merkmale kommen als jsonb-Array mit (Akzeptanzkriterium dieses Tickets);
// der korrelierte Subselect sortiert sie nach Schlüssel, damit die Reihenfolge
// in der Antwort stabil ist. COALESCE: Räume ohne Merkmal liefern [] statt null.
const ROOM_WITH_LOCATION_SELECT = `
  SELECT rooms.id::int AS id,
         rooms.name AS name,
         rooms.location_id::int AS "locationId",
         rooms.capacity,
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object('key', a.key, 'label', a.label) ORDER BY a.key)
            FROM room_amenities ra
            JOIN amenities a ON a.id = ra.amenity_id
            WHERE ra.room_id = rooms.id),
           '[]'::jsonb
         ) AS amenities,
         jsonb_build_object('id', locations.id::int, 'name', locations.name) AS location
  FROM rooms
  JOIN locations ON locations.id = rooms.location_id`;

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
 * Listet alle Räume inklusive ihres Standorts und ihrer Ausstattungsmerkmale,
 * sortiert nach Raumname.
 * (GET /api/rooms – Akzeptanzkriterium: „liefert die zugeordneten Merkmale
 * mit".)
 */
export async function listRooms(): Promise<RoomWithAmenities[]> {
  const { rows } = await pool.query<RoomWithAmenities>(
    `${ROOM_WITH_LOCATION_SELECT} ORDER BY rooms.name`
  );
  return rows;
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
  rawAmenities?: unknown
): Promise<RoomWithAmenities> {
  const name = validateName(rawName);
  const locationId = validateLocationId(rawLocationId);
  const capacity = validateCapacity(rawCapacity);
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
      `INSERT INTO rooms (name, location_id, capacity)
       VALUES ($1, $2, $3)
       RETURNING id::int AS id,
                 name,
                 location_id::int AS "locationId",
                 capacity`,
      [name, locationId, capacity]
    );
    const roomId = inserted.rows[0].id;

    if (amenityKeys !== undefined) {
      await setRoomAmenities(client, roomId, amenityKeys);
    }

    // Standort und Merkmale für die Antwort nachladen (Standort wurde soeben
    // als existierend geprüft, der Join kann also nicht leer sein).
    const { rows } = await client.query<RoomWithAmenities>(
      `${ROOM_WITH_LOCATION_SELECT} WHERE rooms.id = $1`,
      [roomId]
    );

    await client.query("COMMIT");
    return rows[0];
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
  const { rows } = await pool.query<RoomWithAmenities>(
    `${ROOM_WITH_LOCATION_SELECT} WHERE rooms.id = $1`,
    [id]
  );
  if (rows.length === 0) {
    throw new DomainNotFoundError("Raum nicht gefunden.");
  }
  return rows[0];
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

    if (assignments.length > 0) {
      values.push(id);
      await client.query(
        `UPDATE rooms SET ${assignments.join(", ")} WHERE id = ${values.length}`,
        values
      );
    }

    if (amenityKeys !== undefined) {
      await setRoomAmenities(client, id, amenityKeys);
    }

    // Nachladen mit Merkmalen und Standort, damit die Antwort den vollständigen
    // neuen Zustand abbildet (auch bei leerem PATCH unverändert).
    const { rows: full } = await client.query<RoomWithAmenities>(
      `${ROOM_WITH_LOCATION_SELECT} WHERE rooms.id = $1`,
      [id]
    );

    await client.query("COMMIT");
    return full[0];
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
