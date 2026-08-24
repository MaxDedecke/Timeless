import { requestJson } from "./http.js";

/**
 * API-Client für das Buchungswesen – ausschließlich relative /api-Pfade
 * (der Browser kennt nur den veröffentlichten Ursprung; der Vite-/Container-
 * Proxy reicht /api an das Backend im Compose-Netz weiter, siehe
 * no-service-name-literals.test.ts). Die Typen spiegeln die API-Form aus
 * backend/src/services/bookings.ts.
 */

/** Eine gespeicherte Buchung in der API-Form (Zeiten als ISO-8601-UTC-Text). */
export interface Booking {
  id: number;
  roomId: number;
  createdBy: string;
  /** ISO-Zeitstempel (UTC), z. B. „2026-08-23T09:05:00.000Z". */
  startsAt: string;
  endsAt: string;
  /** Datenbank-Textwert, z. B. „bestaetigt" – Mapping via BookingStatusBadge. */
  status: string;
  /**
   * No-Show-Frist in Minuten, die für diese Buchung gilt (aus der
   * System-Konfiguration): Das Check-in-Fenster im Frontend endet spätestens
   * `startsAt + noShowAfterMinutes`. Wird pro Buchung mitgeliefert, damit das
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

/**
 * Buchungen eines Raums laden (GET /api/bookings?roomId=…) – Grundlage von
 * Raumkalender UND Tagesansicht. Zwei Abrufformen mit klar getrennten
 * Verträgen:
 *
 * – Ohne date liefert die API ALLE Buchungen des Raums; der Raumkalender
 *   ruft so ab und filtert clientseitig auf seinen dargestellten Tag
 *   (buchungenAmTag in pages/RoomCalendar.tsx).
 *
 * – Mit date („YYYY-MM-DD“) filtert das Backend SERVERSEITIG auf die
 *   Buchungen, die diesen Tag schneiden (halboffenes Intervall; ein
 *   unlesbares date ergibt eine leere Liste). Umsetzung:
 *   listBookingsForRoom in backend/src/services/bookings.ts, Handler in
 *   backend/src/routes/bookings.ts, Vertragstests in
 *   backend/test/bookings.test.ts. Die Tagesansicht nutzt diese Form, um
 *   je Raum genau den gewählten Tag zu laden.
 */
export function listBookingsForRoom(
  roomId: number,
  date?: string
): Promise<Booking[]> {
  const tag = date === undefined ? "" : `&date=${encodeURIComponent(date)}`;
  return requestJson<Booking[]>(
    `/api/bookings?roomId=${encodeURIComponent(roomId)}${tag}`
  );
}

/**
 * Legt eine Buchung an (POST /api/bookings). Das Backend prüft Pflichtfelder,
 * Raumexistenz und Überschneidungen; ein Konflikt kommt als ApiError mit
 * Status 409 und der Backend-Meldung zurück.
 */
export function createBooking(input: BookingInput): Promise<Booking> {
  return requestJson<Booking>("/api/bookings", { method: "POST", body: input });
}

/**
 * Check-in der aktuell laufenden Buchung (Anforderung „Check-in für laufende
 * Buchung“; Endpunkt aus Commit b6705376). Erfolg liefert die aktualisierte
 * Buchung mit Status „eingecheckt“ (HTTP 200) – auch ein zweiter Check-in ist
 * idempotent und antwortet erneut mit dem unveränderten Datensatz. Fehler als
 * ApiError: 404 (unbekannte Buchung), 409 (läuft nicht / nicht bestätigt),
 * 400 (Validierung).
 */
export function checkInBooking(id: number): Promise<Booking> {
  return requestJson<Booking>(`/api/bookings/${encodeURIComponent(id)}/check-in`, {
    method: "POST",
  });
}
