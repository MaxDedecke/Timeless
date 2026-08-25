import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

// jsdom kennt kein ResizeObserver; die Radix-Checkbox misst ihr verstecktes
// Formular-Input aber genau damit, sobald sie INNERHALB eines <form> steht
// (hier der Fall: Ausstattungs-Checkboxen im Raumformular). Der Stub hält
// die Rendering-Tests grün, ohne App-Code zu ändern.
if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Raumformular (/rooms/new und /rooms/:id/edit): Absicherung des Submit-
 * Ladezustands und der Server-Fehleranzeige. Beides ist im Formular selbst
 * umgesetzt (deaktivierter Speichern-Button mit Inline-Spinner während des
 * Requests, destructives shadcn-Alert über dem Formular für Backend-Fehler
 * wie die Pflichtfeld-Validierung oder Netzwerkfehler); diese Tests stellen
 * das Verhalten für beide Routen und beide Fälle (Reject, Pending) sicher.
 * Das Backend wird wie in RoomList.test.tsx über global.fetch gemockt und
 * ausschließlich über relative /api-Pfade angesprochen.
 */

const LOCATIONS = [
  { id: 7, name: "Werkhaus" },
  { id: 9, name: "Loft" },
];

/** Fester Katalog wie GET /api/amenities ihn liefert (Migration 002). */
const AMENITIES = [
  { id: 1, key: "beamer", label: "Beamer" },
  { id: 2, key: "videokonferenz", label: "Videokonferenz" },
  { id: 3, key: "whiteboard", label: "Whiteboard" },
];

const ROOM_1 = {
  id: 1,
  name: "Atelier Nord",
  locationId: 7,
  capacity: 12,
  amenities: [{ key: "beamer", label: "Beamer" }],
  location: { id: 7, name: "Werkhaus" },
};

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

/**
 * Katalog-Abrufe (Standorte, Merkmale), die jedes Formular beim Laden braucht.
 */
function katalogAntwort(url: string): Response | null {
  if (url === "/api/locations") return jsonResponse(LOCATIONS);
  if (url === "/api/amenities") return jsonResponse(AMENITIES);
  return null;
}

function installFetch(
  handler: (url: string, method: string, init?: RequestInit) => Promise<Response>
): void {
  global.fetch = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
      handler(apiUrl(input), init?.method ?? "GET", init)
  ) as unknown as typeof global.fetch;
}

/** Rendert die echte App-Shell unter der gegebenen Route. */
function renderAt(path: string): void {
  window.history.pushState({}, "", path);
  render(<App />);
}

