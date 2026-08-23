import { AlertCircle, CalendarX, Inbox, RotateCw } from "lucide-react";

import BookingStatusBadge from "./BookingStatusBadge";
import { cn } from "../lib/utils";
import { formatTime } from "../lib/format";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Skeleton } from "./ui/skeleton";

/**
 * TimeGrid: gemeinsames Zeitraster für die Kalenderansichten (Konzept
 * „Kalender/Tagesansicht": feste Stundenhöhe h-12 pro Stunde, 15-Minuten-
 * Raster für die Slot-Positionierung). Die Komponente ist rein datengetrieben
 * – Tag und Spuren samt Buchungen kommen als Props, es wird hier nichts
 * geladen; Raumkalender (eine Spur) und Tagesansicht (eine Spur je Raum)
 * speisen sie mit ihren Daten.
 *
 * Zustände gemäß docs/design-konzept.md: Ladezustand als Skeleton im
 * Rasterlayout, Ladefehler als destructives Alert mit „Erneut versuchen",
 * Leere als eigene Card. Freie Fenster sind fachlich korrekt kein
 * Fehlerzustand – sie erscheinen im Gitter über dem Muted-Token.
 */

/** Start des darzustellenden Tages in Minuten seit Mitternacht. */
export const DAY_START_MINUTES = 8 * 60;
/** Ende des darstellenden Tages in Minuten seit Mitternacht. */
export const DAY_END_MINUTES = 20 * 60;
/** Rasterbreite in Minuten: Positionen fallen auf dieses Raster. */
export const GRID_MINUTES = 15;

/** Buchung so, wie die Ansichten sie der Komponente geben. */
export interface TimeGridBooking {
  id: number | string;
  start: string;
  end: string;
  status?: string;
}

/** Eine Spur ist typisch ein Raum: Titel plus seine Buchungen des Tags. */
export interface TimeGridLane {
  id: number | string;
  title: string;
  bookings: TimeGridBooking[];
}

/** Ein berechnetes Zeitfenster innerhalb einer Spur (belegt oder frei). */
export interface TimeGridSlot {
  kind: "booking" | "free";
  startMinutes: number;
  endMinutes: number;
  booking?: TimeGridBooking;
  /** Kaputte Zeitangabe: ganztägiger Block mit Platzhalter-Beschriftung. */
  placeholder?: boolean;
}

function clampToDay(minutes: number): number {
  return Math.min(Math.max(minutes, DAY_START_MINUTES), DAY_END_MINUTES);
}

/**
 * Zerlegt den Tag einer Spur abwechselnd in belegte und freie Fenster.
 * Nicht im Tagesfenster liegende Buchungen werden auf den sichtbaren Bereich
 * begrenzt; Lücken zwischen den Buchungen werden zu freien Slots. Eine
 * Buchung mit unlesbaren Zeiten verschwindet nicht still aus dem Raster,
 * sondern erscheint als ganztägiger Block mit Platzhalter-Beschriftung –
 * eine einzelne kaputte Angabe soll keine Ansicht crashen oder Daten
 * verbergen (Konzept „Datum & Uhrzeit").
 */
