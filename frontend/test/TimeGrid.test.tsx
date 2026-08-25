import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import TimeGrid, {
  type TimeGridBooking,
  type TimeGridLane,
} from "../src/components/TimeGrid";

/**
 * TimeGrid: gemeinsames Zeitraster für Raumkalender und Tagesansicht.
 * Geprüft wird die Slot-Darstellung laut Konzept: belegte Slots mit
 * formatTime-Beschriftung (lib/format, de-DE, HH:mm) und BookingStatusBadge,
 * freie Slots visuell über das Muted-Token abgesetzt, dazu alle drei
 * Zustände (lädt als Skeleton im Rasterlayout, Fehler als destructives
 * Alert mit „Erneut versuchen“, Leere als eigene Card) und die Zuordnung
 * der Buchungen zu ihrer Spur bei mehreren Räumen. Reines jsdom-Rendering
 * ohne Radix-Formularelemente – kein ResizeObserver-Stub nötig.
 */

function lane(id: number, title: string, bookings: TimeGridBooking[]): TimeGridLane {
  return { id, title, bookings };
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
});

describe("TimeGrid – Slot-Darstellung", () => {
  it("zeigt einen belegten Slot mit formatTime-Zeiten und Status-Badge", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            { id: 101, start: "2026-08-23T09:05:00", end: "2026-08-23T10:30:00", status: "bestaetigt" },
          ]),
        ]}
      />
    );

    const booked = screen.getByTestId("timegrid-slot-booked");
    // Formatierung ausschließlich über lib/format: „HH:mm“ mit führenden Nullen.
    expect(booked).toHaveTextContent("09:05 – 10:30");
    const badge = within(booked).getByText("Bestätigt");
    expect(badge).toHaveClass("bg-success-background");
    // Konzept-Pflicht: Uhrzeiten im Zeitraster mit tabellarischen Ziffern.
    expect(within(booked).getByText(/09:05/)).toHaveClass("tabular-nums");
  });

  it("setzt freie Slots visuell über den Muted-Token vom Beleg ab", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            { id: 101, start: "09:00", end: "10:00", status: "bestaetigt" },
          ]),
        ]}
      />
    );

    expect(screen.getByTestId("timegrid-slot-booked")).toHaveClass("bg-primary-tint");

    const freeSlots = screen.getAllByTestId("timegrid-slot-free");
    // Vor und nach der Buchung je ein freies Fenster (08:00–09:00, 10:00–20:00).
    expect(freeSlots).toHaveLength(2);
    for (const free of freeSlots) {
      expect(free).toHaveClass("bg-muted");
      expect(free).toHaveClass("border-dashed");
    }
    expect(freeSlots[0]).toHaveTextContent("08:00 – 09:00");
    expect(freeSlots[1]).toHaveTextContent("10:00 – 20:00");

    // Konzept-Pflicht „tabular-nums“ gilt auch für die freien Fenster,
    // nicht nur für belegte Slots und Badges.
    for (const free of freeSlots) {
      expect(within(free).getByText(/08:00|10:00/)).toHaveClass("tabular-nums");
    }
  });

  it("mappt den Buchungsstatus über BookingStatusBadge (ausstehend → Warning)", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Werkstatt Ost", [
            { id: 102, start: "14:00", end: "15:30", status: "ausstehend" },
          ]),
        ]}
      />
    );

    const badge = within(screen.getByTestId("timegrid-slot-booked")).getByText(
      "Ausstehend"
    );
    expect(badge).toHaveClass("bg-warning-background");
    expect(badge).toHaveClass("text-warning");
  });

  it("rendert einen no-show-freigegebenen Slot mit free-Style, Badge 'Nicht erschienen' und ohne Check-in-Button", () => {
    // Ein no-show-freigegebener Slot: Der Block wechselt vom Beleg-Stil in
    // den freien Stil (Muted-Fläche mit gestricheltem Rand) und zeigt das
    // Badge 'Nicht erschienen' – aber keinen Check-in-Button mehr.
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 103,
              start: "09:00",
              end: "10:00",
              status: "nicht erschienen",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );

    const slot = screen.getByTestId("timegrid-slot-booked");
    // Free-Style: Muted-Fläche mit gestricheltem Rand, keine Primary-Tönung.
    expect(slot).toHaveClass("bg-muted");
    expect(slot).toHaveClass("border-dashed");
    expect(slot).not.toHaveClass("bg-primary-tint");
    // Badge 'Nicht erschienen' ist sichtbar (default-Variante, neutral).
    const badge = within(slot).getByText("Nicht erschienen");
    expect(badge).toHaveClass("bg-muted");
    expect(badge).toHaveClass("text-foreground");
    // Kein Check-in-Button – die Buchung ist beendet und freigegeben.
    expect(
      within(slot).queryByTestId(/timegrid-checkin-/)
    ).not.toBeInTheDocument();
    expect(
      within(slot).queryByText("Check-in")
    ).not.toBeInTheDocument();
    // Die Zeiten sind weiterhin lesbar und mit tabular-nums formatiert.
    expect(slot).toHaveTextContent("09:00 – 10:00");
    expect(within(slot).getByText(/09:00/)).toHaveClass("tabular-nums");
  });

  it("rendert direkt aneinander grenzende Buchungen ohne dazwischenliegenden freien Slot", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            { id: 101, start: "09:00", end: "10:00", status: "bestaetigt" },
            { id: 102, start: "10:00", end: "11:00", status: "eingecheckt" },
          ]),
        ]}
      />
    );

    const booked = screen.getAllByTestId("timegrid-slot-booked");
    expect(booked).toHaveLength(2);
    expect(booked[0]).toHaveTextContent("09:00 – 10:00");
    expect(booked[1]).toHaveTextContent("10:00 – 11:00");
    // Nur Morgen- und Nachmittagsfenster bleiben frei.
    expect(screen.getAllByTestId("timegrid-slot-free")).toHaveLength(2);
  });

  it("fasst überlappende Buchungen zu einem durchgehenden Beleg zusammen", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            { id: 101, start: "09:00", end: "11:00", status: "bestaetigt" },
            { id: 102, start: "10:00", end: "12:00", status: "bestaetigt" },
          ]),
        ]}
      />
    );

    // Sollte dank Konfliktprüfung nicht vorkommen – das Raster zeichnet es
    // trotzdem nicht doppelt oder negativ.
    const booked = screen.getAllByTestId("timegrid-slot-booked");
    expect(booked).toHaveLength(1);
    expect(booked[0]).toHaveTextContent("09:00 – 12:00");
  });

  it("zeigt eine Buchung mit unlesbaren Zeiten als erkennbaren Block statt sie zu verstecken", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            { id: 101, start: "keine Angabe", end: "", status: "bestaetigt" },
          ]),
        ]}
      />
    );

    // Eine kaputte Angabe darf keine Ansicht crashen und den Beleg still
    // verschwinden lassen (Konzept lib/format): Der Block bleibt sichtbar,
    // mit Hinweistext statt erfundener Zeiten.
    const slot = screen.getByTestId("timegrid-slot-booked");
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveTextContent("Zeitangabe unlesbar");
    expect(slot).toHaveTextContent("Bestätigt");
    // Auch der Platzhalter-Hinweis ist ein Zeitlabel im Raster → tabellarische Ziffern.
    expect(within(slot).getByText("Zeitangabe unlesbar")).toHaveClass(
      "tabular-nums"
    );
  });
});

