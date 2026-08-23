/**
 * Gemeinsamer Zeit-/Datumsformatierer für die gesamte Anwendung.
 *
 * Verbindlich für Kalenderansicht, Buchungsformular und Tagesansicht
 * (siehe docs/design-konzept.md, Abschnitt „Datum & Uhrzeit"): Diese
 * Ansichten nutzen ausschließlich diese Helfer statt verteilter
 * toLocale*-Aufrufe – so bleiben alle Zeitangaben in der UI einheitlich.
 */

/** Platzhalter für fehlende oder nicht parsebare Zeitangaben. */
export const INVALID_DATE_PLACEHOLDER = "–";

const LOCALE = "de-DE";
const TIME_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const DATE_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Uhrzeit als „HH:mm" mit führenden Nullen, z. B. „09:05". */
export function formatTime(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date === null ? INVALID_DATE_PLACEHOLDER : TIME_FORMAT.format(date);
}

/** Datum als kurzer Wochentag mit Komma plus DD.MM.YYYY, z. B. „So., 23.08.2026". */
export function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date === null ? INVALID_DATE_PLACEHOLDER : DATE_FORMAT.format(date);
}
