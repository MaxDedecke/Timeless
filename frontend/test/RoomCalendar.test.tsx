import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";
import { formatDate } from "../src/lib/format";

/**
 * Raumkalender (/rooms/:id): Absicherung über die echte App-Shell mit
 * gemocktem Backend (global.fetch, ausschließlich relative /api-Pfade).
 * Geprüft werden der Belegfall (Start-/Endzeit im Zeitraster, Status-Badge
 * mit semantischer Variante, freie Fenster unterscheidbar), der Leerfall
 * (Hinweisband, Gitter bleibt sichtbar), der Ladefehler (destructives Alert
 * mit „Erneut versuchen"), der unmittelbare Refetch nach dem Anlegen einer
 * Buchung sowie der clientseitige Tageswechsel ohne erneuten Request.
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

function morgen(): string {
  const datum = new Date(`${heute()}T00:00:00Z`);
  datum.setUTCDate(datum.getUTCDate() + 1);
  return datum.toISOString().slice(0, 10);
}

interface MockBuchung {
  id: number;
  roomId: number;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

function buchung(
  tag: string,
  startUhr: string,
  endUhr: string,
  status = "bestaetigt",
  id = 101
): MockBuchung {
  return {
    id,
    roomId: 1,
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

interface KalenderBackendOptionen {
  buchungen?: MockBuchung[];
  /** Wird bei POST /api/bookings gerufen – kann die Liste erweitern. */
  onCreate?: (body: Record<string, unknown>) => Response | Promise<Response>;
}

/**
 * Installiert das Backend der Raumkalender-Ansicht: Raumdetail und
 * Buchungsliste über relative Pfade, POST optional über onCreate.
 */