describe("TimeGrid – Gäste-Badges im Slot (Konzept „Kalenderslot: Status- und Gäste-Badge zusammen“)", () => {
  it("zeigt bei ein bis zwei Gästen je Gast ein Namens-Badge hinter dem Status-Badge, das erste mit Users-Icon", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 120,
              start: "09:00",
              end: "10:00",
              status: "bestaetigt",
              guests: [
                { name: "Frida Lang", email: "frida@gast.example.org" },
                { name: "Tom Reuter", email: "tom@gast.example.org" },
              ],
            },
          ]),
        ]}
      />
    );

    const slot = screen.getByTestId("timegrid-slot-booked");
    const gaeste = within(slot).getByTestId("timegrid-guests");
    // Rein informativ, für Screenreader als Anzahl statt Namenskette.
    expect(gaeste).toHaveAttribute("aria-label", "2 Gäste");
    // Namen unmittelbar lesbar, Reihenfolge erhalten.
    expect(within(gaeste).getByText("Frida Lang")).toBeInTheDocument();
    expect(within(gaeste).getByText("Tom Reuter")).toBeInTheDocument();
    // Muted-Stil der default-Variante wie Ausstattungsmerkmale.
    expect(within(gaeste).getAllByText(/Frida|Tom/)[0]).toHaveClass("bg-muted");
  });

  it("kürzt ab drei Gästen auf genau EIN Zähl-Badge „+N“ mit tabular-nums", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 121,
              start: "11:00",
              end: "12:00",
              status: "bestaetigt",
              guests: [
                { name: "Frida Lang", email: "f@example.org" },
                { name: "Tom Reuter", email: "t@example.org" },
                { name: "Mara Vogel", email: "m@example.org" },
                { name: "Ivo Sandmann", email: "i@example.org" },
              ],
            },
          ]),
        ]}
      />
    );

    const slot = screen.getByTestId("timegrid-slot-booked");
    const gaeste = within(slot).getByTestId("timegrid-guests");
    expect(gaeste).toHaveAttribute("aria-label", "4 Gäste");
    // Keine Namenskette mehr – nur das kompakte Zähl-Badge.
    expect(within(gaeste).queryByText("Frida Lang")).not.toBeInTheDocument();
    const zaehler = within(gaeste).getByText("+4");
    expect(zaehler).toHaveClass("tabular-nums");
  });

  it("blendet bei fehlenden oder leeren Gästen die Anzeige komplett aus – der Slot sieht exakt aus wie heute", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            { id: 122, start: "09:00", end: "10:00", status: "bestaetigt" },
            {
              id: 123,
              start: "11:00",
              end: "12:00",
              status: "bestaetigt",
              guests: [],
            },
          ]),
        ]}
      />
    );

    // Weder undefined noch leeres Array darf eine Anzeige erzeugen.
    expect(screen.queryByTestId("timegrid-guests")).not.toBeInTheDocument();
    const slots = screen.getAllByTestId("timegrid-slot-booked");
    for (const slot of slots) {
      expect(slot).toHaveTextContent("Bestätigt");
    }
  });

  it("zeigt die Gäste auch an einem no-show-freigegebenen Slot weiter (Eintrag bleibt Teil des Tages)", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 124,
              start: "09:00",
              end: "10:00",
              status: "nicht erschienen",
              guests: [{ name: "Frida Lang", email: "f@example.org" }],
            },
          ]),
        ]}
      />
    );

    const slot = screen.getByTestId("timegrid-slot-booked");
    expect(slot).toHaveClass("bg-muted");
    const gaeste = within(slot).getByTestId("timegrid-guests");
    expect(gaeste).toHaveAttribute("aria-label", "1 Gast");
    expect(within(gaeste).getByText("Frida Lang")).toBeInTheDocument();
    expect(within(slot).getByText("Nicht erschienen")).toBeInTheDocument();
  });
});

