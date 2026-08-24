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
 * (Hinweisband, Gitter bleibt sichtbar) samt Rückkehr ins Band beim Wechsel
 * von einem belegten auf einen buchungsfreien Tag inklusive Neuladen über
 * „Aktualisieren" im Band, der Ladefehler (destructives Alert mit „Erneut
 * versuchen"), der unmittelbare Refetch nach dem Anlegen einer Buchung sowie
 * der clientseitige Tageswechsel ohne erneuten Request.
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
  /** Wird bei POST /api/bookings/:id/check-in gerufen. */
  onCheckIn?: (id: number) => Response | Promise<Response>;
}

/**
 * Installiert das Backend der Raumkalender-Ansicht: Raumdetail und
 * Buchungsliste über relative Pfade, POST optional über onCreate und
 * Check-in optional über onCheckIn.
 */
function installKalenderBackend({
  buchungen = [],
  onCreate,
  onCheckIn,
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
      const checkInMatch = /^\/api\/bookings\/(\d+)\/check-in$/.exec(url);
      if (checkInMatch !== null && init?.method === "POST") {
        if (onCheckIn === undefined) {
          throw new Error(`Unerwarteter Check-in ohne Handler: ${url}`);
        }
        return onCheckIn(Number(checkInMatch[1]));
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

    // Kopf: Raumname, Standort, Kapazität – Datums-/Zahlenangaben mit
    // tabellarischen Ziffern (Konzept-Pflicht, Design-Review).
    expect(
      await screen.findByRole("heading", { name: "Atelier Nord", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText("Werkhaus")).toBeInTheDocument();
    expect(screen.getByTestId("room-calendar-date-label")).toHaveClass(
      "tabular-nums"
    );
    const kapazitaet = screen.getByText(/Personen/);
    expect(kapazitaet).toHaveClass("tabular-nums");

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
    expect(within(frei[0]).getByText(/08:00/)).toHaveClass("tabular-nums");
    expect(
      screen.queryByTestId("timegrid-slot-booked")
    ).not.toBeInTheDocument();
  });

  it("kehrt beim Wechsel auf einen buchungsfreien Tag ins Hinweisband zurück und lässt das Gitter stehen", async () => {
    const mock = installKalenderBackend({
      buchungen: [buchung(heute(), "09:00", "10:00", "bestaetigt", 103)],
    });
    renderAt("/rooms/1");

    // Ausgangslage: belegter Tag ohne Hinweisband …
    const belegt = await screen.findByTestId("timegrid-slot-booked");
    expect(belegt).toHaveTextContent("09:00 – 10:00");
    expect(
      screen.queryByTestId("timegrid-no-bookings")
    ).not.toBeInTheDocument();

    // … ein Tag weiter ist der Raum frei: dokumentierter Leerzustand als
    // Hinweisband über dem weiterhin gezeichneten Gitter – kein stummes
    // leeres Raster und keine falsche „Keine Räume“-Empty-Card (die wäre
    // hier sachlich falsch, der Raum existiert ja).
    await userEvent
      .setup()
      .click(screen.getByTestId("room-calendar-next-day"));
    const hinweis = await screen.findByTestId("timegrid-no-bookings");
    expect(hinweis).toBeVisible();
    expect(hinweis).toHaveTextContent(
      "Für diesen Tag sind noch keine Buchungen vorhanden"
    );
    const gitter = screen.getByTestId("timegrid-grid");
    expect(gitter).toBeVisible();
    const frei = within(gitter).getAllByTestId("timegrid-slot-free");
    expect(frei).toHaveLength(1);
    expect(frei[0]).toHaveTextContent("08:00 – 20:00");
    expect(
      screen.queryByTestId("timegrid-slot-booked")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("timegrid-empty")).not.toBeInTheDocument();

    // Der Tageswechsel bleibt clientseitig gefiltert: kein zweiter Abruf
    // der Buchungsliste.
    const abrufe = mock.mock.calls.filter(
      (aufruf: [RequestInfo | URL, RequestInit?]) =>
        apiUrl(aufruf[0]).startsWith("/api/bookings?roomId=")
    );
    expect(abrufe).toHaveLength(1);
  });

  it("lädt über „Aktualisieren“ im Hinweisband Raum und Buchungen erneut", async () => {
    const user = userEvent.setup();
    const mock = installKalenderBackend({ buchungen: [] });
    renderAt("/rooms/1");
    await screen.findByTestId("timegrid-no-bookings");

    await user.click(
      within(screen.getByTestId("timegrid-no-bookings")).getByRole("button", {
        name: "Aktualisieren",
      })
    );

    // Nach dem Neuladen ist der Leerzustand wieder erreicht (der Raum bleibt
    // buchungsfrei) und die Ansicht hat beide Requests neu gestellt.
    expect(await screen.findByTestId("timegrid-no-bookings")).toBeVisible();
    const abrufe = mock.mock.calls.filter(
      (aufruf: [RequestInfo | URL, RequestInit?]) =>
        apiUrl(aufruf[0]).startsWith("/api/bookings?roomId=")
    );
    expect(abrufe).toHaveLength(2);
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

describe("RoomCalendar – Check-in der laufenden eigenen Buchung", () => {
  /**
   * Zeiten relativ zur REALEN Uhrzeit statt Fake-Timern: Beginn vor 3,
   * Ende in 57 Minuten – die Buchung läuft garantiert und ihr
   * Check-in-Fenster ([Beginn, Beginn+Frist)) umfasst „jetzt" für die
   * Dauer des Tests, egal wie viele Millisekunden vergehen. Die Seiten
   * nehmen ihre „laufend"-Bewertung ohnehin mit realer Uhrzeit vor.
   */
  function laufendeZeiten(): { start: string; end: string } {
    const jetzt = Date.now();
    return {
      start: new Date(jetzt - 3 * 60_000).toISOString(),
      end: new Date(jetzt + 57 * 60_000).toISOString(),
    };
  }

  /**
   * Eine garantiert BEENDETE eigene Buchung (24–25 Stunden zurück): Sie
   * schneidet den dargestellten Tag nie – egal wann der Test läuft – und
   * dürfte daher weder als Beleg noch mit Check-in erscheinen.
   */
  function vergangeneZeiten(): { start: string; end: string } {
    const jetzt = Date.now();
    return {
      start: new Date(jetzt - 25 * 60 * 60_000).toISOString(),
      end: new Date(jetzt - 24 * 60 * 60_000).toISOString(),
    };
  }

  /** localStorage-Naht auf die Test-Person setzen (wie nach einem Login). */
  function alsNutzer(email: string): void {
    window.localStorage.setItem("timeless.currentUser", email);
  }

  function eigeneBuchung(
    id: number,
    zeiten: { start: string; end: string },
    urheber = "mitarbeiter@example.com"
  ): MockBuchung {
    return {
      id,
      roomId: 1,
      createdBy: urheber,
      startsAt: zeiten.start,
      endsAt: zeiten.end,
      status: "bestaetigt",
    };
  }

  afterEach(() => {
    // Die Nutzer-Naht zurücksetzen, damit keine Testreihenfolge abhängig ist.
    window.localStorage.removeItem("timeless.currentUser");
  });

  it("zeigt an der laufenden eigenen Buchung den Check-in-Button, checkt ein und lädt die Liste neu", async () => {
    const user = userEvent.setup();
    alsNutzer("mitarbeiter@example.com");
    const liste: MockBuchung[] = [eigeneBuchung(101, laufendeZeiten())];
    const mock = installKalenderBackend({
      buchungen: liste,
      onCheckIn: (id) => {
        const eintrag = liste.find((b) => b.id === id)!;
        eintrag.status = "eingecheckt";
        return jsonResponse(eintrag, 200);
      },
    });
    renderAt("/rooms/1");

    // Beleg da, Button sichtbar (eigene + laufend + innerhalb der Frist).
    await screen.findByTestId("timegrid-slot-booked");
    const button = screen.getByTestId("timegrid-checkin-101");

    // Klick → POST auf den dokumentierten Endpunkt …
    await user.click(button);
    await waitFor(() => {
      expect(
        mock.mock.calls.some(
          (aufruf: [RequestInfo | URL, RequestInit?]) =>
            apiUrl(aufruf[0]) === "/api/bookings/101/check-in"
        )
      ).toBe(true);
    });

    // … Refetch der Liste → Badge „Eingecheckt", Button entfällt.
    expect(await screen.findByText("Eingecheckt")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByTestId("timegrid-checkin-101")
      ).not.toBeInTheDocument();
    });
    const listenAbrufe = mock.mock.calls.filter(
      (aufruf: [RequestInfo | URL, RequestInit?]) =>
        apiUrl(aufruf[0]).startsWith("/api/bookings?roomId=1")
    );
    expect(listenAbrufe.length).toBeGreaterThanOrEqual(2);
  });

  it("zeigt keinen Check-in-Button bei fremder oder nicht laufender Buchung", async () => {
    alsNutzer("mitarbeiter@example.com");
    installKalenderBackend({
      buchungen: [
        eigeneBuchung(111, laufendeZeiten(), "andere@designfreak.de"),
        // Beendet und außerhalb des Tagesfensters: kein Beleg, kein Button.
        eigeneBuchung(112, vergangeneZeiten()),
      ],
    });
    renderAt("/rooms/1");

    // Nur die fremde, laufende Buchung erscheint als Beleg – die eigene
    // vergangene liegt außerhalb des Tagesfensters.
    await screen.findByTestId("timegrid-slot-booked");
    expect(screen.getAllByTestId("timegrid-slot-booked")).toHaveLength(1);
    expect(screen.queryByTestId(/timegrid-checkin-/)).not.toBeInTheDocument();
  });

  it("zeigt bei gescheitertem Check-in das destructive Inline-Feedback am Block statt eines Toasts", async () => {
    const user = userEvent.setup();
    alsNutzer("mitarbeiter@example.com");
    installKalenderBackend({
      buchungen: [eigeneBuchung(113, laufendeZeiten())],
      onCheckIn: () =>
        jsonResponse(
          {
            error:
              "Die Buchung läuft derzeit nicht – ein Check-in ist nur während des gebuchten Zeitraums möglich.",
          },
          409
        ),
    });
    renderAt("/rooms/1");

    const button = await screen.findByTestId("timegrid-checkin-113");
    await user.click(button);

    const fehler = await screen.findByTestId("timegrid-checkin-error-113");
    expect(fehler).toHaveAttribute("role", "alert");
    expect(fehler).toHaveTextContent("Check-in fehlgeschlagen");
    expect(fehler).toHaveTextContent("Die Buchung läuft derzeit nicht");
    // Der Button bleibt für einen zweiten Versuch bedienbar.
    expect(button).toBeEnabled();
    // Kein Toast für adressierbare Fehler (Konzept-Regel).
    expect(document.querySelector("[data-sonner-toast]")).toBeNull();
  });
});

