import { requestJson } from "./http.js";

/**
 * API-Client für das Buchungswesen – ausschließlich relative /api-Pfade
 * (der Browser kennt nur den veröffentlichten Ursprung; der Vite-/Container-
 * Proxy reicht /api an das Backend im Compose-Netz weiter, siehe
 * no-service-name-literals.test.ts). Die Typen spiegeln die API-Form aus
 * backend/src/services/bookings.ts.
 */

/**
 * Ein Gast einer Buchung (Anforderung „Buchung für Gäste ohne eigenen
 * Account"): keine Nutzer*in, kein Login – nur Erfassungsangaben des
 * Buchenden. Vertragsform gemäß Design-Konzept „Gäste-Erfassung im
 * BookingForm → API und Datenmodell".
 */
export interface Guest {
  id: number;
  name: string;
  email: string;
}

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
   * Erfasste Gäste der Buchung – LEER oder abwesend, wenn die Buchung ohne
   * Gäste angelegt wurde (der Normalfall; Anzeige wird dann ausgeblendet).
   * Solange das Backend das Feld noch nicht ausliefert (Migration 004 mit
   * Tabelle booking_guests steht aus), bleibt es undefined – die Ansichten
   * behandeln beide Fälle identisch.
   */
  guests?: Guest[];
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
  /**
   * Gäste ohne eigenen Account (Anforderung „Buchung für Gäste ohne eigenen
   * Account"), Vertragsform gemäß Konzept „API und Datenmodell":
   * `guests: [{ name, email }, …]`. Optional – der leere Fall sendet das Feld
   * bewusst NICHT mit (kein leeres Array), sodass Buchungen ohne Gäste
   * byte-identisch zum bisherigen Vertrag bleiben.
   */
  guests?: { name: string; email: string }[];
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

/**
 * Genehmigungsanfragen fuer berechtigte Rollen laden (GET
 * /api/bookings/approvals, Anforderung 10 – Genehmigungsworkflow): Liefert alle
 * Buchungen mit status = 'ausstehend', also Anfragen, die noch nicht
 * genehmigt oder abgelehnt wurden. Die Antwort ist eine Liste von
 * ApprovalBooking-Objekten in derselben Form wie GET /api/bookings; zusaetzlich
 * enthaelt jede Zeile das zugehoerige `room` (Name) und `location` (Name),
 * damit die Genehmigungsliste die wichtigsten Kontext-Felder ohne separaten
 * Request anzeigen kann.
 *
 * Die API-Funktion ist so gebaut, dass sie auch funktioniert, wenn das
 * Backend die /approvals-Route noch nicht implementiert hat – der Aufruf
 * laeut ueber den relativen /api-Pfad und liefert entweder die Liste oder
 * einen ApiError. Sobald das Backend die Route bereitstellt, ist keine
 * weitere Frontend-Anpassung noetig.
 */
export interface ApprovalBooking {
  id: number;
  roomId: number;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  status: string;
  noShowAfterMinutes: number;
  room: {
    id: number;
    name: string;
  };
  location: {
    id: number;
    name: string;
  };
}

/**
 * Laedt alle offenen Genehmigungsanfragen (Status 'ausstehend').
 * Dies ist die Vorbereitung auf die Backend-API: Die Funktion ruft
 * GET /api/bookings/approvals auf und gibt die Liste der Anfragen zurueck.
 */
export function listApprovals(): Promise<ApprovalBooking[]> {
  return requestJson<ApprovalBooking[]>("/api/bookings/approvals");
}

/**
 * Entscheidet ueber eine Genehmigungsanfrage (PATCH /api/bookings/:id/status).
 * `status` ist entweder 'approved' oder 'rejected'.
 */
export function decideBooking(
  id: number,
  status: "approved" | "rejected"
): Promise<ApprovalBooking> {
  return requestJson<ApprovalBooking>(
    `/api/bookings/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: { status } }
  );
}
