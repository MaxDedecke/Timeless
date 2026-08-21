import { pool } from "../db.js";

/** Fachfehler: Anfrage verletzt eine fachliche Regel (HTTP 400). */
export class ValidationError extends Error {}

/** Fachfehler: Objekt nicht vorhanden (HTTP 404). */
export class DomainNotFoundError extends Error {}

export interface Location {
  id: number;
  name: string;
}

/**
 * Prüft den vom Client gelieferten Namen. Ein Standort existiert nur mit
 * Namen – fehlt er oder ist er leer, wird die Anfrage abgelehnt.
 */
function validateName(name: unknown): string {
  if (typeof name !== "string" || name.trim() === "") {
    throw new ValidationError(
      "Ein Standort benötigt einen Namen, der nicht leer sein darf."
    );
  }
  return name.trim();
}

/**
 * Listet alle Standorte auf. Die Tagesansicht und der Bericht fragen später
 * dieselbe Liste; die Reihenfolge ist stabil nach Name sortiert.
 */
// pg liefert BIGINT-Werte als String (JS-Präzision jenseits 2^53). Unsere IDs
// bleiben klein, deshalb casten wir sie in der Query auf INT – das API spricht
// konsequent Zahlen.
const LOCATION_SELECT = "SELECT id::int AS id, name FROM locations";

export async function listLocations(): Promise<Location[]> {
  const { rows } = await pool.query<Location>(`${LOCATION_SELECT} ORDER BY name`);
  return rows;
}

/** Legt einen Standort an und liefert ihn mit seiner ID zurück. */
export async function createLocation(rawName: unknown): Promise<Location> {
  const name = validateName(rawName);
  const { rows } = await pool.query<Location>(
    "INSERT INTO locations (name) VALUES ($1) RETURNING id::int AS id, name",
    [name]
  );
  return rows[0];
}

/**
 * Ändert den Namen eines Standorts. Wirft NotFoundError, wenn es keinen
 * Standort mit dieser ID gibt.
 */
export async function updateLocation(id: unknown, rawName: unknown): Promise<Location> {
  const name = validateName(rawName);
  const locationId = Number(id);
  if (!Number.isInteger(locationId)) {
    throw new DomainNotFoundError("Standort nicht gefunden.");
  }

  const { rows } = await pool.query<Location>(
    "UPDATE locations SET name = $1 WHERE id = $2 RETURNING id::int AS id, name",
    [name, locationId]
  );
  if (rows.length === 0) {
    throw new DomainNotFoundError("Standort nicht gefunden.");
  }
  return rows[0];
}
