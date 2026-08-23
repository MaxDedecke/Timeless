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
 * Leer (inkl. „Standort ohne Räume“ und „gar keine Standorte“) sowie der
 * Sidebar-Menüpunkt mit aktiver Markierung.
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
  locationsFehler?: boolean;
  roomsFehler?: boolean;
}

/**
 * Installiert das Backend der Tagesansicht: Standort- und Raumliste über
 * relative Pfade; Fehler je Endpoint zuschaltbar.
 */
function installBackend({
  standorte = STANDORTE,
  raeume = RAEUME,
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

  it("wechselt per Vorgänger-/Folgetag nur den Suchparameter, ohne neu zu laden", async () => {
    const user = userEvent.setup();
    const mock = installBackend();
    renderAt("/day/7?date=2026-08-21");
    await screen.findByTestId("timegrid-lane-title-1");
    const abrufeNachLaden = mock.mock.calls.length;

    await user.click(screen.getByTestId("dayview-next-day"));
    await waitFor(() => {
      expect(window.location.search).toBe("?date=2026-08-22");
    });
    expect(screen.getByTestId("dayview-date-label")).toHaveTextContent(
      formatDate("2026-08-22T12:00:00Z")
    );

    // Zwei Tage zurück: zweimal Vortag ab dem Folgetag.
    await user.click(screen.getByTestId("dayview-prev-day"));
    await user.click(screen.getByTestId("dayview-prev-day"));
    await waitFor(() => {
      expect(window.location.search).toBe("?date=2026-08-20");
    });
    expect(screen.getByTestId("dayview-date-label")).toHaveTextContent(
      formatDate("2026-08-20T12:00:00Z")
    );

    // Kein erneuter Request beim reinen Tageswechsel (Räume bleiben geladen).
    expect(mock.mock.calls.length).toBe(abrufeNachLaden);

    // „Heute“ setzt auf den aktuellen Tag zurück.
    await user.click(screen.getByTestId("dayview-today"));
    await waitFor(() => {
      expect(window.location.search).toBe(`?date=${heute()}`);
    });
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
    installBackend();
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

  it("zeigt ohne jedwede Standorte einen eigenen Leerzustand", async () => {
    installBackend({ standorte: [] });
    renderAt("/day");

    const leer = await screen.findByTestId("dayview-no-locations");
    expect(leer).toHaveTextContent("Noch kein Standort angelegt.");
    expect(screen.queryByTestId("timegrid-loading")).not.toBeInTheDocument();
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
