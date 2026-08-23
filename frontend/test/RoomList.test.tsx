import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import App from "../src/App";
import RoomList from "../src/pages/RoomList";

// jsdom kennt kein ResizeObserver; die Radix-Checkbox misst ihr verstecktes
// Formular-Input aber genau damit, sobald sie INNERHALB eines <form> steht
// (im Raumformular der Fall, im AmenityFilter nicht). Der Stub hält die
// Rendering-Tests von RoomForm-Routen dadurch grün, ohne App-Code zu ändern.
if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Raumliste: alle vier Zustände (lädt, Daten, leer, Fehler) sind erkennbar
 * gestaltet und werden hier je durch einen Test abgesichert – dazu der
 * Ausstattungsfilter (Ein-Merkmal, kombiniert AND, Zurücksetzen, keine
 * Treffer), die Merkmalsanzeige je Raum als Badge inkl. definiertem
 * Leerzustand für Räume ohne Merkmale und der Zugang zur Raumverwaltung:
 * „Raum anlegen" verweist auf /rooms/new, jede Raumkarte trägt den
 * Kalender-Zugang (/rooms/:id) und einen Bearbeiten-Link /rooms/:id/edit,
 * und nach der Rückkehr aus dem Formular zeigt die Liste den neuen bzw.
 * geänderten Raum (Refetch beim Mount). Das Backend wird über global.fetch
 * gemockt; die Pfad-Prüfung stellt sicher, dass ausschließlich relative
 * /api-Pfade aufgerufen werden (keine Compose-Servicenamen im Browser-Code).
 */

/** Direkte Renders von RoomList brauchen Router-Kontext für die Links. */
function renderRoomList() {
  return render(
    <MemoryRouter initialEntries={["/rooms"]}>
      <RoomList />
    </MemoryRouter>
  );
}

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

/**
 * Backend-Mock der Raumkalender-Routen (/rooms/:id): Raumdetail plus dessen
 * Buchungsliste über /api/rooms/:id und /api/bookings?roomId=… – Räume
 * wahlweise leer (unbekannte ID → 404 mit Meldung).
 */
