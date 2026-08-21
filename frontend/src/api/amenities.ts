import { requestJson } from "./http.js";

/** Ausstattungsmerkmal aus dem festen Katalog (Beschluss 21.8.2026). */
export interface Amenity {
  id: number;
  key: string;
  label: string;
}

/**
 * Liest den Merkmals-Katalog für Auswahllisten (Filter, Raumformular).
 * Bewusst ohne Anlege-/Änderungsfunktionen: Der Katalog ist fest; eine
 * spätere Admin-Verwaltung wäre ein Nachzugs-Ticket mit eigenen Funktionen.
 */
export function listAmenities(): Promise<Amenity[]> {
  return requestJson<Amenity[]>("/api/amenities");
}
