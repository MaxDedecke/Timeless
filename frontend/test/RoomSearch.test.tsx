import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

/**
 * Buchungseinstieg aus der Freie-Räume-Suche (/free) – Absicherung des neuen
 * Pfads dieses Tickets über die echte App-Shell mit gemocktem Backend
 * (global.fetch, ausschließlich relative /api-Pfade):
 *
 * 1. „Buchen" am Treffer öffnet den kontextunabhängigen BookingForm-Dialog
 *    mit RAUM aus dem Treffer und DATUM/ZEITEN aus dem aktiven Suchfilter;
 *    das Speichern geht mit exakt diesem Zeitraum an POST /api/bookings.
 * 2. Nach Erfolg schließt der Dialog und die Trefferliste lädt STILL neu –
 *    der gebuchte Raum fällt aus der Liste, ohne dass die Seite ins Skeleton
 *    fällt.
 * 3. Der Konfliktfall (409) bleibt IM OFFENEN Dialog hängen (destructives
 *    Alert mit Backend-Wortlaut) und fasst die Trefferliste nicht an.
 * 4. Der Sekundärlink „Kalender" führt in den Raumkalender des Raums, wo die
 *    über die Suche angelegte Buchung als Beleg erscheint (AK: „Eine über
 *    die Suche angelegte Buchung erscheint anschließend im Raumkalender").
 */

const LOCATION = { id: 7, name: "Werkhaus" };

const ROOM_1 = {
  id: 1,
  name: "Atelier Nord",
  locationId: 7,
  capacity: 12,
  amenities: [{ key: "beamer", label: "Beamer" }],
  location: LOCATION,
};

const ROOM_2 = {
  id: 2,
  name: "Studio Sued",
  locationId: 7,
  capacity: 4,
  amenities: [{ key: "video", label: "Videokonferenz" }],
  location: LOCATION,
};

const AMENITIES = [
  { key: "beamer", label: "Beamer" },
  { key: "video", label: "Videokonferenz" },
];

