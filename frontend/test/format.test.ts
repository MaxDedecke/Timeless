import { describe, expect, it } from "vitest";

import { formatDate, formatTime } from "../src/lib/format";

/**
 * Tests für den gemeinsamen Zeit-/Datumsformatierer. Sie pinnen die
 * konkreten Ausgaben, die docs/design-konzept.md (Abschnitt
 * „Datum & Uhrzeit") als verbindlich festlegt. Locale und Optionen sind
 * im Helfer fixiert, deshalb sind die Erwartungen rechnerunabhängig.
 */

describe("formatTime", () => {
  it("formatiert als HH:mm mit führenden Nullen", () => {
    expect(formatTime(new Date(2026, 7, 23, 9, 5))).toBe("09:05");
    expect(formatTime(new Date(2026, 7, 23, 17, 30))).toBe("17:30");
  });

  it("formatiert Mitternacht als 00:xx, nicht als 24:xx", () => {
    expect(formatTime(new Date(2026, 7, 23, 0, 7))).toBe("00:07");
  });

  it("nimmt ISO-Strings aus der API entgegen", () => {
    // Ohne Zeitzonen-Suffix wird der String als Lokalzeit geparst –
    // die Ausgabe bleibt damit auch ohne Docker/CI deterministisch.
    expect(formatTime("2026-08-23T14:30:00")).toBe("14:30");
  });

  it("liefert Platzhalter bei fehlender oder ungültiger Eingabe", () => {
    expect(formatTime(null)).toBe("–");
    expect(formatTime(undefined)).toBe("–");
    expect(formatTime("")).toBe("–");
    expect(formatTime(new Date("nonsense"))).toBe("–");
  });
});

describe("formatDate", () => {
  it("formatiert als kurzer Wochentag mit Komma plus DD.MM.YYYY", () => {
    // Der 23.08.2026 ist tatsächlich ein Sonntag – der Wochentag wird
    // kalenderkorrekt berechnet; das Ticket-Beispiel nannte nur das Muster.
    expect(formatDate(new Date(2026, 7, 23))).toBe("So., 23.08.2026");
    expect(formatDate(new Date(2026, 7, 21))).toBe("Fr., 21.08.2026");
  });

  it("nimmt ISO-Strings aus der API entgegen", () => {
    expect(formatDate("2026-08-23T09:05:00")).toBe("So., 23.08.2026");
  });

  it("liefert Platzhalter bei fehlender oder ungültiger Eingabe", () => {
    expect(formatDate(null)).toBe("–");
    expect(formatDate(undefined)).toBe("–");
    expect(formatDate(new Date("nonsense"))).toBe("–");
  });
});