export function buildSlots(bookings: TimeGridBooking[]): TimeGridSlot[] {
  const slots: TimeGridSlot[] = [];
  const parsed = bookings.map((booking) => ({
    booking,
    start: parseClock(booking.start),
    end: parseClock(booking.end),
  }));

  for (const entry of parsed) {
    if (
      entry.start === null ||
      entry.end === null ||
      entry.end <= entry.start
    ) {
      slots.push({
        kind: "booking",
        startMinutes: DAY_START_MINUTES,
        endMinutes: DAY_END_MINUTES,
        booking: entry.booking,
        placeholder: true,
      });
    }
  }

  const visible = parsed
    .flatMap((entry) =>
      entry.start !== null &&
      entry.end !== null &&
      entry.end > entry.start &&
      entry.end > DAY_START_MINUTES &&
      entry.start < DAY_END_MINUTES
        ? [
            {
              booking: entry.booking,
              start: clampToDay(entry.start),
              end: clampToDay(entry.end),
            },
          ]
        : []
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let cursor = DAY_START_MINUTES;
  let index = 0;
  while (index < visible.length) {
    const first = visible[index];
    if (first.start > cursor) {
      slots.push({
        kind: "free",
        startMinutes: cursor,
        endMinutes: first.start,
      });
      cursor = first.start;
    }
    // Überlappende Buchungen (sollte dank Konfliktprüfung nicht passieren)
    // werden zu EINEM durchgehenden Beleg zusammengefasst, statt doppelt
    // belegte Abschnitte zu zeichnen; direkt angrenzende bleiben getrennt.
    let blockEnd = first.end;
    index += 1;
    while (index < visible.length && visible[index].start < blockEnd) {
      if (visible[index].end > blockEnd) {
        blockEnd = visible[index].end;
      }
      index += 1;
    }
    slots.push({
      kind: "booking",
      startMinutes: cursor,
      endMinutes: blockEnd,
      booking: first.booking,
    });
    cursor = blockEnd;
  }
  if (cursor < DAY_END_MINUTES) {
    slots.push({
      kind: "free",
      startMinutes: cursor,
      endMinutes: DAY_END_MINUTES,
    });
  }
  return slots;
}

/**
 * Liest die Uhrzeit aus „HH:mm" ODER einem ISO-Zeitstempel der API (z. B.
 * „2026-08-23T14:30:00"); das Muster greift an jeder Position des Strings,
 * nicht nur am Anfang. Unlesbare oder unmögliche Angaben → null.
 */
function parseClock(value: string): number | null {
  const match = /(\d{1,2}):(\d{2})/.exec(value);
  if (match === null) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Minuten seit Mitternacht als gültige ISO-Angabe für den gemeinsamen
 * Formatierer – so bleiben ALLE Uhrzeit-Labels über lib/format zentral
 * (Konzept „Datum & Uhrzeit"), ohne dass hier ein eigenes Format entsteht.
 */
function minutesToIso(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `2000-01-01T${hh}:${mm}:00`;
}

/**
 * Beschriftungszeit eines Slot-Rands: immer das tatsächlich gezeichnete
 * Fenster (auch am Tagesrand abgeschnittene Buchungen zeigen ihren
 * sichtbaren Anteil) – zentral formatiert über lib/format.
 */
function labelAt(slot: TimeGridSlot, edge: "start" | "end"): string {
  const minutes = edge === "start" ? slot.startMinutes : slot.endMinutes;
  return formatTime(minutesToIso(minutes));
}

const HOUR_HEIGHT_CLASS = "h-12"; // 48 px je Stunde, Konzept „Spacing & Layout"
const HOUR_PX = 48;
/** Mindesthöhe eines Slots: eine Inhaltszeile (Badge/Label) muss passen. */
const MIN_SLOT_HEIGHT_PX = 44;

interface FreeSlotProps {
  slot: TimeGridSlot;
}

/** Freies Fenster: dezente Muted-Fläche mit Zeitangaben, klar vom Beleg getrennt. */
function FreeSlot({ slot }: FreeSlotProps) {
  return (
    <div
      data-testid="timegrid-slot-free"
      className={cn(
        "flex items-center gap-2 rounded-md border border-dashed border-border bg-muted px-3 text-xs text-muted-foreground",
        HOUR_HEIGHT_CLASS
      )}
      style={{ height: heightStyle(slot) }}
    >
      <span className="flex items-center gap-2">
        <span className="tabular-nums">
          {labelAt(slot, "start")} – {labelAt(slot, "end")}
        </span>
        <span className="sr-only">frei</span>
      </span>
    </div>
  );
}

interface BookedSlotProps {
  slot: TimeGridSlot;
}

/**
 * Belegtes Fenster: Primary-Tönung, formatierte Zeiten (lib/format) und
 * Status-Badge. Mit unlesbaren Zeitangaben bleibt der Block als solcher
 * erkennbar (destructiver Punkt, Hinweistext), statt still zu verschwinden.
 */
function BookedSlot({ slot }: BookedSlotProps) {
  const booking = slot.booking as TimeGridBooking;
  const placeholder = slot.placeholder === true;
  return (
    <div
      data-testid="timegrid-slot-booked"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-primary-tint px-3 py-2 ring-1 ring-inset ring-primary/30",
        !placeholder && HOUR_HEIGHT_CLASS
      )}
      style={{ height: heightStyle(slot) }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            placeholder ? "bg-destructive" : "bg-primary"
          )}
          aria-hidden="true"
        />
        {placeholder ? (
          <span className="text-sm font-medium tabular-nums text-destructive">
            Zeitangabe unlesbar
          </span>
        ) : (
          <span className="text-sm font-medium tabular-nums text-primary">
            {labelAt(slot, "start")} – {labelAt(slot, "end")}
          </span>
        )}
        <span className="sr-only">belegt</span>
      </span>
      <BookingStatusBadge status={booking.status ?? "bestaetigt"} />
    </div>
  );
}

/**
 * Höhe aus der Slot-Dauer: 48 px je Stunde (Konzept-Raster), mindestens
 * hoch genug für eine Beschriftungszeile inklusive Badge.
 */
function heightStyle(slot: TimeGridSlot): string {
  const hours = (slot.endMinutes - slot.startMinutes) / 60;
  return `${Math.max(hours * HOUR_PX, MIN_SLOT_HEIGHT_PX)}px`;
}

interface LaneColumnProps {
  lane: TimeGridLane;
}

