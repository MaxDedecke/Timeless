import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

/**
 * Buchungsdialog im Raumkalender (pages/BookingForm.tsx): Absicherung der
 * beiden Kernfälle über die echte App-Shell mit gemocktem Backend
 * (global.fetch, ausschließlich relative /api-Pfade) – Erfolgsfall (POST mit
 * korrektem Payload, Dialog schließt, neue Buchung erscheint nach dem Refetch
 * unmittelbar im Zeitgitter) und Konfliktfall (HTTP 409 mit verständlicher
 * Backend-Meldung als destructives Alert IM OFFENEN Dialog, Eingaben bleiben
 * erhalten, nichts wird gespeichert). Dazu der Submit-Ladezustand (Button
 * deaktiviert mit Inline-Spinner, Dialog bleibt offen) und die clientseitige
 * Pflichtfeldprüfung ohne Request.
 */

const ROOM_1 = {
  id: 1,
  name: "Atelier Nord",
  locationId: 7,
  capacity: 12,
  amenities: [{ key: "beamer", label: "Beamer" }],
  location: { id: 7, name: "Werkhaus" },
};

/** Heutiges Datum wie die Seite es als Default wählt („YYYY-MM-DD"). */
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
  buchungen?: MockBuchung[];
  /** Wird bei POST /api/bookings gerufen – kann die Liste erweitern. */
  onCreate?: (body: Record<string, unknown>) => Response | Promise<Response>;
}

/**
 * Installiert das Backend des Raumkalenders: Raumdetail und Buchungsliste,
 * POST optional über onCreate. Liefert den Mock zurück, damit Tests die
 * Aufrufe auswerten können.
 */
