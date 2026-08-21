import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { ValidationError } from "./errors.js";

/** Alles, was SQL ausführen kann: der Pool oder ein Transaktions-Client. */
export interface Queryable {
  query(
    sql: string,
    values?: unknown[]
  ): Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface Amenity {
  id: number;
  key: string;
  label: string;
}

export interface RoomAmenity {
  key: string;
  label: string;
}

/**
 * Listet den Merkmals-Katalog auf. Zum Start ist das der feste Katalog aus
 * Migration 002 (Beschluss 21.8.2026); werden Schreib-Endpunkte nachgezogen,
 * ändert sich an dieser Abfrage nichts.
 */
export async function listAmenities(db: Queryable = pool): Promise<Amenity[]> {
  const { rows } = await db.query(
    "SELECT id::int AS id, key, label FROM amenities ORDER BY key"
  );
  return rows as Amenity[];
}

/**
 * Prüft die vom Client gelieferte Merkmalsliste und normalisiert sie auf eine
 * dublettenfreie Liste von Schlüsseln.
 *
 * - Feld nicht vorhanden (undefined): Rückgabe undefined – Zuordnungen bleiben,
 *   wie sie sind (wichtig für Teiländerungen per PATCH).
 * - Explizites null oder kein Array: abgelehnt (400).
 * - Einträge müssen nicht-leere Strings sein; Dubletten werden zusammengefasst,
 *   damit ["beamer", "beamer"] keine doppelte Zuordnung erzeugt (der
 *   zusammengesetzte Primärschlüssel wäre sonst ohnehin die letzte Instanz).
 */
export function parseAmenityKeys(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new ValidationError(
      'Ausstattungsmerkmale müssen als Liste von Schlüsseln übergeben werden, z. B. ["beamer", "whiteboard"].'
    );
  }
  const keys: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new ValidationError(
        "Jedes Ausstattungsmerkmal muss als nicht-leerer Schlüssel übergeben werden."
      );
    }
    const key = entry.trim();
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Löst Merkmals-Schlüssel in IDs auf. Beim festen Katalog gilt: Nur vorhandene
 * Schlüssel sind gültig – unbekannte Schlüssel werden mit 400 abgelehnt und
 * namentlich genannt, statt stillschweigend ignoriert zu werden (Tippfehler
 * sollen auffallen, nicht verloren gehen).
 */
export async function resolveAmenityIds(
  db: Queryable,
  keys: string[]
): Promise<number[]> {
  if (keys.length === 0) return [];
  const { rows } = await db.query(
    "SELECT id::int AS id, key FROM amenities WHERE key = ANY($1)",
    [keys]
  );
  const idByKey = new Map<string, number>(
    rows.map((row) => [row.key as string, row.id as number])
  );
  const unknown = keys.filter((key) => !idByKey.has(key));
  if (unknown.length > 0) {
    throw new ValidationError(
      `Unbekannte Ausstattungsmerkmale: ${unknown.join(", ")}`
    );
  }
  return keys
    .map((key) => idByKey.get(key))
    .filter((id): id is number => id !== undefined);
}

/**
 * Setzt die Merkmale eines Raums auf genau die übergebene Menge (Ersetzen):
 * Weggelassene Schlüssel entfernen die Zuordnung, neue kommen hinzu. Das ist
 * zugleich der Entfernungsweg per API – eine Merkmalsliste [] räumt komplett
 * ab.
 *
 * Löschen und Einfügen laufen in der Transaktion des Aufrufers (daher der
 * PoolClient): Schlägt etwas fehl, bleibt die alte Zuordnung vollständig
 * bestehen.
 */
export async function setRoomAmenities(
  db: PoolClient,
  roomId: number,
  keys: string[]
): Promise<void> {
  // Erst auflösen (wirft bei Unbekannten, bevor etwas gelöscht wurde),
  // dann ersetzen.
  const ids = await resolveAmenityIds(db, keys);
  await db.query("DELETE FROM room_amenities WHERE room_id = $1", [roomId]);
  if (ids.length > 0) {
    await db.query(
      "INSERT INTO room_amenities (room_id, amenity_id) " +
        "SELECT $1, id FROM unnest($2::int[]) AS t(id)",
      [roomId, ids]
    );
  }
}