/** Eine Spur als Card mit ihren Slots untereinander (mobil wie Desktop). */
function LaneColumn({ lane }: LaneColumnProps) {
  const slots = buildSlots(lane.bookings);
  return (
    <Card data-testid={`timegrid-lane-${lane.id}`}>
      <CardHeader>
        <CardTitle
          data-testid={`timegrid-lane-title-${lane.id}`}
          className="text-lg font-semibold"
        >
          {lane.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        {slots.map((slot, index) =>
          slot.kind === "booking" ? (
            <BookedSlot key={index} slot={slot} />
          ) : (
            <FreeSlot key={index} slot={slot} />
          )
        )}
      </CardContent>
    </Card>
  );
}

interface TimeGridLoadingProps {
  lanesCount: number;
}

/** Skeleton in der Layoutform der Zielsicht: Spalten-Cards mit Slot-Skeletten. */
function TimeGridLoading({ lanesCount }: TimeGridLoadingProps) {
  return (
    <div
      data-testid="timegrid-loading"
      aria-busy="true"
      className={gridClass()}
    >
      {Array.from({ length: lanesCount }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            <Skeleton className={HOUR_HEIGHT_CLASS} />
            <Skeleton className={`${HOUR_HEIGHT_CLASS} bg-primary-tint`} />
            <Skeleton className={HOUR_HEIGHT_CLASS} />
            <Skeleton className={HOUR_HEIGHT_CLASS} />
            <Skeleton className={HOUR_HEIGHT_CLASS} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Responsive-Anordnung: mobil gestapelt, ab md nebeneinander. */
function gridClass(): string {
  return "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";
}

interface TimeGridErrorProps {
  onRetry: () => void;
}

/** Ladefehler: destructives Alert mit „Erneut versuchen" (Konzept-Muster). */
function TimeGridError({ onRetry }: TimeGridErrorProps) {
  return (
    <Alert variant="destructive" data-testid="timegrid-error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Zeitraster konnte nicht geladen werden</AlertTitle>
      <AlertDescription>
        Die Buchungen sind momentan nicht erreichbar oder melden einen Fehler.
        <div className="mt-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRetry}
            data-testid="timegrid-retry"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface TimeGridEmptyProps {
  retry: () => void;
}

/** Leere Zustand: keine Spuren vorhanden (z. B. Standort ohne Räume). */
function TimeGridEmpty({ retry }: TimeGridEmptyProps) {
  return (
    <Card
      data-testid="timegrid-empty"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-base font-medium text-card-foreground">
        Keine Räume für diesen Tag vorhanden.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Zu diesem Standort sind noch keine Räume angelegt – sobald einer
        existiert, erscheint er hier mit seinem Zeitraster.
      </p>
      <Button variant="outline" size="sm" className="mt-5" onClick={retry}>
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Neu laden
      </Button>
    </Card>
  );
}

interface TimeGridNoBookingsProps {
  retry: () => void;
}

/**
 * Hinweisband bei Spuren ohne einzige Buchung (Konzept „Leerzustand"):
 * freie Fenster sind hier das fachliche Ergebnis, kein Fehler – das Gitter
 * bleibt sichtbar, darüber erscheint nur ein dezentes Band.
 */
function TimeGridNoBookings({ retry }: TimeGridNoBookingsProps) {
  return (
    <div
      data-testid="timegrid-no-bookings"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted px-4 py-3"
    >
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarX className="h-4 w-4" aria-hidden="true" />
        Für diesen Tag sind noch keine Buchungen vorhanden – alle Zeitfenster
        sind frei.
      </p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Aktualisieren
      </Button>
    </div>
  );
}

export interface TimeGridProps {
  /** Anzuzeigende Spuren (typisch: Räume eines Standorts). */
  lanes: TimeGridLane[];
  isLoading?: boolean;
  error?: boolean;
  /** Wird vom „Erneut versuchen"-Button bzw. „Neu laden" ausgelöst. */
  onRetry: () => void;
}

/**
 * Gemeinsames Zeitraster für Raumkalender (eine Spur) und Tagesansicht
 * (eine Spur je Raum). Reine Darstellungskomponente: Sie lädt selbst nichts
 * und kennt keinen API-Pfad – Zustand (lädt/Fehler) kommt als Props herein,
 * das Nachladen stößt die aufrufende Ansicht über onRetry neu an.
 */
export default function TimeGrid({
  lanes,
  isLoading = false,
  error = false,
  onRetry,
}: TimeGridProps) {
  if (isLoading) {
    return <TimeGridLoading lanesCount={Math.max(lanes.length, 1)} />;
  }
  if (error) {
    return <TimeGridError onRetry={onRetry} />;
  }
  if (lanes.length === 0) {
    return <TimeGridEmpty retry={onRetry} />;
  }

  const anyBooked = lanes.some((lane) => lane.bookings.length > 0);
  return (
    <section aria-label="Zeitraster">
      {!anyBooked && <TimeGridNoBookings retry={onRetry} />}
      <div
        data-testid="timegrid-grid"
        aria-busy="false"
        className={gridClass()}
      >
        {lanes.map((lane) => (
          <LaneColumn key={lane.id} lane={lane} />
        ))}
      </div>
    </section>
  );
}
