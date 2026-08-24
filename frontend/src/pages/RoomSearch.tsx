import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  CalendarSearch,
  Clock,
  MapPin,
  RotateCw,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { AmenityFilter } from "../components/AmenityFilter";
import { ApiError } from "../api/http";
import { listAvailableRooms, type Room } from "../api/rooms";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { Skeleton } from "../components/ui/skeleton";
import { formatTime } from "../lib/format";
import BookingForm from "./BookingForm";

/**
 * Freie-Räume-Suche (/free, Anforderung 1 + Merkmalsfilter, verbindliches
 * Kapitel „Freie-Räume-Suche" in docs/design-konzept.md): Zeitraum und
 * gewünschte Ausstattung eingeben und nur Räume sehen, die genau in diesem
 * Zeitraum frei sind – mit direktem Buchungseinstieg aus dem Treffer.
 *
 * Datenquelle ist GET /api/rooms/available?from=&to= (halboffenes Intervall,
 * ausschließlich freie Räume, dieselbe Raumform wie GET /api/rooms); die
 * Merkmalsfilterung läuft clientseitig mit derselben AND-Logik wie in der
 * Raumliste. Alle Fetches laufen relativ über /api (kein Servicename im
 * Browser-Code), Zeiten formatiert ausschließlich lib/format.
 *
 * Zustände laut Konzept: Karten-Skeleton beim Laden (Form der Ergebnisliste),
 * EmptyState „keine Räume frei" mit Filter-Reset (bewusst ohne Unterscheidung
 * „leeres System" vs. „nichts passt"), destructives Alert bei Ladefehlern mit
 * „Erneut versuchen". Reload-Verhalten: EIN Effekt mit allen Triggern im
 * selben Abhängigkeitssatz (Mount, committeter Filterwechsel, Retry-Tick),
 * jeder Lauf bricht den vorherigen Request über einen gemeinsamen
 * AbortController ab – nie zwei Effekte mit überlappenden Dep-Sätzen (Falle
 * aus der Tagesansicht).
 */

/** Einheitlicher Eingaben-Stil wie in Raumkalender und BookingForm. */
const inputClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** Heutiges Datum als „YYYY-MM-DD" (UTC) – gleiche Semantik wie RoomCalendar. */
function heuteIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Suchfilter {
  /** „YYYY-MM-DD" */
  datum: string;
  /** „HH:mm" */
  startZeit: string;
  /** „HH:mm" */
  endZeit: string;
  /** Merkmals-Schlüssel, UND-kombiniert. */
  merkmale: string[];
}

/** Defaults laut Konzept: der ganze Arbeitstag als neutrale Ausgangsanzeige. */
function standardFilter(): Suchfilter {
  return { datum: heuteIso(), startZeit: "08:00", endZeit: "18:00", merkmale: [] };
}

const DATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/;
const ZEIT_MUSTER = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Filterzustand aus der URL lesen (?date=&from=&to=&amenities=, Merkmale
 * kommasepariert): fehlende oder unlesbare Parameter führen sauber zu den
 * Defaults, ein Suchergebnis bleibt damit verlinkbar.
 */
function liesFilter(suchParams: URLSearchParams): Suchfilter {
  const standard = standardFilter();
  const datum = suchParams.get("date") ?? "";
  const startZeit = suchParams.get("from") ?? "";
  const endZeit = suchParams.get("to") ?? "";
  const merkmale = (suchParams.get("amenities") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key !== "");
  return {
    datum: DATUM_MUSTER.test(datum) ? datum : standard.datum,
    startZeit: ZEIT_MUSTER.test(startZeit) ? startZeit : standard.startZeit,
    endZeit: ZEIT_MUSTER.test(endZeit) ? endZeit : standard.endZeit,
    merkmale: [...new Set(merkmale)],
  };
}

/** Spiegelt den Filterzustand als Query-Parameter (URL-Sync des Konzepts). */
function schreibeFilter(filter: Suchfilter): URLSearchParams {
  const params = new URLSearchParams();
  params.set("date", filter.datum);
  params.set("from", filter.startZeit);
  params.set("to", filter.endZeit);
  if (filter.merkmale.length > 0) {
    params.set("amenities", filter.merkmale.join(","));
  }
  return params;
}

/** AND-Logik wie in der Raumliste: nur Räume mit ALLEN gewählten Merkmalen. */
function filterRaeumeNachMerkmalen(raeume: Room[], selectedKeys: string[]): Room[] {
  if (selectedKeys.length === 0) return raeume;
  return raeume.filter((room) =>
    selectedKeys.every((key) => room.amenities.some((a) => a.key === key)),
  );
}

interface FeldFehler {
  datum?: string;
  start?: string;
  ende?: string;
}

