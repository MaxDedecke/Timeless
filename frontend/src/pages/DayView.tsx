import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MapPin,
  RotateCw,
} from "lucide-react";

import { ApiError } from "../api/http";
import {
  checkInBooking,
  listBookingsForRoom,
  type Booking,
} from "../api/bookings";
import { listLocations, type Location } from "../api/locations";
import { listRooms, type Room } from "../api/rooms";
import TimeGrid, {
  type CheckInFehler,
  type TimeGridLane,
} from "../components/TimeGrid";
import { formatDate } from "../lib/format";
import { getCurrentUser } from "../lib/currentUser";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

/**
 * Tagesansicht (/day bzw. /day/:locationId): listet alle Räume des gewählten
 * Standorts als TimeGrid-Spuren samt ihrer Belegung am gewählten Tag. Die
 * Buchungen kommen über denselben Endpoint wie im Raumkalender
 * (GET /api/bookings?roomId=…), angefordert für alle Räume des Standorts
 * parallel; jeder Datumswechsel lädt die Belegung des gewählten Tags neu.
 *
 * URL-Vertrag: Der Standort liegt als Routensegment vor (ohne Segment oder
 * bei unbekannter ID fällt die Ansicht auf den ersten Standort aus dem
 * Locations-API zurück), das Datum als Suchparameter ?date=YYYY-MM-DD mit
 * Default heute. Vorgänger-/Folgetag-Navigation ändert ausschließlich den
 * Suchparameter – Deep-Linking über die URL statt <select>-Interaktion;
 * der Standortwechsel läuft ebenso über Links, nie über ein natives
 * Auswahlfeld. Alle Fetches laufen relativ über /api (Reverse-Proxy, kein
 * Servicename im Browser-Code); Datum formatiert ausschließlich lib/format.
 *
 * Check-in (Anforderung 1): Auch hier zeigt das gemeinsame TimeGrid die
 * Aktion an der laufenden, eigenen Buchung. Nach Erfolg erscheint der
 * Erfolgs-Toast und NUR die betroffene Raumspur lädt ihre Belegung neu –
 * die übrigen Räume und der Ladezustand der Gesamtansicht bleiben unberührt.
 */

/** Heutiges Datum als „YYYY-MM-DD" (UTC) – Default des Datumswechslers. */
function heuteIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Verschiebt ein „YYYY-MM-DD" um ganzzahlige Tage (UTC-Arithmetik). */
function verschiebeTag(iso: string, tage: number): string {
  const datum = new Date(`${iso}T00:00:00Z`);
  datum.setUTCDate(datum.getUTCDate() + tage);
  return datum.toISOString().slice(0, 10);
}

/**
 * Liest das Datum aus dem Suchparameter: Nur wohlgeformte, tatsächlich
 * existierende Tage gelten – alles andere (auch ?date=quatsch) fällt auf
 * heute zurück, statt eine kaputte oder falsche Ansicht zu zeigen.
 */
function datumAusSuchparameter(wert: string | null): string {
  if (
    wert !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(wert) &&
    !Number.isNaN(Date.parse(`${wert}T00:00:00Z`))
  ) {
    return wert;
  }
  return heuteIso();
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "no-locations" }
  | {
      phase: "ready";
      standorte: Location[];
      location: Location;
      rooms: Room[];
    };

interface LadefehlerProps {
  onRetry: () => void;
}

