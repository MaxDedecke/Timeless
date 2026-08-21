import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import RoomList from "../src/pages/RoomList";

/**
 * Raumliste: alle vier Zustände (lädt, Daten, leer, Fehler) sind erkennbar
 * gestaltet und werden hier je durch einen Test abgesichert. Das Backend wird
 * über global.fetch gemockt; der Pfad-Test stellt sicher, dass ausschließlich
 * relative /api-Pfade aufgerufen werden (keine Compose-Servicenamen).
 */

const ROOMS = [
  {
    id: 1,
    name: "Atelier Nord",
    locationId: 7,
    capacity: 12,
    amenities: [
      { key: "beamer", label: "Beamer" },
      { key: "videokonferenz", label: "Videokonferenz" },
    ],
    location: { id: 7, name: "Werkhaus" },
  },
  {
    id: 2,
    name: "Kreativraum Süd",
    locationId: 9,
    capacity: 4,
    amenities: [],
    location: { id: 9, name: "Loft" },
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchOk(rooms: typeof ROOMS) {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    expect(url).toBe("/api/rooms"); // relativer Pfad, kein Host
    return jsonResponse(rooms);
  });
}

function fetchFail() {
  return vi.fn(async (_input: RequestInfo | URL): Promise<Response> => {
    throw new Error("Netzwerk weg");
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RoomList – Zustände", () => {
  it("zeigt Skeleton beim Laden", async () => {
    let resolveFetch!: (value: Response) => void;
    global.fetch = vi.fn(
      (_input: RequestInfo | URL): Promise<Response> =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    render(<RoomList />);
    // Lade-Skelett in Kartenform ist sichtbar, noch keine Raumdaten.
    expect(screen.getByTestId("rooms-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("room-card")).not.toBeInTheDocument();
    resolveFetch(jsonResponse(ROOMS));
    await screen.findByTestId("rooms-grid");
  });

  it("ruft /api/rooms relativ ab und zeigt Name, Standort, Kapazität und Ausstattung", async () => {
    global.fetch = fetchOk(ROOMS);
    render(<RoomList />);

    const grid = await screen.findByTestId("rooms-grid");
    const cards = within(grid).getAllByTestId("room-card");
    expect(cards).toHaveLength(2);

    expect(within(cards[0]).getByText("Atelier Nord")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Werkhaus")).toBeInTheDocument();
    expect(within(cards[0]).getByText(/12/)).toBeInTheDocument();
    expect(within(cards[0]).getByText("Beamer")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Videokonferenz")).toBeInTheDocument();

    expect(within(cards[1]).getByText("Kreativraum Süd")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Loft")).toBeInTheDocument();
    expect(
      within(cards[1]).getByText("Keine Ausstattung hinterlegt")
    ).toBeInTheDocument();
  });

  it("zeigt einen gestalteten Leerzustand bei leerer Liste", async () => {
    global.fetch = fetchOk([]);
    render(<RoomList />);

    const empty = await screen.findByRole("note");
    expect(empty).toHaveTextContent("Es sind noch keine Räume angelegt.");
    expect(screen.queryByTestId("rooms-grid")).not.toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung mit Erneut-versuchen bei API-Fehler", async () => {
    const user = userEvent.setup();
    global.fetch = fetchFail();
    render(<RoomList />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Räume konnten nicht geladen werden");

    // Erneut versuchen: nächster Versuch erfolgreich → Liste erscheint.
    global.fetch = fetchOk(ROOMS);
    await user.click(screen.getByTestId("rooms-retry"));
    await screen.findByText("Atelier Nord");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
