import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import RoomList from "../src/pages/RoomList";

/**
 * Raumliste: alle vier Zustände (lädt, Daten, leer, Fehler) sind erkennbar
 * gestaltet und werden hier je durch einen Test abgesichert – dazu der
 * Ausstattungsfilter (Ein-Merkmal, kombiniert AND, Zurücksetzen, keine
 * Treffer). Das Backend wird über global.fetch gemockt; die Pfad-Prüfung
 * stellt sicher, dass ausschließlich relative /api-Pfade aufgerufen werden
 * (keine Compose-Servicenamen im Browser-Code).
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
  {
    id: 3,
    name: "Werkstatt Ost",
    locationId: 7,
    capacity: 8,
    amenities: [
      { key: "beamer", label: "Beamer" },
      { key: "whiteboard", label: "Whiteboard" },
    ],
    location: { id: 7, name: "Werkhaus" },
  },
];

/** Fester Katalog wie GET /api/amenities ihn liefert (Migration 002). */
const AMENITIES = [
  { id: 1, key: "beamer", label: "Beamer" },
  { id: 2, key: "videokonferenz", label: "Videokonferenz" },
  { id: 3, key: "whiteboard", label: "Whiteboard" },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Routet relative /api-Pfade auf Antworten; jeder andere Aufruf schlägt im
 * Test fehl – so bleibt der Browser-Kontrakt (nur eigener Ursprung) geprüft.
 */
function fetchApi() {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    expect(url.startsWith("/api/")).toBe(true); // relativer Pfad, kein Host
    if (url === "/api/rooms") return jsonResponse(ROOMS);
    if (url === "/api/amenities") return jsonResponse(AMENITIES);
    throw new Error(`Unerwarteter API-Pfad: ${url}`);
  });
}

/** Liefert für beide Endpunkte die Standarddaten (Räume leer erlaubt). */
function fetchWith(rooms: typeof ROOMS) {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url === "/api/rooms") return jsonResponse(rooms);
    if (url === "/api/amenities") return jsonResponse(AMENITIES);
    throw new Error(`Unerwarteter API-Pfad: ${url}`);
  });
}

function fetchFail() {
  return vi.fn(async (_input: RequestInfo | URL): Promise<Response> => {
    throw new Error("Netzwerk weg");
  });
}

