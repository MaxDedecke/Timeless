import { PoolClient } from "pg";
import { pool } from "../db.js";
import { DomainNotFoundError, ValidationError } from "./errors.js";
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

// pg liefert BIGINT-Werte als String (JS-Präzision jenseits 2^53). Unsere IDs
// bleiben klein, deshalb casten wir sie in der Query auf INT – das API spricht
// konsequent Zahlen.
const ROOM_SELECT = `
  SELECT id::int AS id,
         name,
         location_id::int AS "locationId",
         capacity
  FROM rooms`;

/** Raum inklusive des zugeordneten Standorts (für die Raumliste). */
export interface RoomWithLocation extends Room {
  location: Location;
}

// Join über locations: GET /api/rooms liefert je Raum den Standort als
// eingebettetes Objekt mit (Akzeptanzkriterium dieses Tickets).
const ROOM_WITH_LOCATION_SELECT = `
  SELECT rooms.id::int AS id,
         rooms.name AS name,
         rooms.location_id::int AS "locationId",
         rooms.capacity,
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
 * Listet alle Räume inklusive ihres Standorts, sortiert nach Raumname.
 * (GET /api/rooms – Akzeptanzkriterium: „liefert je Raum den zugeordneten
 * Standort mit".)
 */
export async function listRooms(): Promise<RoomWithLocation[]> {
  const { rows } = await pool.query<RoomWithLocation>(
    `${ROOM_WITH_LOCATION_SELECT} ORDER BY rooms.name`
  );
  return rows;
}

/**
 * Legt einen Raum an. Wirft ValidationError (400) bei Pflichtfeld-Verstößen –
 * auch dann, wenn der angegebene Standort nicht existiert; das ist ein
 * Validierungsfehler des Clients, kein fehlender Raum.
 */
export async function createRoom(
  rawName: unknown,
  rawLocationId: unknown,
  rawCapacity: unknown
): Promise<RoomWithLocation> {
  const name = validateName(rawName);
  const locationId = validateLocationId(rawLocationId);
  const capacity = validateCapacity(rawCapacity);

  // Validierung und Einfügen in einer Transaktion: Der Standort-Check ist ein
  // fachlicher Test vor dem INSERT, damit der Client eine verständliche
  // Meldung erhält statt eines rohen Datenbankfehlers (SQLSTATE 23503).
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

    // Standort-Objekt für die Antwort nachladen (Standort wurde soeben als
    // existierend geprüft, der Join kann also nicht leer sein).
    const { rows: withLocation } = await client.query<RoomWithLocation>(
      `${ROOM_WITH_LOCATION_SELECT} WHERE rooms.id = $1`,
      [inserted.rows[0].id]
    );

    await client.query("COMMIT");
    return withLocation[0];
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Liest einen einzelnen Raum; eine unbekannte ID führt zu 404. */
export async function getRoom(rawId: unknown): Promise<Room> {
  const id = parseRoomId(rawId);
  const { rows } = await pool.query<Room>(`${ROOM_SELECT} WHERE id = $1`, [id]);
  if (rows.length === 0) {
    throw new DomainNotFoundError("Raum nicht gefunden.");
  }
  return rows[0];
}

/**
 * Ändert einen Raum.
 *
 * - Modus "put": alle drei Pflichtfelder müssen geliefert werden (Ersetzen).
 * - Modus "patch": nur die übergebenen Felder werden geändert, die übrigen
 *   bleiben unverändert. Ein leeres Patch ändert nichts und liefert den
 *   unveränderten Datensatz zurück.
 *
 * Wirft DomainNotFoundError (404), wenn es keinen Raum mit dieser ID gibt,
 * und ValidationError (400) bei Pflichtfeld-Verstößen – auch dann, wenn der
 * angegebene Standort nicht existiert; das ist ein Validierungsfehler des
 * Clients, kein fehlender Raum.
 */
export async function updateRoom(
  rawId: unknown,
  raw: RoomChangeInput,
  mode: "put" | "patch"
): Promise<Room> {
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

  // Prüfung und Änderung in einer Transaktion: Der Client sieht entweder den
  // alten oder den vollständig gültigen neuen Zustand, nie etwas dazwischen.
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

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

    let rows: Room[];
    if (assignments.length === 0) {
      // Leeres PATCH: nichts zu ändern – Datensatz unverändert zurückgeben.
      // Bei unbekannter ID findet der SELECT nichts und führt unten zu 404.
      ({ rows } = await client.query<Room>(`${ROOM_SELECT} WHERE id = $1`, [
        id,
      ]));
    } else {
      values.push(id);
      ({ rows } = await client.query<Room>(
        `UPDATE rooms SET ${assignments.join(", ")} WHERE id = $${values.length}
         RETURNING id::int AS id, name, location_id::int AS "locationId", capacity`,
        values
      ));
    }

    if (rows.length === 0) {
      throw new DomainNotFoundError("Raum nicht gefunden.");
    }

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