function installBackend({ buchungen = [], onCreate }: BackendOptionen = {}) {
  return vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = apiUrl(input);
      if (!url.startsWith("/api/")) {
        throw new Error(`Nicht-relativer Pfad: ${url}`);
      }
      if (url === `/api/rooms/${ROOM_1.id}`) return jsonResponse(ROOM_1);
      if (url.startsWith(`/api/bookings?roomId=${ROOM_1.id}`)) {
        return jsonResponse(buchungen);
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

/** Öffnet den Dialog und füllt Datum, Zeiten und Urheber (Zeiten via change). */
async function oeffneUndFuelle(
  user: ReturnType<typeof userEvent.setup>,
  felder: { datum?: string; start?: string; ende?: string; urheber?: string } = {}
): Promise<void> {
  await screen.findByTestId("room-book-button");
  await user.click(screen.getByTestId("room-book-button"));
  const dialog = await screen.findByTestId("booking-dialog");
  expect(dialog).toBeInTheDocument();
  expect(screen.getByTestId("booking-form")).toBeInTheDocument();

  if (felder.datum !== undefined) {
    fireEvent.change(screen.getByTestId("booking-date"), {
      target: { value: felder.datum },
    });
  }
  fireEvent.change(screen.getByTestId("booking-start"), {
    target: { value: felder.start ?? "09:00" },
  });
  fireEvent.change(screen.getByTestId("booking-end"), {
    target: { value: felder.ende ?? "10:00" },
  });
  await user.type(
    screen.getByTestId("booking-createdby"),
    felder.urheber ?? "mitarbeiter@example.com"
  );
  await user.click(screen.getByTestId("booking-submit"));
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("BookingForm – Erfolgsfall", () => {
  it("sendet Raum, Datum, Start/Ende als UTC-ISO und Urheber an POST /api/bookings, schließt den Dialog und zeigt die neue Buchung im Kalender", async () => {
    const user = userEvent.setup();
    const tag = heute();
    const liste: MockBuchung[] = [];
    let naechsteId = 301;

    const mock = installBackend({
      buchungen: liste,
      onCreate: (koerper) => {
        const gespeichert: MockBuchung = {
          id: naechsteId,
          roomId: Number(koerper.roomId),
          createdBy: String(koerper.createdBy),
          startsAt: String(koerper.startsAt),
          endsAt: String(koerper.endsAt),
          status: "bestaetigt",
        };
        liste.push(gespeichert);
        naechsteId += 1;
        return jsonResponse(gespeichert, 201);
      },
    });
    global.fetch = mock as unknown as typeof global.fetch;

    renderAt("/rooms/1");

    // Leerfall zuerst: Hinweisband statt Beleg …
    await screen.findByTestId("room-book-button");
    await screen.findByTestId("timegrid-no-bookings");

    await oeffneUndFuelle(user, { datum: tag, start: "09:00", ende: "10:30" });

    // … nach Submit+Refetch erscheint die neue Buchung unmittelbar im Gitter.
    const belegt = await screen.findByTestId("timegrid-slot-booked");
    expect(belegt).toHaveTextContent("09:00 – 10:30");
    expect(belegt).toHaveTextContent("Bestätigt");

    // Der Dialog ist geschlossen.
    expect(screen.queryByTestId("booking-dialog")).not.toBeInTheDocument();

    // Der POST trug genau den dokumentierten Vertrag: Raum-ID, UTC-ISO-Zeiten
    // („YYYY-MM-DDTHH:mm:00Z"), getrimmter Urheber.
    const posts = mock.mock.calls.filter(
      ([pfad, init]) => apiUrl(pfad) === "/api/bookings" && init?.method === "POST"
    );
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({
      roomId: 1,
      startsAt: `${tag}T09:00:00Z`,
      endsAt: `${tag}T10:30:00Z`,
      createdBy: "mitarbeiter@example.com",
    });

    // Nach dem Schließen wurde die Liste neu geladen (zweiter Listenabruf).
    const listenAbrufe = mock.mock.calls.filter(([pfad]) =>
      apiUrl(pfad).startsWith("/api/bookings?roomId=1")
    );
    expect(listenAbrufe.length).toBeGreaterThanOrEqual(2);
  });

  it("öffnet den Dialog mit dem gewählten Kalendertag vorausgefüllt und prüft Pflichtfelder clientseitig", async () => {
    const user = userEvent.setup();
    const mock = installBackend({ buchungen: [] });
    global.fetch = mock as unknown as typeof global.fetch;

    renderAt("/rooms/1");
    await screen.findByTestId("room-book-button");
    await user.click(screen.getByTestId("room-book-button"));
    await screen.findByTestId("booking-dialog");

    expect(screen.getByTestId("booking-date")).toHaveValue(heute());
    // Leeres Absenden: Feldfehler unter den Feldern, kein POST unterwegs.
    await user.click(screen.getByTestId("booking-submit"));
    expect(screen.getByTestId("booking-start-error")).toHaveTextContent(
      "Bitte gib eine Startzeit ein."
    );
    expect(screen.getByTestId("booking-end-error")).toHaveTextContent(
      "Bitte gib eine Endzeit ein."
    );
    expect(screen.getByTestId("booking-createdby-error")).toHaveTextContent(
      "Bitte gib deine E-Mail-Adresse als Urheber an."
    );

    const posts = mock.mock.calls.filter(
      ([pfad, init]) => apiUrl(pfad) === "/api/bookings" && init?.method === "POST"
    );
    expect(posts).toHaveLength(0);
  });
});

describe("BookingForm – Konfliktfall (409)", () => {
  it("zeigt die verständliche Backend-Meldung im offenen Dialog, erhält die Eingaben und speichert nicht", async () => {
    const user = userEvent.setup();
    const liste: MockBuchung[] = [];
    const mock = installBackend({
      buchungen: liste,
      onCreate: () =>
        jsonResponse(
          { error: "Der Raum ist im gewählten Zeitraum bereits gebucht." },
          409
        ),
    });
    global.fetch = mock as unknown as typeof global.fetch;

    renderAt("/rooms/1");
    await screen.findByTestId("timegrid-no-bookings");
    await oeffneUndFuelle(user);

    // Die Backend-Meldung erscheint als destructives Alert INNERHALB des
    // weiterhin offenen Dialogs – nicht als Toast, nicht als Seitenwechsel.
    const fehler = await screen.findByTestId("booking-save-error");
    expect(fehler).toHaveAttribute("role", "alert");
    expect(fehler).toHaveTextContent("Speichern fehlgeschlagen");
    expect(fehler).toHaveTextContent(
      "Der Raum ist im gewählten Zeitraum bereits gebucht."
    );
    expect(screen.getByTestId("booking-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("booking-form")).toBeInTheDocument();

    // Nichts gespeichert: keine Buchungsliste, kein Beleg im Kalender, und
    // der Speichern-Button ist wieder bedienbar (kein Spinner).
    expect(liste).toHaveLength(0);
    expect(
      screen.queryByTestId("timegrid-slot-booked")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("booking-save-spinner")).not.toBeInTheDocument();
    expect(screen.getByTestId("booking-submit")).toBeEnabled();

    // Die Eingaben sind erhalten – korrigieren statt neu tippen.
    expect(screen.getByTestId("booking-start")).toHaveValue("09:00");
    expect(screen.getByTestId("booking-end")).toHaveValue("10:00");
    expect(screen.getByTestId("booking-createdby")).toHaveValue(
      "mitarbeiter@example.com"
    );

    // Kein zweiter Listenabruf: Ein Konflikt lädt den Kalender nicht neu.
    const listenAbrufe = mock.mock.calls.filter(([pfad]) =>
      apiUrl(pfad).startsWith("/api/bookings?roomId=1")
    );
    expect(listenAbrufe).toHaveLength(1);
  });
});

describe("BookingForm – Submit-Ladezustand", () => {
  it("bleibt beim laufenden Request im offenen Dialog: Button deaktiviert mit Inline-Spinner", async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: Response) => void;
    const liste: MockBuchung[] = [];

    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = apiUrl(input);
        if (url === `/api/rooms/${ROOM_1.id}`) return jsonResponse(ROOM_1);
        if (url.startsWith(`/api/bookings?roomId=${ROOM_1.id}`)) {
          return jsonResponse(liste);
        }
        if (url === "/api/bookings" && init?.method === "POST") {
          return new Promise<Response>((resolve) => {
            resolvePost = resolve;
          });
        }
        throw new Error(`Unerwarteter API-Pfad: ${url}`);
      }
    ) as unknown as typeof global.fetch;

    renderAt("/rooms/1");
    await screen.findByTestId("timegrid-no-bookings");
    await oeffneUndFuelle(user);

    // Während der Request offen ist: Dialog bleibt offen, Submit-Button
    // deaktiviert mit Spinner, noch keine Fehlermeldung.
    await waitFor(() => {
      expect(screen.getByTestId("booking-submit")).toBeDisabled();
    });
    expect(screen.getByTestId("booking-save-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("booking-save-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("booking-dialog")).toBeInTheDocument();

    // Löst der Request erfolgreich auf, schließt der Dialog und der Kalender
    // zeigt die neue Buchung.
    resolvePost(
      jsonResponse(
        {
          id: 400,
          roomId: 1,
          createdBy: "mitarbeiter@example.com",
          startsAt: `${heute()}T09:00:00Z`,
          endsAt: `${heute()}T10:00:00Z`,
          status: "bestaetigt",
        },
        201
      )
    );
    liste.push({
      id: 400,
      roomId: 1,
      createdBy: "mitarbeiter@example.com",
      startsAt: `${heute()}T09:00:00Z`,
      endsAt: `${heute()}T10:00:00Z`,
      status: "bestaetigt",
    });
    const belegt = await screen.findByTestId("timegrid-slot-booked");
    expect(belegt).toHaveTextContent("09:00 – 10:00");
    expect(screen.queryByTestId("booking-dialog")).not.toBeInTheDocument();
  });
});

describe("BookingForm – Abbrechen", () => {
  it("schließt den Dialog per „Abbrechen“, ohne das Formular abzusenden", async () => {
    const user = userEvent.setup();
    // Kein onCreate-Handler: Ein versehentlicher POST würde den Test mit
    // „Unerwarteter POST ohne Handler" brechen lassen.
    const mock = installBackend({ buchungen: [] });
    global.fetch = mock as unknown as typeof global.fetch;

    renderAt("/rooms/1");
    await screen.findByTestId("timegrid-no-bookings");
    await user.click(screen.getByTestId("room-book-button"));
    const dialog = await screen.findByTestId("booking-dialog");
    expect(dialog).toBeInTheDocument();

    // Eingaben stehen lassen: Abbrechen darf sie weder senden noch als
    // Feldfehler quittieren – der Dialog schließt einfach.
    fireEvent.change(screen.getByTestId("booking-start"), {
      target: { value: "09:00" },
    });
    await user.type(screen.getByTestId("booking-createdby"), "mitarbeiter@example.com");

    await user.click(screen.getByTestId("booking-cancel"));

    expect(screen.queryByTestId("booking-dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("booking-save-error")).not.toBeInTheDocument();

    // Weder ein POST unterwegs noch ein zweiter Listenabruf ausgelöst –
    // der Kalender bleibt unverändert im Leerzustand stehen.
    const posts = mock.mock.calls.filter(
      ([pfad, init]) =>
        apiUrl(pfad) === "/api/bookings" && init?.method === "POST"
    );
    expect(posts).toHaveLength(0);
    const listenAbrufe = mock.mock.calls.filter(([pfad]) =>
      apiUrl(pfad).startsWith("/api/bookings?roomId=1")
    );
    expect(listenAbrufe).toHaveLength(1);
    expect(screen.getByTestId("timegrid-no-bookings")).toBeInTheDocument();
  });
});