function installKalenderBackend({
  buchungen = [],
  onCreate,
}: KalenderBackendOptionen = {}) {
  const mock = vi.fn(
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
  global.fetch = mock as unknown as typeof global.fetch;
  return mock;
}

function renderAt(path: string): void {
  window.history.pushState({}, "", path);
  render(<App />);
}

/** Öffnet den Buchungsdialog über den „Raum buchen"-Button im Seitenkopf. */
async function oeffneDialog(
  user: ReturnType<typeof userEvent.setup>
): Promise<void> {
  await screen.findByTestId("room-book-button");
  await user.click(screen.getByTestId("room-book-button"));
  const dialog = await screen.findByTestId("booking-dialog");
  expect(dialog).toBeInTheDocument();
  expect(screen.getByTestId("booking-form")).toBeInTheDocument();
}

/** Füllt Start/Ende/Urheber im offenen Dialog und sendet ab (Zeiten via change). */
async function fuelleUndSende(
  user: ReturnType<typeof userEvent.setup>,
  start = "09:00",
  ende = "10:00"
): Promise<void> {
  fireEvent.change(screen.getByTestId("booking-start"), {
    target: { value: start },
  });
  fireEvent.change(screen.getByTestId("booking-end"), {
    target: { value: ende },
  });
  await user.type(screen.getByTestId("booking-createdby"), "mitarbeiter@example.com");
  await user.click(screen.getByTestId("booking-submit"));
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("RoomCalendar – Belegfall", () => {
  it("zeigt die Buchungen des Raums zeitlich geordnet mit Start-/Endzeit und Status-Badge", async () => {
    const tag = heute();
    installKalenderBackend({
      buchungen: [
        buchung(tag, "14:00", "15:30", "ausstehend", 102),
        buchung(tag, "09:05", "10:30", "bestaetigt", 101),
      ],
    });
    renderAt("/rooms/1");

    // Kopf: Raumname, Standort und Kapazität.
    expect(
      await screen.findByRole("heading", { name: "Atelier Nord", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText("Werkhaus")).toBeInTheDocument();

    // Zwei belegte Slots, sortiert nach Beginn, mit formatierten Zeiten.
    const belegt = await screen.findAllByTestId("timegrid-slot-booked");
    expect(belegt).toHaveLength(2);
    expect(belegt[0]).toHaveTextContent("09:05 – 10:30");
    expect(belegt[1]).toHaveTextContent("14:00 – 15:30");

    // Status über BookingStatusBadge: Bestätigt → Success, Ausstehend → Warning
    // (semantisches Inventar von ui/badge.tsx, keine Ad-hoc-Farben).
    const badgeBestaetigt = within(belegt[0]).getByText("Bestätigt");
    expect(badgeBestaetigt).toHaveClass("bg-success-background");
    const badgeAusstehend = within(belegt[1]).getByText("Ausstehend");
    expect(badgeAusstehend).toHaveClass("bg-warning-background");

    // Freie Fenster sind vom Beleg unterschieden (Muted-Token) und vorhanden.
    const frei = screen.getAllByTestId("timegrid-slot-free");
    expect(frei.length).toBeGreaterThanOrEqual(2);
    for (const slot of frei) {
      expect(slot).toHaveClass("bg-muted");
      expect(slot).toHaveClass("border-dashed");
    }
    expect(frei[0]).toHaveTextContent("08:00 – 09:05");
  });

  it("lädt Raum und Buchungen ausschließlich über relative /api-Pfade", async () => {
    const mock = installKalenderBackend({ buchungen: [] });
    renderAt("/rooms/1");
    await screen.findByTestId("timegrid-grid");

    const pfade = mock.mock.calls.map((aufruf: [RequestInfo | URL, RequestInit?]) =>
      apiUrl(aufruf[0])
    );
    expect(pfade).toContain("/api/rooms/1");
    expect(
      pfade.some((pfad: string) => pfad.startsWith("/api/bookings?roomId=1"))
    ).toBe(true);
  });
});

describe("RoomCalendar – Leerfall", () => {
  it("zeigt bei einer Spur ohne Buchungen das Hinweisband und lässt das Gitter sichtbar", async () => {
    installKalenderBackend({ buchungen: [] });
    renderAt("/rooms/1");

    // Leere ist hier fachlich korrekt (alle Fenster frei), kein Fehlerzustand:
    // Hinweisband über dem weiterhin gezeichneten Gitter.
    const hinweis = await screen.findByTestId("timegrid-no-bookings");
    expect(hinweis).toBeVisible();
    expect(hinweis).toHaveTextContent(
      "Für diesen Tag sind noch keine Buchungen vorhanden"
    );

    const gitter = screen.getByTestId("timegrid-grid");
    expect(gitter).toBeInTheDocument();
    const frei = within(gitter).getAllByTestId("timegrid-slot-free");
    expect(frei).toHaveLength(1); // genau das ganze Tagesfenster 08:00–20:00
    expect(frei[0]).toHaveTextContent("08:00 – 20:00");
    expect(
      screen.queryByTestId("timegrid-slot-booked")
    ).not.toBeInTheDocument();
  });
});

describe("RoomCalendar – Ladezustand und Fehler", () => {
  it("zeigt beim Laden das Raster-Skeleton statt alter Inhalte", async () => {
    // Nie auflösende Requests: der Ladezustand bleibt sichtbar.
    global.fetch = vi.fn(
      (_input: RequestInfo | URL): Promise<Response> =>
        new Promise<Response>(() => undefined)
    ) as unknown as typeof global.fetch;
    renderAt("/rooms/1");

    const ladend = await screen.findByTestId("timegrid-loading");
    expect(ladend).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();
  });

  it("zeigt bei Ladefehler ein destructives Alert mit Rückweg zur Raumliste", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(async (): Promise<Response> => {
      throw new Error("Netzwerk weg");
    }) as unknown as typeof global.fetch;
    renderAt("/rooms/1");

    const fehler = await screen.findByTestId("room-calendar-error");
    expect(fehler).toHaveAttribute("role", "alert");
    expect(fehler).toHaveTextContent("Kalender konnte nicht geladen werden");
    expect(fehler).toHaveTextContent("Erneut versuchen");
    expect(
      within(fehler).getByRole("link", { name: "Zurück zur Raumliste" })
    ).toBeInTheDocument();

    // „Erneut versuchen" setzt in den Ladezustand zurück und holt neu.
    installKalenderBackend({ buchungen: [] });
    await user.click(screen.getByTestId("room-calendar-retry"));
    expect(await screen.findByTestId("timegrid-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("room-calendar-error")).not.toBeInTheDocument();
  });

  it("wertet einen 404 des Raums als verständliche Meldung, nicht als Serverfehler", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = apiUrl(input);
      if (url === "/api/rooms/999") {
        return jsonResponse({ error: "Raum nicht gefunden." }, 404);
      }
      throw new Error(`Unerwarteter API-Pfad: ${url}`);
    }) as unknown as typeof global.fetch;
    renderAt("/rooms/999");

    const fehler = await screen.findByTestId("room-calendar-error");
    expect(fehler).toHaveTextContent("Raum nicht gefunden.");
  });
});

describe("RoomCalendar – Buchung anlegen und sofort sehen", () => {
  it("legt eine Buchung an und zeigt sie nach dem Refetch ohne manuellen Reload", async () => {
    const user = userEvent.setup();
    const tag = heute();
    const liste: MockBuchung[] = [];
    let naechsteId = 201;

    installKalenderBackend({
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
    renderAt("/rooms/1");

    // Leerfall zuerst: Hinweisband sichtbar, noch kein belegter Slot.
    await screen.findByTestId("timegrid-no-bookings");
    expect(
      screen.queryByTestId("timegrid-slot-booked")
    ).not.toBeInTheDocument();

    await oeffneDialog(user);
    await fuelleUndSende(user);

    // Der POST trug Raum, Tag des Kalenders und Zeiten als UTC-ISO.
    await waitFor(() => {
      expect(liste).toHaveLength(1);
    });
    expect(liste[0].roomId).toBe(1);
    expect(liste[0].startsAt).toBe(`${tag}T09:00:00Z`);
    expect(liste[0].endsAt).toBe(`${tag}T10:00:00Z`);
    expect(liste[0].createdBy).toBe("mitarbeiter@example.com");

    // Unmittelbares Erscheinen (AK): Nach dem Speichern wird die Buchungs-
    // liste neu geladen – der neue Beleg ist im Gitter, ohne Seitenreload.
    const belegt = await screen.findByTestId("timegrid-slot-booked");
    expect(belegt).toHaveTextContent("09:00 – 10:00");
    expect(within(belegt).getByText("Bestätigt")).toBeInTheDocument();
    expect(
      screen.queryByTestId("timegrid-no-bookings")
    ).not.toBeInTheDocument();

    // Bei Erfolg ist der Dialog geschlossen, es bleibt keine Fehlermeldung.
    expect(screen.queryByTestId("booking-save-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("booking-dialog")).not.toBeInTheDocument();
  });

  it("zeigt einen Doppelbuchungs-Konflikt (409) als verständliches Alert und lässt das Formular offen", async () => {
    const user = userEvent.setup();
    installKalenderBackend({
      buchungen: [],
      onCreate: () =>
        jsonResponse(
          { error: "Der Raum ist im gewählten Zeitraum bereits gebucht." },
          409
        ),
    });
    renderAt("/rooms/1");
    await oeffneDialog(user);
    await fuelleUndSende(user);

    const fehler = await screen.findByTestId("booking-save-error");
    expect(fehler).toHaveAttribute("role", "alert");
    expect(fehler).toHaveTextContent("Speichern fehlgeschlagen");
    expect(fehler).toHaveTextContent(
      "Der Raum ist im gewählten Zeitraum bereits gebucht."
    );
    // Keine stille Ablehnung: Der Kalender zeigt weiter den Leerzustand,
    // der Dialog bleibt offen und wieder bedienbar.
    expect(screen.queryByTestId("timegrid-slot-booked")).not.toBeInTheDocument();
    expect(screen.getByTestId("booking-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("booking-form")).toBeInTheDocument();
    expect(screen.getByTestId("booking-submit")).toBeEnabled();
  });

  it("prüft Pflichtfelder clientseitig, bevor ein Request gesendet wird", async () => {
    const user = userEvent.setup();
    const mock = installKalenderBackend({ buchungen: [] });
    renderAt("/rooms/1");
    await oeffneDialog(user);

    // Leeres Formular absenden: Feldfehler unter den Feldern, kein POST.
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
      (aufruf: [RequestInfo | URL, RequestInit?]) =>
        apiUrl(aufruf[0]) === "/api/bookings" && aufruf[1]?.method === "POST"
    );
    expect(posts).toHaveLength(0);

    // Ende vor Anfang wird ebenfalls clientseitig abgefangen.
    fireEvent.change(screen.getByTestId("booking-start"), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByTestId("booking-end"), {
      target: { value: "09:00" },
    });
    await user.click(screen.getByTestId("booking-submit"));
    expect(screen.getByTestId("booking-end-error")).toHaveTextContent(
      "Die Endzeit muss nach der Startzeit liegen."
    );
    const postsDanach = mock.mock.calls.filter(
      (aufruf: [RequestInfo | URL, RequestInit?]) =>
        apiUrl(aufruf[0]) === "/api/bookings" && aufruf[1]?.method === "POST"
    );
    expect(postsDanach).toHaveLength(0);
  });
});

describe("RoomCalendar – Tageswechsel", () => {
  it("filtert Buchungen clientseitig auf den gewählten Tag, ohne erneut zu laden", async () => {
    const mock = installKalenderBackend({
      buchungen: [
        buchung(heute(), "09:05", "10:30", "bestaetigt", 101),
        buchung(morgen(), "14:00", "15:30", "bestaetigt", 102),
      ],
    });
    renderAt("/rooms/1");

    // Heute: nur die Vormittagsbuchung im Gitter …
    const heutigerBeleg = await screen.findByTestId("timegrid-slot-booked");
    expect(heutigerBeleg).toHaveTextContent("09:05 – 10:30");
    expect(screen.queryByText("14:00 – 15:30")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("room-calendar-date-label")
    ).toHaveTextContent(formatDate(`${heute()}T12:00:00Z`));

    // … ein Tag vor: nur die Nachmittagsbuchung des Folgetags, ohne dass
    // ein zweiter Buchungs-Request läuft (clientseitige Filterung). Der
    // Folgetags-Beleg ist im DOM, sobald der heutige verschwunden ist.
    await userEvent
      .setup()
      .click(screen.getByTestId("room-calendar-next-day"));
    await waitFor(() => {
      expect(screen.queryByText("09:05 – 10:30")).not.toBeInTheDocument();
    });
    const folgeBeleg = screen.getByTestId("timegrid-slot-booked");
    expect(folgeBeleg).toHaveTextContent("14:00 – 15:30");
    expect(screen.queryByText("09:05 – 10:30")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("room-calendar-date-label")
    ).toHaveTextContent(formatDate(`${morgen()}T12:00:00Z`));

    const buchungsAbrufe = mock.mock.calls.filter(
      (aufruf: [RequestInfo | URL, RequestInit?]) =>
        apiUrl(aufruf[0]).startsWith("/api/bookings?roomId=")
    );
    expect(buchungsAbrufe).toHaveLength(1);

    // „Heute" führt zurück auf den aktuellen Tag.
    await userEvent.setup().click(screen.getByTestId("room-calendar-today"));
    expect(await screen.findByText("09:05 – 10:30")).toBeInTheDocument();
  });

  it("springt per „Heute“ auf den aktuellen Tag zurück", async () => {
    const user = userEvent.setup();
    installKalenderBackend({ buchungen: [] });
    renderAt("/rooms/1");
    await screen.findByTestId("timegrid-no-bookings");

    await user.click(screen.getByTestId("room-calendar-next-day"));
    expect(screen.getByTestId("room-calendar-date-label")).toHaveTextContent(
      formatDate(`${morgen()}T12:00:00Z`)
    );
    await user.click(screen.getByTestId("room-calendar-today"));
    expect(screen.getByTestId("room-calendar-date-label")).toHaveTextContent(
      formatDate(`${heute()}T12:00:00Z`)
    );
  });
});
