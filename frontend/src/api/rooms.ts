import { requestJson } from "./http.js";

/** Ausstattungsmerkmal, wie GET /api/rooms es je Raum mitliefert. */
export interface RoomAmenity {
  key: string;
  label: string;
}

/** Eingebetteter Standort eines Raums. */
export interface RoomLocation {
  id: number;
  name: string;
}

/** Raum, wie ihn die Raum-API liefert (inkl. Standort und Merkmalen). */
export interface Room {
  id: number;
  name: string;
  locationId: number;
  capacity: number;
  amenities: RoomAmenity[];
  location: RoomLocation;
}

/**
 * Pflichtfelder eines Raums. Beim Anlegen sind alle drei erforderlich; beim
 * Ändern gilt: vollständige Daten für updateRoom (PUT ersetzt), Teiländerungen
 * wären per PATCH möglich – dieses Ticket deckt das Formular-Szenario ab.
 */
export interface RoomInput {
  name: string;
  locationId: number;
  capacity: number;
  /** Optionale Merkmals-Schlüssel; fehlt das Feld, bleibt die Zuordnung unverändert. */
  amenities?: string[];
}

/** Alle Räume inklusive Standort und Merkmalen (für Liste und Filter). */
export function listRooms(): Promise<Room[]> {
  return requestJson<Room[]>("/api/rooms");
}

/**
 * Liest einen einzelnen Raum inklusive Standort und Merkmale
 * (GET /api/rooms/:id) – Vorausfüllung des Bearbeiten-Formulars. Eine
 * unbekannte oder nicht-numerische ID kommt als ApiError mit Status 404.
 */
export function getRoom(id: number): Promise<Room> {
  return requestJson<Room>(`/api/rooms/${encodeURIComponent(id)}`);
}

/** Legt einen Raum an (POST /api/rooms) und liefert den angelegten Datensatz. */
export function createRoom(data: RoomInput): Promise<Room> {
  return requestJson<Room>("/api/rooms", { method: "POST", body: data });
}

/**
 * Ersetzt einen Raum vollständig (PUT /api/rooms/:id) – Name, Standort und
 * Kapazität sind Pflichtfelder; wird `amenities` mitgeliefert, ersetzt sie
 * die komplette Merkmalszuordnung.
 */
export function updateRoom(id: number, data: RoomInput): Promise<Room> {
  return requestJson<Room>(`/api/rooms/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: data,
  });
}