async function waitForRooms(count: number) {
  const grid = await screen.findByTestId("rooms-grid");
  await screen.findByTestId("amenity-filter"); // Filter-Katalog ist geladen
  await vi.waitFor(() => {
    expect(within(grid).getAllByTestId("room-card")).toHaveLength(count);
  });
  return grid;
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
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
    const fetchMock = fetchApi();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    render(<RoomList />);

    const grid = await screen.findByTestId("rooms-grid");
    const cards = within(grid).getAllByTestId("room-card");
    expect(cards).toHaveLength(3);

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

    // Auch der Merkmals-Katalog kommt über den relativen Pfad.
    await screen.findByTestId("amenity-filter");
    const calledPaths = fetchMock.mock.calls.map(
      ([input]) =>
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
    );
    expect(calledPaths).toContain("/api/rooms");
    expect(calledPaths).toContain("/api/amenities");
  });

  it("zeigt einen gestalteten Leerzustand bei leerer Liste", async () => {
    global.fetch = fetchWith([]) as unknown as typeof global.fetch;
    render(<RoomList />);

    const empty = await screen.findByTestId("rooms-empty");
    expect(empty).toHaveTextContent("Es sind noch keine Räume angelegt.");
    expect(screen.queryByTestId("rooms-grid")).not.toBeInTheDocument();
    // Ohne Räume gibt es auch keinen Filter über der Liste.
    expect(screen.queryByTestId("amenity-filter")).not.toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung mit Erneut-versuchen bei API-Fehler", async () => {
    const user = userEvent.setup();
    global.fetch = fetchFail() as unknown as typeof global.fetch;
    render(<RoomList />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Räume konnten nicht geladen werden");

    // Erneut versuchen: nächster Versuch erfolgreich → Liste erscheint.
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    await user.click(screen.getByTestId("rooms-retry"));
    const grid = await screen.findByTestId("rooms-grid");
    expect(within(grid).getAllByTestId("room-card")).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("RoomList – Ausstattungsfilter", () => {
  it("zeigt bei einem gewählten Merkmal ausschließlich Räume mit dieser Ausstattung", async () => {
    const user = userEvent.setup();
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    render(<RoomList />);
    await waitForRooms(3);

    await user.click(screen.getByTestId("amenity-filter-beamer"));

    const grid = screen.getByTestId("rooms-grid");
    const cards = within(grid).getAllByTestId("room-card");
    expect(cards).toHaveLength(2);
    expect(within(grid).getByText("Atelier Nord")).toBeInTheDocument();
    expect(within(grid).getByText("Werkstatt Ost")).toBeInTheDocument();
    expect(screen.queryByText("Kreativraum Süd")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("amenity-filter-beamer")
    ).toHaveAttribute("data-state", "checked");
  });

  it("schneidet bei kombinierten Merkmalen auf die Schnittmenge (AND) zurück", async () => {
    const user = userEvent.setup();
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    render(<RoomList />);
    await waitForRooms(3);

    await user.click(screen.getByTestId("amenity-filter-beamer"));
    await user.click(screen.getByTestId("amenity-filter-whiteboard"));

    // Nur die Werkstatt besitzt Beamer UND Whiteboard.
    let grid = screen.getByTestId("rooms-grid");
    expect(within(grid).getAllByTestId("room-card")).toHaveLength(1);
    expect(within(grid).getByText("Werkstatt Ost")).toBeInTheDocument();
    expect(screen.queryByText("Atelier Nord")).not.toBeInTheDocument();

    // Ein Merkmal abwählen weitet die Menge wieder AND-korrekt.
    await user.click(screen.getByTestId("amenity-filter-whiteboard"));
    grid = screen.getByTestId("rooms-grid");
    expect(within(grid).getAllByTestId("room-card")).toHaveLength(2);
  });

  it("zeigt ohne Filter alle Räume und leert „Filter zurücksetzen“ die Auswahl", async () => {
    const user = userEvent.setup();
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    render(<RoomList />);

    // Ohne gesetzten Filter: alle drei Räume.
    await waitForRooms(3);

    await user.click(screen.getByTestId("amenity-filter-videokonferenz"));
    expect(
      within(screen.getByTestId("rooms-grid")).getAllByTestId("room-card")
    ).toHaveLength(1);

    // Reset im Filter: Auswahl leer, Vollständigkeit wiederhergestellt.
    await user.click(screen.getByTestId("amenity-filter-reset"));
    await waitForRooms(3);
    expect(
      screen.getByTestId("amenity-filter-videokonferenz")
    ).toHaveAttribute("data-state", "unchecked");
    expect(screen.getByTestId("amenity-filter-reset")).toBeDisabled();
  });

  it("zeigt bei keinen Treffern einen verständlichen Leerzustand mit Reset", async () => {
    const user = userEvent.setup();
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    render(<RoomList />);
    await waitForRooms(3);

    // Kein Raum besitzt Videokonferenz UND Whiteboard.
    await user.click(screen.getByTestId("amenity-filter-videokonferenz"));
    await user.click(screen.getByTestId("amenity-filter-whiteboard"));

    const noMatch = screen.getByTestId("rooms-no-match");
    expect(noMatch).toBeVisible();
    expect(noMatch).toHaveTextContent(
      "Keine Räume mit dieser Ausstattungskombination gefunden."
    );
    expect(screen.queryByTestId("rooms-grid")).not.toBeInTheDocument();

    // Der Leerzustand bietet den Weg zurück zur vollständigen Liste.
    await user.click(
      within(noMatch).getByRole("button", { name: "Filter zurücksetzen" })
    );
    await waitForRooms(3);
    expect(screen.queryByTestId("rooms-no-match")).not.toBeInTheDocument();
  });
});
