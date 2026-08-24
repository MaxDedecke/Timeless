// @vitest-environment node
//
// Unit-Tests für den Buchungs-API-Client gegen gemocktes fetch (Muster wie
// in rooms.test.ts): Endpunkt, HTTP-Methode und – für die Tagesansicht
// entscheidend – der Client-seitige Teil des Tagesvertrags: Die Ansicht
// sendet date mit; dass das Backend ihn serverseitig auswertet, ist Sache
// der Backend-Tests (backend/test/bookings.test.ts, „GET /api/bookings?date=
// …" und „unlesbares date …").

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkInBooking,
  createBooking,
  listBookingsForRoom,
  type Booking,
} from "../../src/api/bookings.js";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const sampleBooking: Booking = {
  id: 42,
  roomId: 7,
  createdBy: "mitarbeiter@example.com",
  startsAt: "2026-08-25T09:05:00.000Z",
  endsAt: "2026-08-25T10:30:00.000Z",
  status: "bestaetigt",
  noShowAfterMinutes: 15,
};

describe("bookings API-Client", () => {
  it("listBookingsForRoom ohne date ruft GET /api/bookings?roomId= ohne date-Parameter auf", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([sampleBooking]));

    const bookings = await listBookingsForRoom(7);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/bookings?roomId=7");
    expect(init.method ?? "GET").toBe("GET");
    expect(bookings).toEqual([sampleBooking]);
  });

  it("listBookingsForRoom mit date hängt den gewählten Tag URL-kodiert an denselben Endpoint", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const bookings = await listBookingsForRoom(7, "2026-08-25");

    // Derselbe Pfad wie im Raumkalender – es kommt nur der Suchparameter
    // dazu. Genau dieser Abruf speist die Tagesansicht je Raum.
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/bookings?roomId=7&date=2026-08-25");
    expect(bookings).toEqual([]);
  });

  it("createBooking ruft POST /api/bookings mit JSON-Body auf", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sampleBooking, 201));

    const input = {
      roomId: 7,
      startsAt: "2026-08-25T09:05:00Z",
      endsAt: "2026-08-25T10:30:00Z",
      createdBy: "mitarbeiter@example.com",
    };
    const created = await createBooking(input);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/bookings");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(input);
    expect(created).toEqual(sampleBooking);
  });

  it("lehnt mit ApiError samt Status ab, wenn die API einen Fachfehler liefert", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Raum nicht gefunden." }, 404)
    );

    await expect(listBookingsForRoom(999999)).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Raum nicht gefunden.",
    });
  });

  it("checkInBooking ruft POST /api/bookings/:id/check-in ohne Body auf", async () => {
    const eingecheckt: Booking = { ...sampleBooking, status: "eingecheckt" };
    fetchMock.mockResolvedValueOnce(jsonResponse(eingecheckt, 200));

    const ergebnis = await checkInBooking(42);

    // Genau der Endpunkt aus Commit b6705376 – Methode POST, kein JSON-Body
    // (der Backend-Handler liest keine Felder aus dem Request).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/bookings/42/check-in");
    expect(init.method).toBe("POST");
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
    expect(ergebnis).toEqual(eingecheckt);
  });

  it("checkInBooking lehnt mit ApiError ab, wenn die Buchung nicht läuft (409)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error:
            "Die Buchung läuft derzeit nicht – ein Check-in ist nur während des gebuchten Zeitraums möglich.",
        },
        409
      )
    );

    await expect(checkInBooking(42)).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message:
        "Die Buchung läuft derzeit nicht – ein Check-in ist nur während des gebuchten Zeitraums möglich.",
    });
  });

  it("checkInBooking lehnt mit ApiError ab, wenn die Buchung unbekannt ist (404)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Buchung nicht gefunden." }, 404)
    );

    await expect(checkInBooking(999999)).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Buchung nicht gefunden.",
    });
  });

  it("alle Requests verwenden ausschließlich relative /api-Pfade", async () => {
    fetchMock.mockResolvedValue(jsonResponse([sampleBooking]));

    await listBookingsForRoom(7);
    await listBookingsForRoom(7, "2026-08-25");
    await createBooking({
      roomId: 7,
      startsAt: "2026-08-25T09:05:00Z",
      endsAt: "2026-08-25T10:30:00Z",
      createdBy: "mitarbeiter@example.com",
    });
    await checkInBooking(42);

    for (const url of fetchMock.mock.calls.map(([u]) => String(u))) {
      expect(url.startsWith("/api/")).toBe(true);
      expect(url).not.toMatch(/^https?:\/\//);
    }
  });
});
