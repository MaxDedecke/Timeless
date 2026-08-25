// @vitest-environment node
//
// Unit-Tests für die API-Clients gegen gemocktes fetch: Geprüft werden
// Endpunkt, HTTP-Methode und Body – nicht das Netz. Zusätzlich wird
// sichergestellt, dass ausschließlich relative /api-Pfade verwendet werden
// (kein Host, kein Compose-Servicename – siehe auch
// no-service-name-literals.test.ts für die statische Verbots-Prüfung).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../src/api/http.js";
import { createRoom, listRooms, updateRoom, type Room } from "../../src/api/rooms.js";
import { listAmenities } from "../../src/api/amenities.js";
import { listLocations } from "../../src/api/locations.js";

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

const sampleRoom: Room = {
  id: 7,
  name: "Atelier Nord",
  locationId: 3,
  capacity: 12,
  amenities: [{ key: "beamer", label: "Beamer" }],
  location: { id: 3, name: "Werkhaus" },
  requiresApproval: true,
};

describe("rooms API-Client", () => {
  it("listRooms ruft GET /api/rooms auf und liefert die geparste Liste", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([sampleRoom]));

    const rooms = await listRooms();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/rooms");
    expect(init.method ?? "GET").toBe("GET");
    expect(rooms).toEqual([sampleRoom]);
  });

  it("createRoom ruft POST /api/rooms mit JSON-Body auf", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sampleRoom, 201));

    const input = {
      name: "Atelier Nord",
      locationId: 3,
      capacity: 12,
      amenities: ["beamer"],
    };
    const created = await createRoom(input);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/rooms");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(input);
    expect(created).toEqual(sampleRoom);
  });

  it("createRoom nimmt requiresApproval unverändert in den Body auf", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sampleRoom, 201));

    await createRoom({
      name: "Atelier Nord",
      locationId: 3,
      capacity: 12,
      amenities: [],
      requiresApproval: true,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).requiresApproval).toBe(true);
  });

  it("updateRoom ruft PUT /api/rooms/:id mit Raum-ID im Pfad und JSON-Body auf", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(sampleRoom));

    const input = { name: "Atelier Nord", locationId: 4, capacity: 20 };
    const updated = await updateRoom(7, input);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/rooms/7");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual(input);
    expect(updated).toEqual(sampleRoom);
  });

  it("lehnt mit verständlicher Fehlermeldung ab, wenn die API einen Fachfehler liefert", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Der angegebene Standort existiert nicht." }, 400)
    );

    await expect(
      createRoom({ name: "x", locationId: 999, capacity: 4 })
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Der angegebene Standort existiert nicht.",
    });
  });

  it("alle Requests verwenden ausschließlich relative /api-Pfade", async () => {
    fetchMock.mockResolvedValue(jsonResponse([sampleRoom]));

    await listRooms();
    await listLocations();
    await listAmenities();

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual(["/api/rooms", "/api/locations", "/api/amenities"]);
    for (const url of urls) {
      expect(url.startsWith("/api/")).toBe(true);
      expect(url).not.toMatch(/^https?:\/\//);
    }
  });
});

describe("Katalog-Clients für Auswahlfelder", () => {
  it("listLocations liest GET /api/locations als Liste", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 3, name: "Werkhaus" }])
    );

    const locations = await listLocations();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/locations");
    expect(init.method ?? "GET").toBe("GET");
    expect(locations).toEqual([{ id: 3, name: "Werkhaus" }]);
  });

  it("listAmenities liest GET /api/amenities als Liste", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { id: 1, key: "beamer", label: "Beamer" },
        { id: 2, key: "whiteboard", label: "Whiteboard" },
      ])
    );

    const amenities = await listAmenities();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/amenities");
    expect(init.method ?? "GET").toBe("GET");
    expect(amenities).toHaveLength(2);
    expect(amenities[0]).toEqual({ id: 1, key: "beamer", label: "Beamer" });
  });

  it("ApiError trägt den HTTP-Status der Antwort", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Raum nicht gefunden." }, 404));

    let caught: unknown;
    try {
      await updateRoom(12345, { name: "x", locationId: 1, capacity: 2 });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(404);
  });
});