describe("TimeGrid – Spuren", () => {
  it("ordnet bei mehreren Spuren jede Buchung ihrer eigenen Spur zu", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", [
            { id: 101, start: "09:00", end: "10:00", status: "bestaetigt" },
          ]),
          lane(2, "Kreativraum Süd", [
            { id: 201, start: "11:00", end: "12:00", status: "ausstehend" },
          ]),
        ]}
      />
    );

    const nord = screen.getByTestId("timegrid-lane-1");
    const sued = screen.getByTestId("timegrid-lane-2");
    expect(within(nord).getByTestId("timegrid-lane-title-1")).toHaveTextContent(
      "Atelier Nord"
    );
    expect(within(sued).getByTestId("timegrid-lane-title-2")).toHaveTextContent(
      "Kreativraum Süd"
    );

    // Atelier Nord kennt nur seine Buchung – nicht die des anderen Raums.
    expect(within(nord).getAllByTestId("timegrid-slot-booked")).toHaveLength(1);
    expect(within(nord).getByText("09:00 – 10:00")).toBeInTheDocument();
    expect(within(sued).getAllByTestId("timegrid-slot-booked")).toHaveLength(1);
    expect(within(sued).getByText("11:00 – 12:00")).toBeInTheDocument();
    expect(within(nord).queryByText("11:00 – 12:00")).not.toBeInTheDocument();
  });
});