function fetchKalenderMock(rooms: typeof ROOMS = ROOMS) {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url.startsWith("/api/bookings?roomId=")) {
      return jsonResponse([]);
    }
    if (url.startsWith("/api/rooms/")) {
      const id = Number(url.slice("/api/rooms/".length));
      const raum = rooms.find((r) => r.id === id);
      if (raum === undefined) {
        return jsonResponse({ error: "Raum nicht gefunden." }, 404);
      }
      return jsonResponse(raum);
    }
    throw new Error(`Unerwarteter API-Pfad: ${url}`);
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
  window.history.pushState({}, "", "/");
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
    renderRoomList();
    // Lade-Skelett in Kartenform ist sichtbar, noch keine Raumdaten.
    expect(screen.getByTestId("rooms-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("room-card")).not.toBeInTheDocument();
    resolveFetch(jsonResponse(ROOMS));
    await screen.findByTestId("rooms-grid");
  });

  it("ruft /api/rooms relativ ab und zeigt Name, Standort, Kapazität und Ausstattung", async () => {
    const fetchMock = fetchApi();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    renderRoomList();

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
      within(cards[1]).getByTestId("room-amenities-empty-2")
    ).toHaveTextContent("Keine Merkmale");

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

  it("zeigt den Listen-Leerzustand „Noch keine Räume angelegt“ bei leerer Liste", async () => {
    global.fetch = fetchWith([]) as unknown as typeof global.fetch;
    renderRoomList();

    const empty = await screen.findByTestId("rooms-empty");
    expect(empty).toHaveTextContent("Noch keine Räume angelegt.");
    expect(screen.queryByTestId("rooms-grid")).not.toBeInTheDocument();
    // Ohne Räume gibt es auch keinen Filter über der Liste.
    expect(screen.queryByTestId("amenity-filter")).not.toBeInTheDocument();
  });

  it("bietet im Listen-Leerzustand den Anlegen-CTA und das Neuladen der Liste an", async () => {
    global.fetch = fetchWith([]) as unknown as typeof global.fetch;
    renderRoomList();
    await screen.findByTestId("rooms-empty");

    // Anlegen-CTA: echter Link mit Button-Look (asChild), Ziel /rooms/new.
    const createLink = screen.getByTestId("rooms-empty-create");
    expect(createLink.tagName).toBe("A");
    expect(createLink).toHaveAttribute(
      "href",
      expect.stringMatching(/\/rooms\/new$/)
    );

    // Neuladen: nächster Abruf liefert Daten → Liste erscheint, Leerzustand weg.
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    await userEvent
      .setup()
      .click(screen.getByTestId("rooms-empty-retry"));
    await screen.findByTestId("rooms-grid");
    expect(screen.queryByTestId("rooms-empty")).not.toBeInTheDocument();
  });

  it("zeigt eine Fehlermeldung mit Erneut-versuchen bei API-Fehler", async () => {
    const user = userEvent.setup();
    global.fetch = fetchFail() as unknown as typeof global.fetch;
    renderRoomList();

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
    renderRoomList();
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
    renderRoomList();
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
    renderRoomList();

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
    renderRoomList();
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

/**
 * Merkmalsanzeige je Raum: GET /api/rooms liefert je Raum die zugeordneten
 * Merkmale als {key, label}; RoomCard zeigt sie als shadcn-Badges. Räume ohne
 * Merkmale erhalten einen definierten Leerzustand („Keine Merkmale") statt
 * eines still leeren Bereichs – beides über data-testid verankert, damit
 * nicht nur der Textinhalt, sondern das gerenderte Markup selbst geprüft
 * wird.
 */
describe("RoomList – Merkmalsanzeige je Raum", () => {
  it("zeigt die Merkmale eines Raums als shadcn-Badges mit Katalog-Label", async () => {
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    renderRoomList();
    const grid = await waitForRooms(3);
    const cards = within(grid).getAllByTestId("room-card");

    // Atelier Nord: genau seine zwei Badges, Label aus dem Backend-Katalog.
    const badgesNord = within(cards[0]).getAllByTestId(/^room-amenity-badge-/);
    expect(badgesNord.map((badge) => badge.textContent)).toEqual([
      "Beamer",
      "Videokonferenz",
    ]);
    expect(badgesNord[0]).toHaveClass("inline-flex"); // shadcn-Badge-Basis

    // Werkstatt Ost: eigenes Badge-Set, nichts aus dem ersten Raum übernommen.
    const badgesOst = within(cards[2]).getAllByTestId(/^room-amenity-badge-/);
    expect(badgesOst.map((badge) => badge.textContent)).toEqual([
      "Beamer",
      "Whiteboard",
    ]);

    // Der Merkmals-Container trägt die raumbezogene ID (Karte ↔ Merkmale).
    expect(within(cards[0]).getByTestId("room-amenities-1")).toBeInTheDocument();
  });

  it("zeigt für einen Raum ohne Merkmale den definierten Leerzustand statt Badges", async () => {
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    renderRoomList();
    await screen.findByTestId("rooms-grid");

    // Kreativraum Süd (id 2) hat keine Merkmale: dezenter Text, keine Badges.
    const leerzustand = screen.getByTestId("room-amenities-empty-2");
    expect(leerzustand).toBeVisible();
    expect(leerzustand).toHaveTextContent("Keine Merkmale");

    const container = screen.getByTestId("room-amenities-2");
    expect(
      within(container).queryByTestId(/^room-amenity-badge-/)
    ).not.toBeInTheDocument();
  });
});

/**
 * Zugang zur Raumverwaltung und zum Raumkalender: „Raum anlegen" im Seitenkopf
 * ist ein echter Link auf /rooms/new, jede Raumkarte trägt den Kalender-Zugang
 * (/rooms/:id) und den Bearbeiten-Link (/rooms/:id/edit), und beim erneuten
 * Mount (Rückkehr aus dem Formular) wird frisch geholt, sodass neue bzw.
 * geänderte Räume erscheinen.
 */
describe("RoomList – Anlegen-/Bearbeiten-/Kalender-Zugang", () => {
  it("zeigt den „Raum anlegen“-Button sichtbar und verweist auf /rooms/new", async () => {
    global.fetch = fetchWith([]) as unknown as typeof global.fetch;
    window.history.pushState({}, "", "/rooms");
    render(<App />);

    // Leerzustand statt Grid: der Button muss trotzdem sichtbar sein.
    await screen.findByTestId("rooms-empty");

    const button = screen.getByTestId("room-create-link");
    expect(button).toBeVisible();
    expect(button.tagName).toBe("A"); // asChild: Button-Look über echtem <a>
    expect(button).toHaveAttribute(
      "href",
      expect.stringMatching(/\/rooms\/new$/)
    );
  });

  it("trägt je Raum Kalender- und Bearbeiten-Link mit raumspezifischen Ziel-URLs", async () => {
    global.fetch = fetchApi() as unknown as typeof global.fetch;
    renderRoomList();

    const grid = await screen.findByTestId("rooms-grid");
    const cards = within(grid).getAllByTestId("room-card");
    expect(cards).toHaveLength(3);

    for (let i = 0; i < ROOMS.length; i += 1) {
      const room = ROOMS[i];
      // Bearbeiten: /rooms/:id/edit wie bisher.
      const bearbeiten = within(grid).getByTestId(`room-edit-${room.id}`);
      expect(bearbeiten.tagName).toBe("A");
      expect(bearbeiten).toHaveAttribute(
        "href",
        expect.stringMatching(new RegExp(`/rooms/${room.id}/edit$`))
      );
      // Neu in diesem Ticket: Kalender-Zugang auf die Raumansicht /rooms/:id.
      const kalender = within(grid).getByTestId(`room-calendar-${room.id}`);
      expect(kalender.tagName).toBe("A");
      expect(kalender).toHaveAttribute(
        "href",
        expect.stringMatching(new RegExp(`/rooms/${room.id}$`))
      );
      // Jede Karte genau diese beiden Zugänge – keine Karte ohne einen davon.
      expect(within(cards[i]).getAllByRole("link")).toHaveLength(2);
    }
    expect(within(grid).getAllByTestId(/^room-calendar-/)).toHaveLength(
      ROOMS.length
    );
  });

  it("holt bei Rückkehr aus dem Formular neu und zeigt den angelegten bzw. geänderten Raum", async () => {
    // Erster Mount: Ausgangsliste ohne den neuen Raum.
    const ersteListe = ROOMS;
    let aktuelleListe = ersteListe;
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url === "/api/rooms") return jsonResponse(aktuelleListe);
        if (url === "/api/amenities") return jsonResponse(AMENITIES);
        throw new Error(`Unerwarteter API-Pfad: ${url}`);
      }
    );
    global.fetch = fetchMock as unknown as typeof global.fetch;

    renderRoomList();
    await waitForRooms(3);

    // „Formular speichern": die Liste dahinter wächst um den neuen Raum.
    aktuelleListe = [
      ...ersteListe,
      {
        id: 4,
        name: "Studio West",
        locationId: 9,
        capacity: 6,
        amenities: [{ key: "beamer", label: "Beamer" }],
        location: { id: 9, name: "Loft" },
      },
    ];

    // Rückkehr = Unmount der Liste und frischer Mount (kein Cache-State):
    // Der zweite Mount holt erneut und zeigt den neuen Raum.
    cleanup();
    renderRoomList();
    const grid = await waitForRooms(4);
    expect(within(grid).getByText("Studio West")).toBeInTheDocument();

    // Frischer Abruf belegt: /api/rooms wurde zweimal gerufen (je Mount).
    const roomsCalls = fetchMock.mock.calls.filter(([input]) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      return url === "/api/rooms";
    });
    expect(roomsCalls).toHaveLength(2);

    // Auch der neue Raum trägt den Kalender-Zugang.
    expect(within(grid).getByTestId("room-calendar-4")).toHaveAttribute(
      "href",
      expect.stringMatching(/\/rooms\/4$/)
    );
  });
});

