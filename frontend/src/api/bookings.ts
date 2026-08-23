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
}

/** Rohe Eingabefelder einer Buchung, wie sie der Client sendet. */
export interface BookingInput {
  roomId?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  createdBy?: unknown;
}

/**
 * Buchungen eines Raums laden (GET /api/bookings?roomId=…). Grundlage des
 * Raumkalenders – ohne date-Parameter liefert die API alle Buchungen des
 * Raums, die Ansicht filtert clientseitig auf ihren dargestellten Tag.
 */
export function listBookingsForRoom(roomId: number): Promise<Booking[]> {
  return requestJson<Booking[]>(
    `/api/bookings?roomId=${encodeURIComponent(roomId)}`
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