describe("TimeGrid – Zustände", () => {
  it("zeigt beim Laden ein Skeleton im Rasterlayout statt des Gitters", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        isLoading
        lanes={[lane(1, "Atelier Nord", [])]}
      />
    );

    const loading = screen.getByTestId("timegrid-loading");
    expect(loading).toBeVisible();
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timegrid-slot-booked")).not.toBeInTheDocument();
  });

  it("zeigt bei Ladefehler ein destructives Alert, dessen „Erneut versuchen“ onRetry auslöst", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<TimeGrid onRetry={onRetry} error lanes={[]} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Zeitraster konnte nicht geladen werden");
    expect(within(alert).getByText("Erneut versuchen")).toBeInTheDocument();

    await user.click(screen.getByTestId("timegrid-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("zeigt ohne Spuren einen eigenen Leerzustand mit Neuladen", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<TimeGrid onRetry={onRetry} lanes={[]} />);

    const empty = screen.getByTestId("timegrid-empty");
    expect(empty).toBeVisible();
    expect(empty).toHaveTextContent(
      "Keine Räume für diesen Tag vorhanden."
    );
    expect(screen.queryByTestId("timegrid-grid")).not.toBeInTheDocument();

    await user.click(
      within(empty).getByRole("button", { name: "Neu laden" })
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("bleibt bei Spuren ohne Buchungen im Gitter und zeigt nur das Hinweisband", async () => {
    const onRetry = vi.fn();
    render(
      <TimeGrid
        onRetry={onRetry}
        lanes={[
          lane(1, "Atelier Nord", []),
          lane(2, "Kreativraum Süd", []),
        ]}
      />
    );

    // Freie Fenster sind fachlich korrekt kein Fehlerzustand (Konzept):
    // Hinweisband darüber, Gitter bleibt sichtbar.
    const hint = screen.getByTestId("timegrid-no-bookings");
    expect(hint).toBeVisible();
    expect(hint).toHaveTextContent(
      "Für diesen Tag sind noch keine Buchungen vorhanden"
    );
    const grid = screen.getByTestId("timegrid-grid");
    expect(grid).toBeVisible();
    // Je leerer Spur genau EIN freies Tagesslot (08:00–20:00).
    const freeSlots = within(grid).getAllByTestId("timegrid-slot-free");
    expect(freeSlots).toHaveLength(2);
    for (const free of freeSlots) {
      expect(free).toHaveTextContent("08:00 – 20:00");
    }
  });

  it("zeigt das Hinweisband nicht, sobald mindestens eine Spur belegt ist", () => {
    render(
      <TimeGrid
        onRetry={() => {}}
        lanes={[
          lane(1, "Atelier Nord", []),
          lane(2, "Kreativraum Süd", [
            { id: 201, start: "11:00", end: "12:00", status: "bestaetigt" },
          ]),
        ]}
      />
    );

    expect(screen.queryByTestId("timegrid-no-bookings")).not.toBeInTheDocument();
    expect(screen.getByTestId("timegrid-grid")).toBeInTheDocument();
  });
});

describe("TimeGrid – Check-in-Button (Sichtbarkeit)", () => {
  /** Heutiges Datum als „YYYY-MM-DD“ (UTC), wie die Ansichten es wählen. */
  const heute = (): string => new Date().toISOString().slice(0, 10);

  /**
   * Legt die Systemuhrzeit auf „heute HH:mm“ UTC – so liegen die
   * Testbuchungen garantiert im dargestellten Tag und der Lauf-Zustand
   * ist deterministisch.
   */
  function setzeUhrzeit(stunde: number, minute: number): void {
    vi.useFakeTimers();
    vi.setSystemTime(
      new Date(`${heute()}T${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`)
    );
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("zeigt den Check-in-Button an der laufenden eigenen bestätigten Buchung", () => {
    // 10:07 liegt im Fenster [Beginn, Beginn+Frist) = [10:00, 10:15).
    // noShowAfterMinutes fehlt hier bewusst (Default 15 gilt).
    setzeUhrzeit(10, 7);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 101,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );

    const slot = screen.getByTestId("timegrid-slot-booked");
    expect(within(slot).getByTestId("timegrid-checkin-101")).toHaveTextContent(
      "Check-in"
    );
  });

  it("zeigt keinen Check-in bei fremder Buchung", () => {
    setzeUhrzeit(10, 30);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="ben@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 102,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );

    expect(screen.queryByTestId(/timegrid-checkin-/)).not.toBeInTheDocument();
  });

  it("zeigt keinen Check-in ohne bekannten Urheber (alter Datenstand)", () => {
    setzeUhrzeit(10, 30);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 103,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
            },
          ]),
        ]}
      />
    );

    expect(screen.queryByTestId(/timegrid-checkin-/)).not.toBeInTheDocument();
  });

  it("zeigt keinen Check-in vor Beginn der Buchung", () => {
    setzeUhrzeit(9, 59);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 104,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "Anna@DesignFreak.DE",
            },
          ]),
        ]}
      />
    );

    expect(screen.queryByTestId(/timegrid-checkin-/)).not.toBeInTheDocument();
  });

  it("vergleicht den Urheber groß-/kleinungsunabhängig", () => {
    setzeUhrzeit(10, 7);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="ANNA@DESIGNFREAK.DE"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 105,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "Anna@DesignFreak.DE",
            },
          ]),
        ]}
      />
    );

    expect(screen.getByTestId("timegrid-checkin-105")).toBeInTheDocument();
  });

  it("endet das Fenster nach Ablauf der konfigurierten No-Show-Frist (Beginn + X Minuten) – auch wenn die Buchung noch läuft", () => {
    // Frist X = 15 Minuten (Default): um 10:16 ist Schluss, obwohl die
    // Buchung bis 11:00 läuft.
    setzeUhrzeit(10, 16);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 106,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
              // Explizite Frist aus der Konfiguration (hier = Default 15).
              noShowAfterMinutes: 15,
            },
          ]),
        ]}
      />
    );

    expect(screen.queryByTestId(/timegrid-checkin-/)).not.toBeInTheDocument();
  });

  it("endet das Fenster anhand einer von 15 abweichenden Frist – Check-in ist nur innerhalb [Beginn, Beginn + Frist) sichtbar", () => {
    // Konfigurierte Frist X = 10 Minuten statt 15: Das Fenster ist
    // [10:00, 10:10). Um 10:11 ist der Check-in bereits weg, obwohl die
    // Buchung bis 11:00 läuft und der Default-Fallback 15 Minuten wäre.
    setzeUhrzeit(10, 11);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 110,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
              noShowAfterMinutes: 10,
            },
          ]),
        ]}
      />
    );

    expect(screen.queryByTestId(/timegrid-checkin-/)).not.toBeInTheDocument();
  });

  it("beginnt das Fenster nicht vor der ausgelaufenen Frist – Check-in erst ab Beginn sichtbar", () => {
    // Frist X = 10 Minuten, Fenster [10:00, 10:10). Um 10:09 liegt man
    // innerhalb und der Button ist sichtbar – das bestätigt, dass die kürzere
    // Frist das Fenster verkleinert, nicht verschoben hat.
    setzeUhrzeit(10, 9);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 110,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
              noShowAfterMinutes: 10,
            },
          ]),
        ]}
      />
    );

    expect(screen.getByTestId("timegrid-checkin-110")).toBeInTheDocument();
  });

  it("ruft onCheckIn mit der Slot-Buchung und zeigt den Spinner während des Absendens", async () => {
    setzeUhrzeit(10, 7);
    const onCheckIn = vi.fn();
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={onCheckIn}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 107,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );

    // fireEvent statt userEvent-Klick: Unter Fake-Timern wartet userEvent
    // intern auf echte Timer und läuft am deaktivierten Button sonst ins
    // Zeitlimit – der Handler-Ruf selbst ist synchron beobachtbar.
    fireEvent.click(screen.getByTestId("timegrid-checkin-107"));
    expect(onCheckIn).toHaveBeenCalledTimes(1);
    expect(onCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 107 })
    );

    // checkingInId=107 → Button deaktiviert, Inline-Spinner statt Icon.
    cleanup();
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        checkingInId={107}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 107,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );
    // checkingInId=107 → Button deaktiviert, Inline-Spinner statt Icon.
    // Bewusst KEIN Klick: userEvent wartet auf ein freigegebenes Element
    // und würde am deaktivierten Button ins Zeitlimit laufen – die Sperrung
    // selbst ist hier das zu prüfende Verhalten.
    const button = screen.getByTestId("timegrid-checkin-107");
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
  });

  it("zeigt bei gescheitertem Check-in das destructive Inline-Feedback am Block (kein Toast)", () => {
    setzeUhrzeit(10, 7);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        checkInFehler={{ bookingId: 108, message: "läuft nicht mehr" }}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 108,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );

    // Adressierbarer Fehler inline am Block (Konzept „Fehleranzeige“),
    // nicht als Toast – der Button bleibt bedienbar für einen zweiten Versuch.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check-in fehlgeschlagen: läuft nicht mehr"
    );
    expect(screen.getByTestId("timegrid-checkin-108")).toBeEnabled();

    // Ein Fehler zu einer ANDEREN Buchung erscheint hier nicht.
    cleanup();
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        onCheckIn={vi.fn()}
        checkInFehler={{ bookingId: 999, message: "egal" }}
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 108,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("zeigt keinen Check-in ohne übergebenen Handler (reine Ansichtsnutzung bleibt möglich)", () => {
    setzeUhrzeit(10, 30);
    render(
      <TimeGrid
        onRetry={() => {}}
        currentUser="anna@designfreak.de"
        lanes={[
          lane(1, "Atelier Nord", [
            {
              id: 109,
              start: `${heute()}T10:00:00.000Z`,
              end: `${heute()}T11:00:00.000Z`,
              status: "bestaetigt",
              createdBy: "anna@designfreak.de",
            },
          ]),
        ]}
      />
    );

    expect(screen.queryByTestId(/timegrid-checkin-/)).not.toBeInTheDocument();
  });
});
