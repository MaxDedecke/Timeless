import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";
import { formatDate } from "../src/lib/format";

/**
 * Tagesansicht (/day[/:locationId]): Absicherung über die echte App-Shell
 * mit gemocktem Backend (global.fetch, ausschließlich relative /api-Pfade).
 * Geprüft werden die Standort-Filterung per URL (Räume anderer Standorte
 * erscheinen nicht), das Datum als Suchparameter mit Default heute und
 * Vorgänger-/Folgetag-Navigation, der Fallback auf den ersten Standort
 * (ohne bzw. mit unbekanntem Routensegment), die Zustände Laden/Fehler/
 * Leer (inkl. „Standort ohne Räume“ und „gar keine Standorte“), die
 * Belegung je Raum über denselben Buchungsendpoint wie im Raumkalender –
 * je Raum angefordert, bei Datumswechsel neu geladen, mit Fehlerzustand,
 * wenn auch nur eine Anfrage misslingt – sowie der Sidebar-Menüpunkt mit
 * aktiver Markierung.
 */

const STANDORTE = [
  { id: 7, name: "Werkhaus" },
  { id: 8, name: "Atelier Süd" },
];

const RAEUME = [
  {
    id: 1,
    name: "Atelier Nord",
    locationId: 7,
    capacity: 12,
    amenities: [{ key: "beamer", label: "Beamer" }],
    location: { id: 7, name: "Werkhaus" },
  },
  {
    id: 2,
    name: "Besprechung Klein",
    locationId: 7,
    capacity: 4,
    amenities: [],
    location: { id: 7, name: "Werkhaus" },
  },
  {
    id: 3,
    name: "Studio Süd",
    locationId: 8,
    capacity: 20,
    amenities: [{ key: "video", label: "Videokonferenz" }],
    location: { id: 8, name: "Atelier Süd" },
  },
];

/** Heutiges Datum wie die Seite es als Default wählt („YYYY-MM-DD“). */
function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

