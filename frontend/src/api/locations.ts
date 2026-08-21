import { requestJson } from "./http.js";

/** Standort als verwaltetes Objekt (Beschluss 21.8.2026 – kein Freitext-Feld). */
export interface Location {
  id: number;
  name: string;
}

/**
 * Liest die Standort-Liste für Auswahlfelder. Standorte sind zwar verwaltete
 * Objekte; dieses Ticket braucht aber nur den Lesepfad – Anlegen/Ändern
 * bleibt bei der bestehenden API.
 */
export function listLocations(): Promise<Location[]> {
  return requestJson<Location[]>("/api/locations");
}