/** Ladefehler: destructives Alert mit „Erneut versuchen" (Konzept-Muster). */
function Ladefehler({ onRetry }: LadefehlerProps) {
  return (
    <Alert variant="destructive" data-testid="dayview-error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Tagesansicht konnte nicht geladen werden</AlertTitle>
      <AlertDescription>
        Der Server ist momentan nicht erreichbar oder meldet einen Fehler.
        <div className="mt-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRetry}
            data-testid="dayview-retry"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Leerzustand „gar keine Standorte": Ohne verwaltete Standorte kann die
 * Ansicht weder einen Ziel-Standort bestimmen noch Räume zuordnen – eigener
 * Zustand statt generischem Fehler (Konzept „Leerzustand").
 */
function KeineStandorte() {
  return (
    <Card
      data-testid="dayview-no-locations"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-base font-medium text-card-foreground">
        Noch kein Standort angelegt.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Lege zuerst einen Standort an – sobald es ihn gibt, erscheinen hier
        seine Räume mit ihrem Zeitraster.
      </p>
    </Card>
  );
}

export default function DayView() {
  const params = useParams();
  const [suchparameter, setSuchparameter] = useSearchParams();

  // Standort aus der Route; fehlt er oder ist unbekannt, greift der Fallback
  // auf den ersten Standort aus dem Locations-API.
  const rawLocationId = params.locationId;

  const datum = datumAusSuchparameter(suchparameter.get("date"));

  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [belegung, setBelegung] = useState<Record<number, Booking[]>>({});
  const [reloadTick, setReloadTick] = useState(0);

  /** ID der Buchung mit laufendem Check-in (Spinner am Button). */
  const [checkingInId, setCheckingInId] = useState<number | string | null>(
    null
  );
  /** Gescheiterter Check-in → destructives Inline-Feedback am Buchungsblock. */
  const [checkInFehler, setCheckInFehler] =
    useState<CheckInFehler | null>(null);

  /**
   * Eine einzige Ladeschleife für Standorte/Räume UND Belegung: Sie läuft
   * beim ersten Laden, nach „Erneut versuchen" und bei jedem Datumswechsel.
   * Der Datumswechsel ist bewusst ein erneutes Laden statt einer client-
   * seitigen Filterung – die Ansicht holt je Raum nur die Buchungen des
   * gewählten Tags (dieselbe Semantik wie der Tagesendpoint im Kalender)
   * und wirft damit die Daten des Vortags ersatzlos weg. Schlägt auch nur
   * eine Anfrage fehl, greift der Fehlerzustand der ganzen Ansicht; das
   * Abbruch-Signal bricht veraltete Läufe ab, bevor sie Zustand setzen.
   */
  const ladeAlles = useCallback(
    async (signal: AbortSignal, tag: string) => {
      try {
        // Standorte zuerst: Sie bestimmen den Ziel-Standort.
        const standorte = await listLocations();
        if (signal.aborted) return; // Unmount/Neuladen/Tag gewechselt
        let gefundenerStandort: Location | undefined;
        if (rawLocationId !== undefined && /^\d+$/.test(rawLocationId)) {
          const id = Number(rawLocationId);
          gefundenerStandort = standorte.find((standort) => standort.id === id);
        }
        if (gefundenerStandort === undefined) {
          gefundenerStandort = standorte[0];
        }
        if (gefundenerStandort === undefined) {
          setState({ phase: "no-locations" });
          return;
        }
        const ziel = gefundenerStandort; // const-Alias für die Filter-Closure
        const zielId = ziel.id;

        const alleRaeume = await listRooms();
        if (signal.aborted) return;
        const raeume = alleRaeume.filter((raum) => raum.locationId === zielId);

        // Buchungen aller Räume des Standorts PARALLEL anfordern – derselbe
        // Endpoint wie im Raumkalender, begrenzt auf den gewählten Tag.
        const listen = await Promise.allSettled(
          raeume.map((raum) => listBookingsForRoom(raum.id, tag))
        );
        if (signal.aborted) return;
        if (
          listen.some((ergebnis) => ergebnis.status === "rejected")
        ) {
          throw new Error("Buchungen konnten nicht geladen werden.");
        }

        const nachRaum: Record<number, Booking[]> = {};
        raeume.forEach((raum, index) => {
          nachRaum[raum.id] = (
            listen[index] as PromiseFulfilledResult<Booking[]>
          ).value;
        });

        setState({
          phase: "ready",
          standorte,
          location: ziel,
          rooms: raeume,
        });
        setBelegung(nachRaum);
      } catch {
        if (!signal.aborted) setState({ phase: "error" });
      }
    },
    [rawLocationId]
  );

  // Ein einziger Effekt für Erstladen, Datumswechsel und „Erneut versuchen":
  // Die beiden bisherigen Effekte teilten sich die Abhängigkeit ladeAlles und
  // reagierten BEIDE auf Datum/Standort – nach dem ersten Retry (reloadTick >
  // 0) lief dadurch jeder Datumswechsel doppelt und forderte die Buchungen
  // aller Räume zweimal parallel an. Über den Tick im selben Abhängigkeits-
  // satz startet jeder Auslöser genau einen Lauf; der Cleanup bricht den
  // Vorgängerlauf ab, bevor er Zustand setzen kann.
  useEffect(() => {
    const controller = new AbortController();
    // Kein veralteter Beleg unter dem neuen Datum: Bei jedem (Neu-)Start der
    // Ladeschleife fällt die Ansicht sofort zurück in den Ladezustand.
    setState((vorher) =>
      vorher.phase === "loading" ? vorher : { phase: "loading" }
    );
    void ladeAlles(controller.signal, datum);
    return () => controller.abort();
  }, [ladeAlles, datum, reloadTick]);

  const nochmalLaden = useCallback(() => {
    setState({ phase: "loading" });
    setBelegung({});
    setReloadTick((tick) => tick + 1);
  }, []);

  /**
   * Belegung EINES Raums nachladen – Grundlage des gezielten Refetchs nach
   * einem Check-in: Nur die betroffene Spur frischt sich auf, die übrigen
   * Räume und der Ladezustand der Gesamtansicht bleiben unberührt.
   */
  const belegungEinesRaumsNeuLaden = useCallback(
    async (raumId: number): Promise<Booking[] | null> => {
      try {
        const liste = await listBookingsForRoom(raumId, datum);
        setBelegung((vorher) => ({ ...vorher, [raumId]: liste }));
        return liste;
      } catch {
        // Still wie im Raumkalender: Der eingecheckte Stand ist serverseitig
        // gültig; der nächste Neulade-Vorgang (Datumswechsel, Aktualisieren)
        // holt ihn.
        return null;
      }
    },
    [datum]
  );

  /**
   * Check-in der laufenden, eigenen Buchung (Anforderung 1) – dieselbe
   * Aktion wie im Raumkalender, wiederverwendet über das gemeinsame TimeGrid:
   * Erfolg → Toast „Check-in erfasst“ und gezielter Refetch nur der
   * betroffenen Raumspur; Fehlschlag → destructives Inline-Feedback am Block
   * plus stiller Abgleich. In der Tagesansicht können mehrere eigene
   * Buchungen gleichzeitig laufen (Konzept), deshalb schützt `checkingInId`
   * vor Doppelklicks auf denselben Vorgang.
   */
  const checkInAusloesen = useCallback(
    async (slotBuchung: { id: number | string; roomId?: number }) => {
      const id = Number(slotBuchung.id);
      if (!Number.isInteger(id) || checkingInId !== null) return;
      setCheckInFehler(null);
      setCheckingInId(id);
      try {
        await checkInBooking(id);
        toast.success("Check-in erfasst");
        if (slotBuchung.roomId !== undefined && Number.isInteger(slotBuchung.roomId)) {
          await belegungEinesRaumsNeuLaden(slotBuchung.roomId);
        }
      } catch (err) {
        setCheckInFehler({
          bookingId: slotBuchung.id,
          message:
            err instanceof ApiError
              ? err.message
              : "Der Server ist momentan nicht erreichbar oder meldet einen Fehler.",
        });
        if (
          slotBuchung.roomId !== undefined &&
          Number.isInteger(slotBuchung.roomId)
        ) {
          void belegungEinesRaumsNeuLaden(slotBuchung.roomId);
        }
      } finally {
        setCheckingInId(null);
      }
    },
    [belegungEinesRaumsNeuLaden, checkingInId]
  );

  const aktuellerNutzer = useMemo(() => getCurrentUser(), []);

  /**
   * Tageswechsel: Nur der Suchparameter ändert sich – Pfad und damit die
   * geladenen Räume bleiben stehen, es läuft kein erneuter Request.
   */
  const wechsleTag = useCallback(
    (tage: number) => {
      setSuchparameter({ date: verschiebeTag(datum, tage) });
    },
    [datum, setSuchparameter],
  );

  const lanes: TimeGridLane[] = useMemo(() => {
    if (state.phase !== "ready") return [];
    return state.rooms.map((room) => ({
      id: room.id,
      title: room.name,
      // Belegung des gewählten Tags; ein Raum ohne Buchungen bleibt gültig
      // leer und zeichnet nur freie Fenster.
      bookings: (belegung[room.id] ?? []).map((buchung) => ({
        id: buchung.id,
        start: buchung.startsAt,
        end: buchung.endsAt,
        status: buchung.status,
        // Urheber und Raum für die Check-in-Regel („nur eigene, laufende
        // Buchung“) bzw. den gezielten Refetch der betroffenen Spur.
        createdBy: buchung.createdBy,
        roomId: buchung.roomId,
        // No-Show-Frist aus der API-Antwort an TimeGrid weitergeben,
        // damit das Check-in-Fenster dynamisch statt hart an 15 Minuten ist.
        noShowAfterMinutes: buchung.noShowAfterMinutes,
      })),
    }));
  }, [state, belegung]);

  return (
    <section aria-labelledby="dayview-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            id="dayview-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Tagesansicht
          </h1>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {state.phase === "ready" ? (
              <>
                {formatDate(`${datum}T12:00:00Z`)}
                {" · Standort: "}
                <span data-testid="dayview-location-name">
                  {state.location.name}
                </span>
              </>
            ) : (
              "Alle Räume eines Standorts am gewählten Tag."
            )}
          </p>
        </div>

        {/* Datumswechsel über die URL: Vortag / Heute / Folgetag. */}
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="dayview-dateswitcher"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => wechsleTag(-1)}
            data-testid="dayview-prev-day"
            aria-label="Vorheriger Tag"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Vortag
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSuchparameter({ date: heuteIso() })}
            data-testid="dayview-today"
          >
            Heute
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => wechsleTag(1)}
            data-testid="dayview-next-day"
            aria-label="Folgetag"
          >
            Folgetag
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span
            className="text-sm font-medium tabular-nums text-muted-foreground"
            data-testid="dayview-date-label"
          >
            {formatDate(`${datum}T12:00:00Z`)}
          </span>
        </div>
      </div>

      {/* Standortwechsel als echte Links (Deep-Linking statt natives
          <select>): Der Ziel-Standort liegt vollständig in der URL. */}
      {state.phase === "ready" && state.standorte.length > 1 && (
        <nav
          aria-label="Standort wählen"
          className="mb-4 flex flex-wrap items-center gap-2"
        >
          {state.standorte.map((standort) => (
            <Button
              key={standort.id}
              asChild
              variant={standort.id === state.location.id ? "default" : "outline"}
              size="sm"
              data-testid={`dayview-location-${standort.id}`}
            >
              <Link to={`/day/${standort.id}?date=${datum}`}>
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {standort.name}
              </Link>
            </Button>
          ))}
        </nav>
      )}

      {state.phase === "error" && <Ladefehler onRetry={nochmalLaden} />}
      {state.phase === "no-locations" && <KeineStandorte />}

      {(state.phase === "loading" || state.phase === "ready") && (
        /* Zustände kommen aus TimeGrid: Skeleton beim Laden, eigene
           Empty-Card beim „Standort ohne Räume“, Hinweisband, solange keine
           Buchungen vorhanden sind (freie Fenster sind fachliches Ergebnis). */
        <TimeGrid
          lanes={lanes}
          isLoading={state.phase === "loading"}
          error={false}
          onRetry={nochmalLaden}
          currentUser={aktuellerNutzer ?? undefined}
          onCheckIn={(slotBuchung) => void checkInAusloesen(slotBuchung)}
          checkingInId={checkingInId}
          checkInFehler={checkInFehler}
        />
      )}
    </section>
  );
}