/** Heutiges Datum wie der Seiten-Default („YYYY-MM-DD"). */
function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Query-String, wie ihn der API-Client aus from/to baut – ohne Rate-Raten. */
function availableQuery(from: string, to: string): string {
  return new URLSearchParams({ from, to }).toString();
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

interface MockBuchung {
  id: number;
  roomId: number;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface BackendOptionen {
  /** Treffer von GET /api/rooms/available (Array wird per Referenz gelesen). */
  freie?: Array<typeof ROOM_1 | typeof ROOM_2>;
  /** Buchungsliste des Raums 1 für den Raumkalender-Pfad. */
  buchungenRaum1?: MockBuchung[];
  /** Handler für POST /api/bookings. */
  onCreate?: (body: Record<string, unknown>) => Response | Promise<Response>;
}

function installBackend({
  freie = [ROOM_1, ROOM_2],
  buchungenRaum1 = [],
  onCreate,
}: BackendOptionen = {}) {
  return vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = apiUrl(input);
      if (!url.startsWith("/api/")) {
        throw new Error(`Nicht-relativer Pfad: ${url}`);
      }
      if (url === "/api/amenities") return jsonResponse(AMENITIES);
      if (url.startsWith("/api/rooms/available?")) return jsonResponse(freie);
      if (url === "/api/rooms/1") return jsonResponse(ROOM_1);
      if (url.startsWith("/api/bookings?roomId=1")) {
        return jsonResponse(buchungenRaum1);
      }
      if (url === "/api/bookings" && init?.method === "POST") {
        const koerper = JSON.parse(String(init.body)) as Record<string, unknown>;
        if (onCreate === undefined) {
          throw new Error(`Unerwarteter POST ohne Handler: ${url}`);
        }
        return onCreate(koerper);
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    }
  );
}

function renderAt(path: string): void {
  window.history.pushState({}, "", path);
  render(<App />);
}

function availableAbrufe(mock: ReturnType<typeof installBackend>): string[] {
  return mock.mock.calls
    .map(([pfad]) => apiUrl(pfad))
    .filter((url) => url.startsWith("/api/rooms/available"));
}

function postAufrufe(mock: ReturnType<typeof installBackend>) {
  // Ohne eigene Rückgabe-Annotation: der Tupel-Typ der Mock-Aufrufe bleibt
  // erhalten, damit posts[n][1].body typisiert bleibt.
  return mock.mock.calls.filter(
    ([pfad, init]) =>
      apiUrl(pfad) === "/api/bookings" && init?.method === "POST"
  );
}

async function oeffneDialogAusTreffer(
  user: ReturnType<typeof userEvent.setup>,
  raumId: number
): Promise<void> {
  await user.click(screen.getByTestId(`search-book-${raumId}`));
  const dialog = await screen.findByTestId("booking-dialog");
  expect(dialog).toBeInTheDocument();
  expect(screen.getByTestId("booking-form")).toBeInTheDocument();
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("Freie-Räume-Suche – Buchungseinstieg aus dem Treffer", () => {
  it("öffnet den Dialog mit Treffer-Raum und filterübernommenem Zeitraum, sendet genau diesen an POST /api/bookings und nimmt den Raum aus der aktualisierten Trefferliste", async () => {
    const user = userEvent.setup();
    const tag = heute();
    // Referenz auf derselben Liste: Der POST-Handler entfernt den gebuchten
    // Raum, sodass das stiller Nachladen die reduzierte Treffermenge sieht.
    const freie: Array<typeof ROOM_1 | typeof ROOM_2> = [ROOM_1, ROOM_2];
    let naechsteId = 500;

    const mock = installBackend({
      freie,
      onCreate: (koerper) => {
        freie.splice(0, freie.length, ROOM_2);
        return jsonResponse(
          {
            id: naechsteId + 1,
            roomId: koerper.roomId,
            createdBy: urheberVon(koerper),
            startsAt: koerper.startsAt,
            endsAt: koerper.endsAt,
            status: "bestaetigt",
          },
          201
        );
      },
    });
    global.fetch = mock as unknown as typeof global.fetch;

    renderAt("/free");

    // Erstladen: beide Räume als Treffer.
    await screen.findByTestId("search-grid");
    expect(screen.getAllByTestId("search-result-card")).toHaveLength(2);

    // Die Suche fragt die Available-API mit dem aktiven Filterzeitraum ab
    // (Default laut Konzept: heute, 08:00–18:00).
    expect(availableAbrufe(mock)).toEqual([
      `/api/rooms/available?${availableQuery(`${tag}T08:00:00Z`, `${tag}T18:00:00Z`)}`,
    ]);

    await oeffneDialogAusTreffer(user, ROOM_1.id);

    // Vorbelegung aus Treffer und Suchfilter: Raum 1 (im Payload unten),
    // heutiges Datum, exakter Suchzeitraum 08:00–18:00.
    expect(screen.getByTestId("booking-date")).toHaveValue(tag);
    expect(screen.getByTestId("booking-start")).toHaveValue("08:00");
    expect(screen.getByTestId("booking-end")).toHaveValue("18:00");

    await user.type(
      screen.getByTestId("booking-createdby"),
      "mitarbeiter@example.com"
    );
    await user.click(screen.getByTestId("booking-submit"));

    // Genau ein POST mit dem filterübernommenen UTC-Zeitraum und Raum 1.
    const posts = postAufrufe(mock);
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({
      roomId: 1,
      startsAt: `${tag}T08:00:00Z`,
      endsAt: `${tag}T18:00:00Z`,
      createdBy: "mitarbeiter@example.com",
    });

    // Dialog zu, Trefferliste still nachgeladen (zweiter Available-Abruf,
    // gleicher Filterzeitraum) und der gebuchte Raum fällt heraus.
    await waitFor(() => {
      expect(screen.queryByTestId("booking-dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("search-grid")).toBeInTheDocument();
    expect(
      screen.queryByTestId(`search-book-${ROOM_1.id}`)
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(`search-book-${ROOM_2.id}`)
    ).toBeInTheDocument();
    expect(availableAbrufe(mock)).toEqual([
      `/api/rooms/available?${availableQuery(`${tag}T08:00:00Z`, `${tag}T18:00:00Z`)}`,
      `/api/rooms/available?${availableQuery(`${tag}T08:00:00Z`, `${tag}T18:00:00Z`)}`,
    ]);
  });

  it("bleibt beim Konflikt (409) im offenen Dialog mit verständlicher Meldung stehen und lässt die Trefferliste unangetastet", async () => {
    const user = userEvent.setup();
    const mock = installBackend({
      freie: [ROOM_1, ROOM_2],
      onCreate: () =>
        jsonResponse(
          { error: "Der Raum ist im gewählten Zeitraum bereits gebucht." },
          409
        ),
    });
    global.fetch = mock as unknown as typeof global.fetch;

    renderAt("/free");
    await screen.findByTestId("search-grid");

    await oeffneDialogAusTreffer(user, ROOM_1.id);

    // Zeiten sind vorbelegt – nur der Urheber fehlt noch.
    expect(screen.getByTestId("booking-start")).toHaveValue("08:00");
    await user.type(
      screen.getByTestId("booking-createdby"),
      "mitarbeiter@example.com"
    );
    await user.click(screen.getByTestId("booking-submit"));

    // Die Backend-Meldung erscheint als destructives Alert im OFFENEN Dialog.
    const fehler = await screen.findByTestId("booking-save-error");
    expect(fehler).toHaveAttribute("role", "alert");
    expect(fehler).toHaveTextContent(
      "Der Raum ist im gewählten Zeitraum bereits gebucht."
    );
    expect(screen.getByTestId("booking-dialog")).toBeInTheDocument();

    // Kein Nachladen der Suche, keine Änderung an der Trefferliste.
    expect(availableAbrufe(mock)).toHaveLength(1);
    expect(screen.getAllByTestId("search-result-card")).toHaveLength(2);
  });

  it("zeigt die über die Suche angelegte Buchung anschließend im Raumkalender des Raums", async () => {
    const user = userEvent.setup();
    const buchungen: MockBuchung[] = [];
    const mock = installBackend({
      freie: [ROOM_1],
      buchungenRaum1: buchungen,
      onCreate: (koerper) => {
        const gespeichert: MockBuchung = {
          id: 501,
          roomId: Number(koerper.roomId),
          createdBy: String(koerper.createdBy),
          startsAt: String(koerper.startsAt),
          endsAt: String(koerper.endsAt),
          status: "bestaetigt",
        };
        buchungen.push(gespeichert);
        return jsonResponse(gespeichert, 201);
      },
    });
    global.fetch = mock as unknown as typeof global.fetch;

    renderAt("/free");
    await screen.findByTestId("search-grid");

    // Buchung über den Suchtreffer anlegen (Suchfilter-Zeitraum vorbelegt).
    await oeffneDialogAusTreffer(user, ROOM_1.id);
    await user.type(
      screen.getByTestId("booking-createdby"),
      "mitarbeiter@example.com"
    );
    await user.click(screen.getByTestId("booking-submit"));
    await waitFor(() => {
      expect(screen.queryByTestId("booking-dialog")).not.toBeInTheDocument();
    });

    // Sekundäraktion des Treffers: in den Raumkalender des Raums.
    await user.click(screen.getByTestId(`search-calendar-${ROOM_1.id}`));
    expect(await screen.findByTestId("room-book-button")).toBeInTheDocument();

    // Die neue Buchung steht dort als Beleg des heutigen Tags.
    const belegt = await screen.findByTestId("timegrid-slot-booked");
    expect(belegt).toHaveTextContent("08:00 – 18:00");
    expect(belegt).toHaveTextContent("Bestätigt");

    // Der Kalender hat denselben Raum geladen (Raumdetail + Buchungsliste).
    const kalenderAbrufe = mock.mock.calls.map(([pfad]) => apiUrl(pfad));
    expect(kalenderAbrufe).toContain("/api/rooms/1");
    expect(
      kalenderAbrufe.filter((url) =>
        url.startsWith("/api/bookings?roomId=1")
      ).length
    ).toBeGreaterThanOrEqual(1);
  });
});

/** Kleiner Helfer, damit der Erfolgsfall den Urheber unverändert spiegelt. */
function urheberVon(koerper: Record<string, unknown>): unknown {
  return koerper.createdBy;
}