/** Wartet bis das einsatzbereite Formular da ist und füllt die Pflichtfelder. */
async function ausfuellenUndAbsenden(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await screen.findByTestId("room-form");
  await user.type(screen.getByTestId("room-name"), "Atelier Nord");
  await user.selectOptions(screen.getByTestId("room-location"), "7");
  await user.type(screen.getByTestId("room-capacity"), "12");
  await user.click(screen.getByTestId("room-submit"));
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("RoomForm – Submit-Fehleranzeige (Reject-Case)", () => {
  it("zeigt einen Backend-400 als destructives Alert über dem Formular und aktiviert den Button danach wieder", async () => {
    const user = userEvent.setup();
    const gesendeteKoerper: unknown[] = [];
    installFetch(async (url, method, init) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms" && method === "POST") {
        gesendeteKoerper.push(JSON.parse(String(init?.body)));
        // Fachfehler der Pflichtfeld-/Referenzprüfung im Backend (Route
        // übersetzt ValidationError in 400 + { error }): hier ein Standort,
        // der zwischen Laden und Speichern gelöscht wurde.
        return jsonResponse(
          { error: "Der angegebene Standort existiert nicht." },
          400
        );
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/new");
    await ausfuellenUndAbsenden(user);

    // Das Speichern hat das Formular verlassen: gültiger Payload war unterwegs
    // (Genehmigungspflicht als explizites false, da der Schalter aus blieb)…
    expect(gesendeteKoerper).toEqual([
      {
        name: "Atelier Nord",
        locationId: 7,
        capacity: 12,
        amenities: [],
        requiresApproval: false,
      },
    ]);

    // …und die Ablehnung erscheint als einheitliches Fehler-Alert über dem
    // Formular – mit Titel und verständlicher Backend-Meldung, nicht unsichtbar.
    const alert = await screen.findByTestId("room-save-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent("Speichern fehlgeschlagen");
    expect(alert).toHaveTextContent("Der angegebene Standort existiert nicht.");

    // Nach dem Fehler ist der Speichern-Button wieder bedienbar, kein
    // Spinner mehr sichtbar.
    expect(screen.getByTestId("room-submit")).toBeEnabled();
    expect(screen.queryByTestId("room-save-spinner")).not.toBeInTheDocument();
  });

  it("zeigt denselben Fehlerpfad im Bearbeiten-Formular bei abgelehntem updateRoom-Request", async () => {
    const user = userEvent.setup();
    installFetch(async (url, method) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms/1" && method === "GET") return jsonResponse(ROOM_1);
      // Realistischer Server-Fehler im Bearbeiten-Fall: Der Raum wurde
      // zwischenzeitlich von jemand anderem gelöscht → 404 mit Meldung.
      if (url === "/api/rooms/1" && method === "PUT") {
        return jsonResponse({ error: "Raum nicht gefunden." }, 404);
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/1/edit");
    await screen.findByTestId("room-form");
    expect(screen.getByTestId("room-name")).toHaveValue("Atelier Nord");
    await user.clear(screen.getByTestId("room-name"));
    await user.type(screen.getByTestId("room-name"), "Atelier Süd");
    await user.click(screen.getByTestId("room-submit"));

    const alert = await screen.findByTestId("room-save-error");
    expect(alert).toHaveTextContent("Speichern fehlgeschlagen");
    expect(alert).toHaveTextContent("Raum nicht gefunden.");
    expect(screen.getByTestId("room-submit")).toBeEnabled();
  });
});

describe("RoomForm – Submit-Ladezustand (Pending-Case)", () => {
  it("deaktiviert den Speichern-Button mit Spinner, solange der createRoom-Request läuft", async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: Response) => void;
    installFetch(async (url, method) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms" && method === "POST") {
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/new");
    await screen.findByTestId("room-form");
    await user.type(screen.getByTestId("room-name"), "Atelier Nord");
    await user.selectOptions(screen.getByTestId("room-location"), "7");
    await user.type(screen.getByTestId("room-capacity"), "12");
    await user.click(screen.getByTestId("room-submit"));

    // Während der Request offen ist: Button deaktiviert, Inline-Spinner da,
    // noch keine Fehlermeldung.
    await waitFor(() => {
      expect(screen.getByTestId("room-submit")).toBeDisabled();
    });
    expect(screen.getByTestId("room-save-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("room-save-error")).not.toBeInTheDocument();

    // Löst der Request erfolgreich auf, verlässt die App das Formular Richtung
    // Raumliste – dort erscheint der Leerzustand der (noch leeren) Liste.
    resolvePost(jsonResponse(ROOM_1, 201));
    installFetch(async (url) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms") return jsonResponse([]);
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });
    expect(await screen.findByTestId("rooms-empty")).toHaveTextContent(
      "Noch keine Räume angelegt."
    );
    expect(screen.queryByTestId("room-form")).not.toBeInTheDocument();
  });

  it("setzt eine alte Fehlermeldung beim nächsten Submit-Versuch zurück, bevor die neue Antwort da ist", async () => {
    const user = userEvent.setup();
    let ersterAbruf = true;
    let resolveZweiterPost!: (value: Response) => void;
    installFetch(async (url, method) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms" && method === "POST") {
        if (ersterAbruf) {
          ersterAbruf = false;
          return jsonResponse(
            { error: "Der angegebene Standort existiert nicht." },
            400
          );
        }
        // Zweiter Versuch bleibt bewusst offen: Die alte Meldung muss schon
        // beim Absenden verschwunden sein, nicht erst mit der neuen Antwort.
        return new Promise<Response>((resolve) => {
          resolveZweiterPost = resolve;
        });
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/new");
    await ausfuellenUndAbsenden(user);
    await screen.findByTestId("room-save-error");

    await user.click(screen.getByTestId("room-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("room-submit")).toBeDisabled();
    });
    // Keine alte Meldung links liegen, während der zweite Request läuft.
    expect(screen.queryByTestId("room-save-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("room-save-spinner")).toBeInTheDocument();

    // Löst der zweite Request auf, verlässt die App das Formular Richtung
    // Raumliste – die Liste dahinter ist leer und wartet auf ihren Abruf.
    installFetch(async (url) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms") return jsonResponse([]);
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });
    resolveZweiterPost(jsonResponse(ROOM_1, 201));
    expect(await screen.findByTestId("rooms-empty")).toBeInTheDocument();
  });
});

/**
 * Genehmigungspflicht-Schalter (Sprint 10): Der Umschalter im Raumformular
 * steuert requiresApproval im Payload – Default „aus“ beim Anlegen,
 * vorausgefüllt beim Bearbeiten und tolerant, wenn die API das Feld noch
 * nicht liefert (das Basisticket „Genehmigungspflicht-Flag je Raum“ steht
 * aus; solange ignoriert das Backend den Wert). Server-Fehler erscheinen
 * unverändert im etablierten destructiven Speicherfehler-Alert.
 */
describe("RoomForm – Genehmigungspflicht-Schalter", () => {
  it("ist beim Anlegen standardmäßig aus und sendet nach dem Einschalten requiresApproval: true", async () => {
    const user = userEvent.setup();
    const gesendeteKoerper: unknown[] = [];
    installFetch(async (url, method, init) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms/1" && method === "GET") return jsonResponse(ROOM_1);
      if (url === "/api/rooms" && method === "POST") {
        gesendeteKoerper.push(JSON.parse(String(init?.body)));
        return jsonResponse({ ...ROOM_1, id: 9 }, 201);
      }
      if (url === "/api/rooms") return jsonResponse([]);
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/new");
    await screen.findByTestId("room-form");

    // Default aus: Ein neuer Raum ist nicht genehmigungspflichtig.
    expect(screen.getByTestId("room-requires-approval")).toHaveAttribute(
      "data-state",
      "unchecked"
    );

    await user.type(screen.getByTestId("room-name"), "Boardroom");
    await user.selectOptions(screen.getByTestId("room-location"), "7");
    await user.type(screen.getByTestId("room-capacity"), "8");

    await user.click(screen.getByTestId("room-requires-approval"));
    expect(screen.getByTestId("room-requires-approval")).toHaveAttribute(
      "data-state",
      "checked"
    );

    await user.click(screen.getByTestId("room-submit"));

    expect(gesendeteKoerper).toEqual([
      {
        name: "Boardroom",
        locationId: 7,
        capacity: 8,
        amenities: [],
        requiresApproval: true,
      },
    ]);
  });

  it("liest die gespeicherte Genehmigungspflicht beim Bearbeiten vor und sendet sie unverändert zurück", async () => {
    const user = userEvent.setup();
    const gesendeteKoerper: unknown[] = [];
    installFetch(async (url, method, init) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms/1" && method === "GET") {
        return jsonResponse({ ...ROOM_1, requiresApproval: true });
      }
      if (url === "/api/rooms/1" && method === "PUT") {
        gesendeteKoerper.push(JSON.parse(String(init?.body)));
        return jsonResponse({ ...ROOM_1, requiresApproval: true });
      }
      if (url === "/api/rooms") return jsonResponse([]);
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/1/edit");
    await screen.findByTestId("room-form");

    // Vorausfüllung aus GET /api/rooms/1: Schalter steht auf an.
    expect(screen.getByTestId("room-requires-approval")).toHaveAttribute(
      "data-state",
      "checked"
    );

    await user.click(screen.getByTestId("room-submit"));

    expect(gesendeteKoerper).toEqual([
      {
        name: "Atelier Nord",
        locationId: 7,
        capacity: 12,
        amenities: ["beamer"],
        requiresApproval: true,
      },
    ]);
  });

  it("behandelt eine API-Antwort ohne requiresApproval-Feld als nicht genehmigungspflichtig", async () => {
    const user = userEvent.setup();
    const gesendeteKoerper: unknown[] = [];
    installFetch(async (url, method, init) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      // Bewusst OHNE requiresApproval: Der aktuelle Backend-Stand kennt das
      // Feld noch nicht – das Formular darf daran nicht scheitern.
      if (url === "/api/rooms/1" && method === "GET") return jsonResponse(ROOM_1);
      if (url === "/api/rooms/1" && method === "PUT") {
        gesendeteKoerper.push(JSON.parse(String(init?.body)));
        return jsonResponse(ROOM_1);
      }
      if (url === "/api/rooms") return jsonResponse([]);
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/1/edit");
    await screen.findByTestId("room-form");

    expect(screen.getByTestId("room-requires-approval")).toHaveAttribute(
      "data-state",
      "unchecked"
    );

    await user.click(screen.getByTestId("room-submit"));

    const koerper = gesendeteKoerper[0] as { requiresApproval?: boolean };
    expect(koerper.requiresApproval).toBe(false);
  });

  it("zeigt einen Server-Fehler beim Speichern im etablierten Alert und erhält den Schalter-Zustand", async () => {
    const user = userEvent.setup();
    installFetch(async (url, method) => {
      const katalog = katalogAntwort(url);
      if (katalog !== null) return katalog;
      if (url === "/api/rooms" && method === "POST") {
        return jsonResponse(
          { error: "Der angegebene Standort existiert nicht." },
          400
        );
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    });

    renderAt("/rooms/new");
    await screen.findByTestId("room-form");
    await user.type(screen.getByTestId("room-name"), "Boardroom");
    await user.selectOptions(screen.getByTestId("room-location"), "7");
    await user.type(screen.getByTestId("room-capacity"), "8");
    await user.click(screen.getByTestId("room-requires-approval"));
    await user.click(screen.getByTestId("room-submit"));

    // Etablierter Fehlerzustand: destructives Alert über dem Formular.
    const alert = await screen.findByTestId("room-save-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toHaveTextContent("Speichern fehlgeschlagen");

    // Das Formular bleibt offen – alle Eingaben inklusive Schalter bleiben.
    expect(screen.getByTestId("room-requires-approval")).toHaveAttribute(
      "data-state",
      "checked"
    );
    expect(screen.getByTestId("room-name")).toHaveValue("Boardroom");
    expect(screen.getByTestId("room-submit")).toBeEnabled();
  });
});