interface MockBuchung {
  id: number;
  roomId: number;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

/** Eine Buchung für einen Raum am Tag (UTC-Zeiten wie die API sie liefert). */
function buchung(
  raumId: number,
  tag: string,
  startUhr: string,
  endUhr: string,
  status = "bestaetigt",
  id = 101
): MockBuchung {
  return {
    id,
    roomId: raumId,
    createdBy: "mitarbeiter@example.com",
    startsAt: `${tag}T${startUhr}:00.000Z`,
    endsAt: `${tag}T${endUhr}:00.000Z`,
    status,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiUrl(input: RequestInfo | URL): string {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
}

interface BackendOptionen {
  standorte?: Array<{ id: number; name: string }>;
  raeume?: typeof RAEUME;
  /** Buchungen je Raum-ID; fehlt ein Raum, gilt er als buchungsfrei. */
  buchungenJeRaum?: Record<number, MockBuchung[]>;
  locationsFehler?: boolean;
  roomsFehler?: boolean;
}

/**
 * Installiert das Backend der Tagesansicht: Standort- und Raumliste sowie
 * die Buchungsliste je Raum über relative Pfade; Fehler je Endpoint
 * zuschaltbar.
 */
function installBackend({
  standorte = STANDORTE,
  raeume = RAEUME,
  buchungenJeRaum = {},
  locationsFehler = false,
  roomsFehler = false,
}: BackendOptionen = {}) {
  const mock = vi.fn(
    async (input: RequestInfo | URL): Promise<Response> => {
      const url = apiUrl(input);
      if (!url.startsWith("/api/")) {
        throw new Error(`Nicht-relativer Pfad: ${url}`);
      }
      if (url === "/api/locations") {
        if (locationsFehler) return jsonResponse({ error: "Boom" }, 500);
        return jsonResponse(standorte);
      }
      if (url === "/api/rooms") {
        if (roomsFehler) return jsonResponse({ error: "Boom" }, 500);
        return jsonResponse(raeume);
      }
      // GET /api/bookings?roomId=…[&date=…] – derselbe Endpoint wie im
      // Raumkalender; fehlt ein Raum im Mock, gilt er als buchungsfrei.
      // Mit date gilt dieselbe Semantik wie im echten Backend: nur
      // Buchungen, die den Tag schneiden (halboffenes Intervall).
      const match = /^\/api\/bookings\?roomId=(\d+)/.exec(url);
      if (match !== null) {
        const liste = buchungenJeRaum[Number(match[1])] ?? [];
        const datumMatch = /[?&]date=(\d{4}-\d{2}-\d{2})/.exec(url);
        if (datumMatch === null) return jsonResponse(liste);
        const von = Date.parse(`${datumMatch[1]}T00:00:00.000Z`);
        const bis = von + 24 * 60 * 60 * 1000;
        return jsonResponse(
          liste.filter((eintrag) => {
            const start = Date.parse(eintrag.startsAt);
            const ende = Date.parse(eintrag.endsAt);
            return start < bis && ende > von;
          })
        );
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    }
  );
  global.fetch = mock as unknown as typeof global.fetch;
  return mock;
}

function renderAt(path: string): void {
  window.history.pushState({}, "", path);
  render(<App />);
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("Tagesansicht – Standortfilterung per URL", () => {
  it("listet unter /day/:locationId nur die Räume dieses Standorts", async () => {
    installBackend();
    renderAt("/day/7");

    // Beide Räume des Werkhauses erscheinen als TimeGrid-Spuren …
    expect(
      await screen.findByTestId("timegrid-lane-title-1")
    ).toHaveTextContent("Atelier Nord");
    expect(screen.getByTestId("timegrid-lane-title-2")).toHaveTextContent(
      "Besprechung Klein"
    );
    // … der Raum des anderen Standorts nicht.
    expect(screen.queryByText("Studio Süd")).not.toBeInTheDocument();

    // Der Ziel-Standort ist erkennbar.
    expect(screen.getByTestId("dayview-location-name")).toHaveTextContent(
      "Werkhaus"
    );
  });

  it("fällt ohne Routensegment und bei unbekannter ID auf den ersten Standort zurück", async () => {
    installBackend();
    renderAt("/day");

    expect(
      await screen.findByTestId("dayview-location-name")
    ).toHaveTextContent("Werkhaus");
    expect(screen.getByTestId("timegrid-lane-title-1")).toBeInTheDocument();
    expect(screen.queryByText("Studio Süd")).not.toBeInTheDocument();

    // Auch eine unbekannte Standort-ID landet beim ersten Standort.
    cleanup();
    window.history.pushState({}, "", "/day/999");
    render(<App />);
    expect(
      await screen.findByTestId("dayview-location-name")
    ).toHaveTextContent("Werkhaus");
  });

  it("zeigt bei mehreren Standorten Wechsel-Links und lädt den gewählten Standort", async () => {
    const user = userEvent.setup();
    installBackend();
    renderAt("/day/7");

    const linkWerkhaus = await screen.findByTestId("dayview-location-7");
    const linkSued = screen.getByTestId("dayview-location-8");

    // Aktiver Standort hervorgehoben (Primary-Füllung), inaktiver als Outline.
    expect(linkWerkhaus).toHaveClass("bg-primary");
    expect(linkSued).toHaveClass("border-input");

    await user.click(linkSued);

    // URL trägt den neuen Standort, die Spuren wechseln mit.
    await waitFor(() => {
      expect(window.location.pathname).toBe("/day/8");
    });
    expect(
      await screen.findByTestId("timegrid-lane-title-3")
    ).toHaveTextContent("Studio Süd");
    expect(screen.queryByText("Atelier Nord")).not.toBeInTheDocument();
    expect(screen.getByTestId("dayview-location-name")).toHaveTextContent(
      "Atelier Süd"
    );
  });
});

describe("Tagesansicht – Datum als Suchparameter", () => {
  it("nimmt ?date= als gewählten Tag und defaultet ohne/ungültig auf heute", async () => {
    installBackend();
    renderAt("/day/7?date=2026-08-21");
    expect(await screen.findByTestId("dayview-date-label")).toHaveTextContent(
      formatDate("2026-08-21T12:00:00Z")
    );

    // Ungültiger Wert fällt auf heute zurück statt zu crashen.
    cleanup();
    window.history.pushState({}, "", "/day/7?date=quatsch");
    render(<App />);
    expect(await screen.findByTestId("dayview-date-label")).toHaveTextContent(
      formatDate(`${heute()}T12:00:00Z`)
    );

    // Ohne Suchparameter ebenfalls heute.
    cleanup();
    window.history.pushState({}, "", "/day/7");
    render(<App />);
    expect(await screen.findByTestId("dayview-date-label")).toHaveTextContent(
      formatDate(`${heute()}T12:00:00Z`)
    );
  });

  it("wechselt per Vorgänger-/Folgetag nur den Suchparameter und zeigt das Skeleton bis zum Neuladen", async () => {
    const user = userEvent.setup();
    // Buchungsabrufe zum Ausgangstag auflösen, jeder andere Tag hängt bewusst
    // – nur so ist der Zwischenzustand „Datumswechsel läuft, alter Stand schon
    // weg“ deterministisch beobachtbar statt als Wettlauf.
    global.fetch = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> => {
        const url = apiUrl(input);
        if (url === "/api/locations") return jsonResponse(STANDORTE);
        if (url === "/api/rooms") return jsonResponse(RAEUME);
        if (url.startsWith("/api/bookings?roomId=")) {
          // Erste Runde (= gewählter Tag 2026-08-21) auflösen, jeder andere
          // Tag hängt bewusst – parallel laufende Abrufe desselben Tags
          // treffen dieselbe Entscheidung.
          if (url.includes("date=2026-08-21")) {
            return jsonResponse([]);
          }
          return new Promise<Response>(() => undefined);
        }
        throw new Error(`Unerwarteter API-Pfad: ${url}`);
      }
    ) as unknown as typeof global.fetch;
    renderAt("/day/7?date=2026-08-21");
    await screen.findByTestId("timegrid-lane-title-1");

    await user.click(screen.getByTestId("dayview-next-day"));
    await waitFor(() => {
      expect(window.location.search).toBe("?date=2026-08-22");
    });

    // Solange die Belegung des neuen Tags lädt, steht der alte Stand nicht
    // länger im Gitter: Skeleton statt veralteter Raumspuren, Datum bereits
    // auf den gewählten Tag gestellt.
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();
    expect(screen.getByTestId("timegrid-loading")).toHaveAttribute(
      "aria-busy",
      "true"
    );
    expect(screen.getByTestId("dayview-date-label")).toHaveTextContent(
      formatDate("2026-08-22T12:00:00Z")
    );

    // Mit wieder heilem Backend kehrt die Ansicht beim nächsten Wechsel aus
    // dem Skeleton zurück (der hängende Lauf wird dabei abgebrochen).
    installBackend({ buchungenJeRaum: { 1: [], 2: [], 3: [] } });
    await user.click(screen.getByTestId("dayview-prev-day"));
    expect(
      await screen.findByTestId("timegrid-lane-title-1")
    ).toBeInTheDocument();
    expect(screen.getByTestId("dayview-date-label")).toHaveTextContent(
      formatDate("2026-08-21T12:00:00Z")
    );
    expect(screen.queryByTestId("timegrid-loading")).not.toBeInTheDocument();
  });
});

describe("Tagesansicht – Zustände", () => {
  it("zeigt beim Laden das TimeGrid-Skeleton", async () => {
    // Nie auflösende Requests: der Ladezustand bleibt sichtbar.
    global.fetch = vi.fn(
      (_input: RequestInfo | URL): Promise<Response> =>
        new Promise<Response>(() => undefined)
    ) as unknown as typeof global.fetch;
    renderAt("/day/7");

    const ladend = await screen.findByTestId("timegrid-loading");
    expect(ladend).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();
  });

  it("zeigt bei API-Fehlern ein destructives Alert und lädt per „Erneut versuchen“ neu", async () => {
    const user = userEvent.setup();
    installBackend({ roomsFehler: true });
    renderAt("/day/7");

    const fehler = await screen.findByTestId("dayview-error");
    expect(fehler).toHaveAttribute("role", "alert");
    expect(fehler).toHaveTextContent(
      "Tagesansicht konnte nicht geladen werden"
    );
    expect(fehler).toHaveTextContent("Erneut versuchen");

    // Danach funktioniert das Neuladen mit heillem Backend.
    installBackend({ buchungenJeRaum: { 1: [], 2: [] } });
    await user.click(screen.getByTestId("dayview-retry"));
    expect(
      await screen.findByTestId("timegrid-lane-title-1")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dayview-error")).not.toBeInTheDocument();
  });

  it("wertet einen Fehler der Standort-Liste ebenfalls als Ladefehler", async () => {
    installBackend({ locationsFehler: true });
    renderAt("/day");

    const fehler = await screen.findByTestId("dayview-error");
    expect(fehler).toHaveTextContent(
      "Tagesansicht konnte nicht geladen werden"
    );
  });

  it("zeigt „Standort ohne Räume“ als Leerzustand – ohne Räume anderer Standorte", async () => {
    installBackend({
      raeume: [RAEUME[2]], // nur Studio Süd gehört zu Standort 8
    });
    renderAt("/day/7");

    const leer = await screen.findByTestId("timegrid-empty");
    expect(leer).toHaveTextContent("Keine Räume für diesen Tag vorhanden.");
    expect(screen.queryByText("Studio Süd")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();
  });

  it("fällt unter /day ohne Auswahl auf den ersten Standort zurück und zeigt dessen Leerzustand, wenn er keine Räume hat", async () => {
    // Nur Atelier Süd (id 8) besitzt Räume; Werkhaus – der Erststandort, auf
    // den /day ohne Routensegment fällt – hat keine. Auch dieser Weg endet im
    // aussagekräftigen Leerzustand, niemals in einem leeren Raster.
    installBackend({
      raeume: [RAEUME[2]], // nur Studio Süd gehört zu Standort 8
    });
    renderAt("/day");

    const leer = await screen.findByTestId("timegrid-empty");
    expect(leer).toHaveTextContent("Keine Räume für diesen Tag vorhanden.");
    expect(leer).toHaveTextContent(
      "Zu diesem Standort sind noch keine Räume angelegt"
    );
    expect(screen.getByTestId("dayview-location-name")).toHaveTextContent(
      "Werkhaus"
    );
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timegrid-no-bookings")).not.toBeInTheDocument();
  });

  it("zeigt ohne jedwede Standorte einen eigenen Leerzustand", async () => {
    installBackend({ standorte: [] });
    renderAt("/day");

    const leer = await screen.findByTestId("dayview-no-locations");
    expect(leer).toHaveTextContent("Noch kein Standort angelegt.");
    expect(screen.queryByTestId("timegrid-loading")).not.toBeInTheDocument();
  });
});

describe("Tagesansicht – Belegung je Raum", () => {
  it("zeigt je Raum des Standorts seine Buchungen des gewählten Tags im Zeitraster", async () => {
    const tag = "2026-08-21";
    installBackend({
      buchungenJeRaum: {
        1: [
          buchung(1, tag, "14:00", "15:30", "ausstehend", 102),
          buchung(1, tag, "09:05", "10:30", "bestaetigt", 101),
        ],
        // Raum 2 hat am Tag eine einzige Buchung …
        2: [buchung(2, tag, "11:00", "12:00", "bestaetigt", 103)],
      },
    });
    renderAt(`/day/7?date=${tag}`);

    // Spur 1: zwei belegte Slots, zeitlich sortiert, mit Status-Badge.
    const spur1 = await screen.findByTestId("timegrid-lane-1");
    const belegt1 = within(spur1).getAllByTestId("timegrid-slot-booked");
    expect(belegt1).toHaveLength(2);
    expect(belegt1[0]).toHaveTextContent("09:05 – 10:30");
    expect(within(belegt1[0]).getByText("Bestätigt")).toHaveClass(
      "bg-success-background"
    );
    expect(belegt1[1]).toHaveTextContent("14:00 – 15:30");
    expect(within(belegt1[1]).getByText("Ausstehend")).toHaveClass(
      "bg-warning-background"
    );

    // Freie Fenster sind je Raum vom Beleg unterschieden (Muted-Token):
    // vormittags vor der ersten Buchung, nachmittags nach der letzten.
    const frei1 = within(spur1).getAllByTestId("timegrid-slot-free");
    for (const slot of frei1) {
      expect(slot).toHaveClass("bg-muted");
      expect(slot).toHaveClass("border-dashed");
    }
    expect(frei1[0]).toHaveTextContent("08:00 – 09:05");
    expect(frei1[frei1.length - 1]).toHaveTextContent("15:30 – 20:00");

    // Spur 2: eigener Beleg, nicht der von Raum 1.
    const spur2 = screen.getByTestId("timegrid-lane-2");
    const belegt2 = within(spur2).getAllByTestId("timegrid-slot-booked");
    expect(belegt2).toHaveLength(1);
    expect(belegt2[0]).toHaveTextContent("11:00 – 12:00");
    expect(spur2).not.toHaveTextContent("09:05 – 10:30");

    // Der Raum des anderen Standorts erscheint samt Beleg nicht.
    expect(screen.queryByTestId("timegrid-lane-3")).not.toBeInTheDocument();

    // Weil beide Räume Belegung haben, gibt es kein Hinweisband.
    expect(
      screen.queryByTestId("timegrid-no-bookings")
    ).not.toBeInTheDocument();
  });

  it("fordert die Buchungen aller Räume des Standorts über denselben Endpoint wie der Raumkalender an", async () => {
    const mock = installBackend({
      buchungenJeRaum: { 1: [], 2: [], 3: [] },
    });
    renderAt("/day/7?date=2026-08-21");
    await screen.findByTestId("timegrid-lane-title-1");

    // Derselbe Pfad wie listBookingsForRoom im Kalender – mit dem gewählten
    // Tag als date-Parameter, für jeden Raum DES GEWÄHLTEN Standorts genau
    // einmal; der Raum des anderen Standorts wird nicht abgefragt.
    const abrufe = mock.mock.calls
      .map((aufruf: [RequestInfo | URL]) => apiUrl(aufruf[0]))
      .filter((pfad: string) => pfad.startsWith("/api/bookings?roomId="));
    expect(abrufe).toEqual([
      "/api/bookings?roomId=1&date=2026-08-21",
      "/api/bookings?roomId=2&date=2026-08-21",
    ]);

    // Parallelität: Alle Anfragen laufen in einem Rutsch (Promise.allSettled
    // im Seitencode) – im Mock-Protokoll folgen auf locations + rooms die
    // beiden Buchungsabrufe ohne weitere zwischengeschaltete Aufrufe.
    expect(mock.mock.calls.length).toBe(4);
  });

  it("lädt beim Datumswechsel die Belegung des jeweils gewählten Tags neu", async () => {
    const user = userEvent.setup();
    const tag = "2026-08-21";
    const folgetag = "2026-08-22";
    const mock = installBackend({
      buchungenJeRaum: {
        1: [
          buchung(1, tag, "09:00", "10:00", "bestaetigt", 111),
          buchung(1, folgetag, "14:00", "15:00", "bestaetigt", 112),
        ],
        2: [],
      },
    });
    renderAt(`/day/7?date=${tag}`);

    // Gewählter Tag: nur die Buchung dieses Tages im Gitter …
    const spur1 = await screen.findByTestId("timegrid-lane-1");
    let belegt1 = within(spur1).getAllByTestId("timegrid-slot-booked");
    expect(belegt1).toHaveLength(1);
    expect(belegt1[0]).toHaveTextContent("09:00 – 10:00");

    // … und genau ein Buchungsabruf je Raum zu diesem Tag.
    const buchungsAbrufeFuer = (raumId: number, tagIso: string): number =>
      mock.mock.calls.filter(
        (aufruf: [RequestInfo | URL]) =>
          apiUrl(aufruf[0]) === `/api/bookings?roomId=${raumId}&date=${tagIso}`
      ).length;
    expect(buchungsAbrufeFuer(1, tag)).toBe(1);
    expect(buchungsAbrufeFuer(1, folgetag)).toBe(0);

    await user.click(screen.getByTestId("dayview-next-day"));
    await waitFor(() => {
      expect(window.location.search).toBe(`?date=${folgetag}`);
    });

    // Neue Belegung: der Folgetags-Block erscheint, der alte ist weg.
    const spur1Neu = await screen.findByTestId("timegrid-lane-1");
    belegt1 = within(spur1Neu).getAllByTestId("timegrid-slot-booked");
    expect(belegt1).toHaveLength(1);
    expect(belegt1[0]).toHaveTextContent("14:00 – 15:00");
    expect(spur1Neu).not.toHaveTextContent("09:00 – 10:00");
    expect(buchungsAbrufeFuer(1, folgetag)).toBe(1);

    // Zurück auf den Vortag holt dessen Beleg erneut (erneutes Laden statt
    // clientseitiger Filterung) und zeigt wieder den alten Block.
    await user.click(screen.getByTestId("dayview-prev-day"));
    const spur1Zurueck = await screen.findByTestId("timegrid-lane-1");
    expect(
      within(spur1Zurueck).getAllByTestId("timegrid-slot-booked")[0]
    ).toHaveTextContent("09:00 – 10:00");
    expect(buchungsAbrufeFuer(1, tag)).toBe(2);
  });

  it("fordert nach „Erneut versuchen“ die Buchungen je Raum bei jedem weiteren Datumswechsel genau einmal an", async () => {
    const user = userEvent.setup();
    const tag = "2026-08-21";
    // Erster Lauf scheitert an der Standortliste …
    installBackend({ locationsFehler: true });
    renderAt(`/day/7?date=${tag}`);
    await screen.findByTestId("dayview-error");

    // … der Retry lädt mit heilem Backend (dieser Mock bleibt installiert).
    const mock = installBackend({
      buchungenJeRaum: {
        1: [buchung(1, tag, "09:00", "10:00", "bestaetigt", 131)],
        2: [],
        3: [],
      },
    });
    await user.click(screen.getByTestId("dayview-retry"));
    expect(await screen.findByTestId("timegrid-lane-title-1")).toBeInTheDocument();

    // Ein weiterer Datumswechsel NACH dem Retry: Genau ein Abruf je Raum des
    // gewählten Standorts für den neuen Tag – kein Zweitlauf aus einem
    // zweiten, ebenfalls auf Datum reagierenden Effekt (früherer Defekt).
    await user.click(screen.getByTestId("dayview-next-day"));
    await waitFor(() => {
      expect(window.location.search).toBe("?date=2026-08-22");
    });
    // Der Folgetag ist im Seed buchungsfrei → Gitter mit Hinweisband ist da,
    // sobald der neue Tag geladen hat.
    expect(await screen.findByTestId("timegrid-no-bookings")).toBeVisible();

    // Der Mock zählt seit dem Retry – dessen Abrufe des Ausgangstags sind
    // legitim und je Raum genau einer. Entscheidend ist die Häufigkeit JE
    // URL: Der Folgetag wurde nach dem Retry genau einmal je Raum angefordert,
    // nicht doppelt aus zwei nebenläufigen Läufen.
    const buchungsAbrufe = mock.mock.calls
      .map((aufruf: [RequestInfo | URL]) => apiUrl(aufruf[0]))
      .filter((pfad: string) => pfad.startsWith("/api/bookings?roomId="));
    const anzahl = (pfad: string): number =>
      buchungsAbrufe.filter((url: string) => url === pfad).length;
    expect(anzahl("/api/bookings?roomId=1&date=2026-08-21")).toBe(1);
    expect(buchungsAbrufe.length).toBe(4); // 2× Ausgangstag (Retry) + 2× Folgetag
    expect(anzahl("/api/bookings?roomId=1&date=2026-08-22")).toBe(1);
    expect(anzahl("/api/bookings?roomId=2&date=2026-08-22")).toBe(1);
    // Räume anderer Standorte bleiben unangefragt.
    expect(
      buchungsAbrufe.some((url: string) => url.includes("roomId=3"))
    ).toBe(false);
  });

  it("greift in den Fehlerzustand, wenn auch nur eine Buchungsanfrage misslingt", async () => {
    const user = userEvent.setup();

    // Erstlauf: Raum 2 liefert 500 → ganzer Ladevorgang scheitert.
    global.fetch = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> => {
        const url = apiUrl(input);
        if (url === "/api/locations") return jsonResponse(STANDORTE);
        if (url === "/api/rooms") return jsonResponse(RAEUME);
        if (url === "/api/bookings?roomId=1&date=2026-08-21") {
          return jsonResponse([]);
        }
        if (url === "/api/bookings?roomId=2&date=2026-08-21") {
          return jsonResponse({ error: "Boom" }, 500);
        }
        throw new Error(`Unerwarteter API-Pfad: ${url}`);
      }
    ) as unknown as typeof global.fetch;
    renderAt("/day/7?date=2026-08-21");

    const fehler = await screen.findByTestId("dayview-error");
    expect(fehler).toHaveAttribute("role", "alert");
    // Keine halbe Ansicht: Solange die Belegung unvollständig ist, erscheint
    // weder Gitter noch eine Raumspur mit Teil-Daten.
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timegrid-lane-1")).not.toBeInTheDocument();

    // Zweiter Lauf heil: „Erneut versuchen“ lädt alles neu, die Spuren
    // erscheinen samt Belegung.
    installBackend({
      buchungenJeRaum: {
        1: [buchung(1, "2026-08-21", "09:00", "10:00", "bestaetigt", 121)],
        2: [],
      },
    });
    await user.click(screen.getByTestId("dayview-retry"));
    const spur1 = await screen.findByTestId("timegrid-lane-1");
    expect(within(spur1).getByTestId("timegrid-slot-booked")).toHaveTextContent(
      "09:00 – 10:00"
    );
    expect(screen.queryByTestId("dayview-error")).not.toBeInTheDocument();
  });

  it("bleibt bei buchungsfreiem Tag im freien Tagesfenster und zeigt das Hinweisband", async () => {
    installBackend({
      buchungenJeRaum: { 1: [], 2: [] }, // beide Räume frei
    });
    renderAt("/day/7?date=2026-08-21");

    // Fachlicher Leerfall: Hinweisband über dem weiterhin gezeichneten
    // Gitter, jede Spur durchgehend frei (genau ein Slot 08:00–20:00).
    const hinweis = await screen.findByTestId("timegrid-no-bookings");
    expect(hinweis).toBeVisible();

    const spur1 = screen.getByTestId("timegrid-lane-1");
    const frei1 = within(spur1).getAllByTestId("timegrid-slot-free");
    expect(frei1).toHaveLength(1);
    expect(frei1[0]).toHaveTextContent("08:00 – 20:00");
    expect(
      within(spur1).queryByTestId("timegrid-slot-booked")
    ).not.toBeInTheDocument();

    const spur2 = screen.getByTestId("timegrid-lane-2");
    expect(
      within(spur2).queryByTestId("timegrid-slot-booked")
    ).not.toBeInTheDocument();
    expect(within(spur2).getAllByTestId("timegrid-slot-free")).toHaveLength(1);
  });
});

describe("Tagesansicht – Navigation", () => {
  it("verlinkt die Tagesansicht in der Sidebar und markiert sie aktiv", async () => {
    installBackend();
    renderAt("/day/7");

    const nav = await screen.findByRole("navigation", {
      name: "Hauptnavigation",
    });
    const tagesLink = within(nav).getByRole("link", { name: "Tagesansicht" });
    await waitFor(() =>
      expect(tagesLink).toHaveAttribute("aria-current", "page")
    );
    expect(within(nav).getByRole("link", { name: "Räume" })).not.toHaveAttribute(
      "aria-current"
    );

    // Der Menüpunkt zeigt ohne Standort-Segment auf /day – der Fallback
    // greift dann (Deep-Linking über die URL statt <select>).
    expect(tagesLink).toHaveAttribute("href", "/day");
  });
});