type LadeZustand =
  | { phase: "loading" }
  | { phase: "error"; meldung: string }
  | { phase: "ready"; raeume: Room[] };

function TrefferSkeleton() {
  return (
    <div
      data-testid="search-loading"
      aria-busy="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            {/* Ladezustand in der Layoutform der Zielsicht (Konzept). */}
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SuchFehler({ meldung, onRetry }: { meldung: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" data-testid="search-error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Suche fehlgeschlagen</AlertTitle>
      <AlertDescription>
        {meldung}
        <div className="mt-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRetry}
            data-testid="search-retry"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function KeineRaeumeFrei({ onReset }: { onReset: () => void }) {
  return (
    <Card
      data-testid="search-empty"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <CalendarSearch className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-base font-medium text-card-foreground">
        Keine Räume im gewünschten Zeitraum frei.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Probiere ein anderes Datum, kürzere Zeiten oder weniger Merkmalsfilter.
      </p>
      {/* Bewusst die einzige Aktion: „noch keine Räume angelegt" vs. „keiner
          passt" wird hier nicht unterschieden (Konzept). */}
      <Button variant="outline" size="sm" className="mt-5" onClick={onReset} data-testid="search-empty-reset">
        Filter zurücksetzen
      </Button>
    </Card>
  );
}

interface TrefferCardProps {
  raum: Room;
  filter: Suchfilter;
  onBuchen: (raum: Room) => void;
}

/** Eine Trefferkarte: Raumkontext, gesuchter Zeitraum, „Frei"-Badge, Aktionen. */
function TrefferCard({ raum, filter, onBuchen }: TrefferCardProps) {
  return (
    <Card data-testid="search-result-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{raum.name}</CardTitle>
          <Badge variant="success" data-testid={`search-result-free-${raum.id}`}>
            Frei
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <CardDescription className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {raum.location?.name ?? "Ohne Standort"}
          </CardDescription>
          <span className="flex items-center gap-1.5 tabular-nums">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>
              {raum.capacity} <span className="sr-only">Personen</span>
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {/* Der gesuchte Zeitraum je Treffer – ausschließlich lib/format. */}
        <span
          className="flex items-center gap-1.5 text-sm font-medium tabular-nums"
          data-testid={`search-result-slot-${raum.id}`}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          {formatTime(`${filter.datum}T${filter.startZeit}:00Z`)} –{" "}
          {formatTime(`${filter.datum}T${filter.endZeit}:00Z`)} Uhr
        </span>
        <div className="flex flex-wrap gap-1.5">
          {raum.amenities.length === 0 ? (
            <span className="text-xs text-muted-foreground">Keine Merkmale</span>
          ) : (
            raum.amenities.map((merkmal) => (
              <Badge key={merkmal.key}>{merkmal.label}</Badge>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Primäraktion je Treffer: öffnet den Buchungsdialog direkt über
              der Suchseite – Raum und exakter Suchzeitraum vorbelegt. */}
          <Button
            size="sm"
            className="self-start max-md:h-11"
            onClick={() => onBuchen(raum)}
            data-testid={`search-book-${raum.id}`}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Buchen
          </Button>
          {/* Sekundär: Raumkontext prüfen, bevor man bucht. */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="self-start max-md:h-11"
            data-testid={`search-calendar-${raum.id}`}
          >
            <Link to={`/rooms/${raum.id}`}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Kalender
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RoomSearch() {
  const [suchParams, setSuchParams] = useSearchParams();

  // Committed filter: einzige Quelle für Suche und URL-Sync. Aus der URL
  // gelesen, damit ein Suchergebnis verlinkbar bleibt.
  const [filter, setFilter] = useState<Suchfilter>(() => liesFilter(suchParams));
  // Entwürfe der Zeitraum-Eingaben: native date/time-Felder feuern erst bei
  // vollständigem Wert – unvollständige Eingaben blockieren dann die Suche
  // per Feldfehler, statt sie mit alten Werten laufen zu lassen.
  const [eingaben, setEingaben] = useState<Suchfilter>(filter);
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [ladeZustand, setLadeZustand] = useState<LadeZustand>({ phase: "loading" });
  const [nochmalTick, setNochmalTick] = useState(0);

  // Buchungsdialog: der Treffer-Raum als Kontext; geschlossen == null.
  const [buchungsRaum, setBuchungsRaum] = useState<Room | null>(null);

  const committiere = useCallback(
    (naechster: Suchfilter) => {
      setFilter(naechster);
      setSuchParams(schreibeFilter(naechster));
    },
    [setSuchParams],
  );

  /** Zeitraum-Übernahme: erst prüfen, dann suchen (Feldfehler blockieren). */
  const uebernehmeZeitraum = useCallback(
    (neu: { datum: string; startZeit: string; endZeit: string }) => {
      const fehler: FeldFehler = {};
      if (!DATUM_MUSTER.test(neu.datum)) {
        fehler.datum = "Bitte wähle ein Datum.";
      }
      if (!ZEIT_MUSTER.test(neu.startZeit)) {
        fehler.start = "Bitte gib eine Startzeit ein.";
      }
      if (!ZEIT_MUSTER.test(neu.endZeit)) {
        fehler.ende = "Bitte gib eine Endzeit ein.";
      } else if (
        ZEIT_MUSTER.test(neu.startZeit) &&
        neu.endZeit <= neu.startZeit
      ) {
        // Gleicher Wortlaut wie im BookingForm.
        fehler.ende = "Die Endzeit muss nach der Startzeit liegen.";
      }
      setFeldFehler(fehler);
      if (Object.keys(fehler).length > 0) return;
      committiere({ ...filter, ...neu, merkmale: filter.merkmale });
    },
    [committiere, filter],
  );

  const resetFilter = useCallback(() => {
    const standard = standardFilter();
    setEingaben(standard);
    setFeldFehler({});
    committiere(standard);
  }, [committiere]);

  const istStandard = useMemo(
    () =>
      filter.datum === standardFilter().datum &&
      filter.startZeit === "08:00" &&
      filter.endZeit === "18:00" &&
      filter.merkmale.length === 0,
    [filter],
  );

  /**
   * Die eigentliche Suche. EIN Effekt unten feuert sie bei Mount, jedem
   * committeten Filterwechsel und jedem Retry-Tick – alle Trigger liegen im
   * selben Dep-Satz, jeder Lauf bricht den vorherigen Request ab.
   */
  const suche = useCallback(
    async (signal: AbortSignal) => {
      setLadeZustand({ phase: "loading" });
      try {
        const raeume = await listAvailableRooms(
          `${filter.datum}T${filter.startZeit}:00Z`,
          `${filter.datum}T${filter.endZeit}:00Z`
        );
        if (signal.aborted) return;
        setLadeZustand({ phase: "ready", raeume });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // Unmount/Neuladen
        if (signal.aborted) return;
        setLadeZustand({
          phase: "error",
          meldung:
            err instanceof ApiError
              ? err.message
              : "Der Server ist momentan nicht erreichbar oder meldet einen Fehler.",
        });
      }
    },
    [filter]
  );

  useEffect(() => {
    const controller = new AbortController();
    void suche(controller.signal);
    return () => controller.abort();
  }, [suche, nochmalTick]);

  const erneutSuchen = useCallback(() => setNochmalTick((t) => t + 1), []);

  /**
   * Nach dem Anlegen einer Buchung nur die Treffer still nachladen: Der
   * gebuchte Raum fällt sofort aus der Liste, ohne dass die Seite ins
   * Skeleton fällt. Schlägt das Nachladen fehl, bleibt die Ansicht benutzbar
   * – „Erneut versuchen" und der nächste Filterwechsel sind die Auswege.
   */
  const trefferNeuLaden = useCallback(async () => {
    try {
      const raeume = await listAvailableRooms(
        `${filter.datum}T${filter.startZeit}:00Z`,
        `${filter.datum}T${filter.endZeit}:00Z`
      );
      setLadeZustand({ phase: "ready", raeume });
    } catch {
      // Bewusst still: die nächste Aktion lädt ohnehin neu.
    }
  }, [filter]);

  const gefilterteRaeume = useMemo(
    () =>
      ladeZustand.phase === "ready"
        ? filterRaeumeNachMerkmalen(ladeZustand.raeume, filter.merkmale)
        : [],
    [ladeZustand, filter.merkmale]
  );

  /** Zeitraum-Eingaben – einmal definiert, inline (ab md) und im Sheet (< md). */
  const zeitraumEingaben = (
    <div className="space-y-1">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="search-date" className="text-sm font-medium">
            Datum
          </label>
          <input
            id="search-date"
            data-testid="search-date"
            type="date"
            value={eingaben.datum}
            onChange={(e) => {
              const wert = e.target.value;
              setEingaben((alt) => ({ ...alt, datum: wert }));
              uebernehmeZeitraum({ ...eingaben, datum: wert });
            }}
            className={`${inputClass} tabular-nums`}
            aria-invalid={feldFehler.datum !== undefined}
          />
          {feldFehler.datum !== undefined && (
            <p data-testid="search-error-date" className="text-xs text-destructive">
              {feldFehler.datum}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="search-from" className="text-sm font-medium">
            Start
          </label>
          <input
            id="search-from"
            data-testid="search-from"
            type="time"
            step={900}
            value={eingaben.startZeit}
            onChange={(e) => {
              const wert = e.target.value;
              setEingaben((alt) => ({ ...alt, startZeit: wert }));
              uebernehmeZeitraum({ ...eingaben, startZeit: wert });
            }}
            className={`${inputClass} tabular-nums`}
            aria-invalid={feldFehler.start !== undefined}
          />
          {feldFehler.start !== undefined && (
            <p data-testid="search-error-start" className="text-xs text-destructive">
              {feldFehler.start}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="search-to" className="text-sm font-medium">
            Ende
          </label>
          <input
            id="search-to"
            data-testid="search-to"
            type="time"
            step={900}
            value={eingaben.endZeit}
            onChange={(e) => {
              const wert = e.target.value;
              setEingaben((alt) => ({ ...alt, endZeit: wert }));
              uebernehmeZeitraum({ ...eingaben, endZeit: wert });
            }}
            className={`${inputClass} tabular-nums`}
            aria-invalid={feldFehler.ende !== undefined}
          />
          {feldFehler.ende !== undefined && (
            <p data-testid="search-error-end" className="text-xs text-destructive">
              {feldFehler.ende}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const merkmalsAuswahl = (
    <AmenityFilter
      selectedKeys={filter.merkmale}
      onSelectionChange={(keys) =>
        committiere({ ...filter, merkmale: [...new Set(keys)] })
      }
    />
  );

  return (
    <section aria-labelledby="search-heading" data-testid="search-page">
      {/* Seitenkopf nach dem einheitlichen Muster – bewusst ohne Primäraktion
          im Seitenkopf: die Aktion dieser Ansicht steht pro Treffer. */}
      <div className="mb-6">
        <h1 id="search-heading" className="text-2xl font-semibold tracking-tight">
          Freie Räume
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Räume ohne Buchung im gewählten Zeitraum
        </p>
      </div>

      {/* Filterbereich: Desktop inline über der Liste, mobil (< md) hinter
          dem „Filter"-Button im Sheet – Anzahl aktiver Merkmalsfilter am
          Button (Konzept „Responsive-Verhalten"). */}
      <Card data-testid="search-filter" className="mb-6 hidden md:block">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Wann brauchst du den Raum?</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Zeigt Räume, die im gewählten Zeitraum keine Buchung haben.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilter}
              disabled={istStandard}
              data-testid="search-filter-reset"
            >
              Filter zurücksetzen
            </Button>
          </div>
        </CardHeader>
        <CardContent>{zeitraumEingaben}</CardContent>
      </Card>

      {/* Mobil-Auslöser des Filter-Sheets. */}
      <div className="mb-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full max-md:h-11"
              data-testid="search-filter-sheet-trigger"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filter
              {filter.merkmale.length > 0 ? ` (${filter.merkmale.length})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto" data-testid="search-filter-sheet">
            <SheetHeader>
              <SheetTitle>Filter</SheetTitle>
              <SheetDescription>
                Zeitraum und Ausstattung für die Suche festlegen.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4 pb-6">
              {zeitraumEingaben}
              {merkmalsAuswahl}
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilter}
                disabled={istStandard}
                data-testid="search-filter-sheet-reset"
              >
                Filter zurücksetzen
              </Button>
              <SheetClose asChild>
                <Button data-testid="search-filter-sheet-close">Ergebnisse zeigen</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Merkmalsfilter als zweite Card – derselbe Baustein wie in der
          Raumliste (Katalog-Lade-/Fehlerzustand bleiben inline darin). */}
      <div className="hidden md:block">{merkmalsAuswahl}</div>

      {ladeZustand.phase === "loading" && <TrefferSkeleton />}
      {ladeZustand.phase === "error" && (
        <SuchFehler meldung={ladeZustand.meldung} onRetry={erneutSuchen} />
      )}
      {ladeZustand.phase === "ready" && gefilterteRaeume.length === 0 && (
        <KeineRaeumeFrei onReset={resetFilter} />
      )}
      {ladeZustand.phase === "ready" && gefilterteRaeume.length > 0 && (
        <div
          data-testid="search-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {gefilterteRaeume.map((raum) => (
            <TrefferCard
              key={raum.id}
              raum={raum}
              filter={filter}
              onBuchen={setBuchungsRaum}
            />
          ))}
        </div>
      )}

      {/* Buchungsdialog über der Suchseite (Formularmuster „Dialog"): Raum
          aus dem Treffer, Datum und exakter Suchzeitraum vorbelegt; nach
          Erfolg schließt er und die Treffer werden still nachgeladen. */}
      {buchungsRaum !== null && (
        <BookingForm
          raumId={buchungsRaum.id}
          kalenderDatum={filter.datum}
          startZeit={filter.startZeit}
          endZeit={filter.endZeit}
          open
          onOpenChange={(offen) => {
            if (!offen) setBuchungsRaum(null);
          }}
          onGespeichert={() => void trefferNeuLaden()}
        />
      )}
    </section>
  );
}