/**
 * Raumkalender-Routen (/rooms/:id): Die Karten-Links führen nicht ins Leere –
 * unter der Route lädt die Ansicht Raumkopf (Name, Standort, Kapazität,
 * Merkmale) plus Zeitraster des Raums; eine unbekannte ID zeigt den
 * verständlichen Fehlerzustand mit Rückweg zur Raumliste. Die Buchungsliste
 * kommt über den relativen Pfad /api/bookings?roomId=….
 */
describe("Raumkalender-Routen", () => {
  it("öffnet unter /rooms/1 den Raumkalender mit Raumkopf und Zeitraster", async () => {
    const backend = fetchKalenderMock();
    global.fetch = backend as unknown as typeof global.fetch;
    window.history.pushState({}, "", "/rooms/1");
    render(<App />);

    // Raumkopf: Name als Seitenüberschrift, Standort, Kapazität, Merkmale.
    expect(
      await screen.findByRole("heading", { name: "Atelier Nord", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText("Werkhaus")).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText("Beamer")).toBeInTheDocument();

    // Genau eine Spur für diesen Raum im Zeitraster.
    await screen.findByTestId("timegrid-grid");
    expect(screen.getByTestId("timegrid-lane-1")).toBeInTheDocument();
    expect(screen.getAllByTestId("timegrid-lane-title-1")).toHaveLength(1);

    // Buchungsliste kommt über den relativen Pfad mit Raumfilter.
    const pfade = backend.mock.calls.map(
      (aufruf: unknown[]) => aufruf[0] as string
    );
    expect(pfade).toContain("/api/bookings?roomId=1");
    expect(pfade).toContain("/api/rooms/1");
  });

  it("zeigt bei unbekannter Raum-ID eine verständliche Fehlermeldung statt eines rohen Fehlers", async () => {
    global.fetch = fetchKalenderMock([]);
    window.history.pushState({}, "", "/rooms/999");
    render(<App />);

    const fehler = await screen.findByTestId("room-calendar-error");
    expect(fehler).toHaveTextContent("Kalender konnte nicht geladen werden");
    expect(fehler).toHaveTextContent("Raum nicht gefunden.");
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();

    // Rückweg aus dem Fehlerzustand: Link zurück zur Raumliste.
    expect(
      within(fehler).getByRole("link", { name: "Zurück zur Raumliste" })
    ).toHaveAttribute("href", expect.stringMatching(/\/rooms$/));
  });
});

/**
 * Formular-Routen: /rooms/new und /rooms/:id/edit sind über die echte
 * App-Shell erreichbar und rendern das Raum-Anlegen- bzw. das vorausgefüllte
 * Bearbeiten-Formular – so führen die Links aus diesem Ticket nicht ins
 * Leere. Das Backend wird wie oben über global.fetch gemockt.
 */
describe("Formular-Routen", () => {
  function fetchMitDetail(rooms: (typeof ROOMS)[number][] = ROOMS) {
    return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.startsWith("/api/rooms/")) {
        const id = Number(url.slice("/api/rooms/".length));
        const raum = rooms.find((r) => r.id === id);
        if (raum === undefined) {
          return jsonResponse({ error: "Raum nicht gefunden." }, 404);
        }
        return jsonResponse(raum);
      }
      if (url === "/api/rooms") return jsonResponse(rooms);
      if (url === "/api/locations")
        return jsonResponse([
          { id: 7, name: "Werkhaus" },
          { id: 9, name: "Loft" },
        ]);
      if (url === "/api/amenities") return jsonResponse(AMENITIES);
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });
  }

  it("rendert unter /rooms/new das leere Anlegen-Formular mit Standort-Auswahl", async () => {
    global.fetch = fetchMitDetail() as unknown as typeof global.fetch;
    window.history.pushState({}, "", "/rooms/new");
    render(<App />);

    // Das Formular ist leer (kein Raum geladen), sobald die Kataloge da sind.
    const formular = await screen.findByTestId("room-form");
    expect(screen.getByTestId("room-name")).toHaveValue("");
    expect(screen.getByTestId("room-capacity")).toHaveValue(null);
    expect(screen.getByTestId("room-location")).toHaveValue("");

    // Kataloge kommen über relative Pfade; Merkmale sind nicht vorausgefüllt.
    await waitFor(() => {
      expect(within(formular).getAllByRole("checkbox").length).toBe(3);
    });
    expect(screen.getByTestId("room-amenity-beamer")).toHaveAttribute(
      "data-state",
      "unchecked"
    );
  });

  it("rendert unter /rooms/1/edit das Bearbeiten-Formular mit vorausgefüllten Werten", async () => {
    global.fetch = fetchMitDetail() as unknown as typeof global.fetch;
    window.history.pushState({}, "", "/rooms/1/edit");
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Raum bearbeiten",
        level: 1,
      })
    ).toBeInTheDocument();
    expect(await screen.findByTestId("room-form")).toBeInTheDocument();

    // Vorausfüllung aus GET /api/rooms/1 (Atelier Nord).
    expect(screen.getByTestId("room-name")).toHaveValue("Atelier Nord");
    expect(screen.getByTestId("room-capacity")).toHaveValue(12);
    expect(screen.getByTestId("room-location")).toHaveValue("7");
    expect(screen.getByTestId("room-amenity-beamer")).toHaveAttribute(
      "data-state",
      "checked"
    );
    expect(screen.getByTestId("room-amenity-videokonferenz")).toHaveAttribute(
      "data-state",
      "checked"
    );
    expect(screen.getByTestId("room-amenity-whiteboard")).toHaveAttribute(
      "data-state",
      "unchecked"
    );
  });

  it("zeigt bei unbekannter Raum-ID eine verständliche Fehlermeldung statt eines rohen Fehlers", async () => {
    global.fetch = fetchMitDetail([]) as unknown as typeof global.fetch;
    window.history.pushState({}, "", "/rooms/999/edit");
    render(<App />);

    const fehler = await screen.findByTestId("room-form-error");
    expect(fehler).toHaveTextContent("Raum konnte nicht geladen werden");
    expect(fehler).toHaveTextContent("Raum nicht gefunden.");
    expect(screen.queryByTestId("room-form")).not.toBeInTheDocument();
  });
});
