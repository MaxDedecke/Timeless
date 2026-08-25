import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import BookingForm from "./BookingForm";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RotateCw,
  Users,
} from "lucide-react";

import { ApiError } from "../api/http";
import {
  checkInBooking,
  listBookingsForRoom,
  type Booking,
} from "../api/bookings";
import { getRoom, type Room } from "../api/rooms";
import TimeGrid, {
  type CheckInFehler,
  type TimeGridLane,
} from "../components/TimeGrid";
import { formatDate } from "../lib/format";
import { getCurrentUser } from "../lib/currentUser";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

/**
 * Raumkalender (/rooms/:id): zeigt die Buchungen eines Raums zeitlich geordnet
 * im gemeinsamen Zeitraster (TimeGrid, eine Spur) mit Start-/Endzeit und
 * Status-Badge; freie Fenster zeichnet TimeGrid über das Muted-Token. Alle
 * Fetches laufen relativ über /api (Reverse-Proxy, kein Servicename im
 * Browser-Code); Zeitangaben formatiert ausschließlich lib/format. Zustände
 * laut Konzept: Skeleton beim Laden (in Rasterform über TimeGrid), destructives
 * Alert bei Ladefehlern mit „Erneut versuchen" und Rückweg zur Raumliste,
 * Leere als Hinweisband über dem sichtbaren Gitter (freie Fenster sind
 * fachliches Ergebnis, kein Fehler). Über den „Raum buchen"-Primärbutton im
 * Seitenkopf öffnet sich der Buchungsdialog (pages/BookingForm.tsx): Speichern
 * läuft gegen die bestehende Anlegen-API inklusive Konfliktprüfung (409
 * erscheint im Dialog als verständliches Alert), bei Erfolg schließt der
 * Dialog und die Buchungsliste wird neu geladen, sodass die neue Buchung
 * unmittelbar im Zeitgitter steht. Die laufende, eigene Buchung erhält
 * außerdem den Check-in-Button aus dem gemeinsamen TimeGrid (Anforderung 1):
 * Nach erfolgreichem Check-in erscheint ein Erfolgs-Toast, das Badge wechselt
 * über den Refetch auf „Eingecheckt", der Button entfällt; ein Fehlschlag –
 * etwa eine zwischenzeitlich abgelaufene No-Show-Frist (409) – erscheint als
 * destructives Inline-Feedback am Buchungsblock und die Ansicht lädt nach.
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
 * Buchungen, die den dargestellten Tag schneiden (halboffenes Intervall,
 * wie die Konfliktprüfung im Backend). Buchungen mit nicht parsebaren Zeiten
 * bleiben stehen – TimeGrid zeigt sie als erkennbaren Platzhalterblock, statt
 * sie still zu verbergen.
 */
function buchungenAmTag(buchungen: Booking[], tag: string): Booking[] {
  const von = Date.parse(`${tag}T00:00:00.000Z`);
  if (Number.isNaN(von)) return [];
  const bis = von + 24 * 60 * 60 * 1000;
  return buchungen.filter((buchung) => {
    const start = Date.parse(buchung.startsAt);
    const ende = Date.parse(buchung.endsAt);
    if (Number.isNaN(start) || Number.isNaN(ende)) return true;
    return start < bis && ende > von;
  });
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; room: Room };

/** Einheitlicher Eingaben-Stil wie im Raumformular (Tokens, kein Hex-Wert). */
const inputClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface DateSwitcherProps {
  datum: string;
  onChange: (datum: string) => void;
}

/** Datumswechsel: Tag zurück/vor, „Heute", Direkteingabe über das native Feld. */
function DateSwitcher({ datum, onChange }: DateSwitcherProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(verschiebeTag(datum, -1))}
        data-testid="room-calendar-prev-day"
        aria-label="Vorheriger Tag"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Vorheriger Tag
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(heuteIso())}
        data-testid="room-calendar-today"
      >
        Heute
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(verschiebeTag(datum, 1))}
        data-testid="room-calendar-next-day"
        aria-label="Nächster Tag"
      >
        Nächster Tag
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      {/* Direkteingabe: natives Datumfeld, Wert = „YYYY-MM-DD". */}
      <input
        type="date"
        value={datum}
        onChange={(e) => {
          const wert = e.target.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) onChange(wert);
        }}
        className={`${inputClass} w-auto tabular-nums`}
        data-testid="room-calendar-date-input"
        aria-label="Datum des Kalenders"
      />
      <span
        className="ml-auto text-sm font-medium tabular-nums text-muted-foreground"
        data-testid="room-calendar-date-label"
      >
        {formatDate(`${datum}T12:00:00Z`)}
      </span>
    </div>
  );
}

interface LadefehlerProps {
  meldung: string;
  onRetry: () => void;
}

/** Ladefehler der Ansicht: destructives Alert mit Neuladen und Rückweg. */
function Ladefehler({ meldung, onRetry }: LadefehlerProps) {
  return (
    <Alert variant="destructive" data-testid="room-calendar-error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Kalender konnte nicht geladen werden</AlertTitle>
      <AlertDescription>
        {meldung}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRetry}
            data-testid="room-calendar-retry"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/rooms">Zurück zur Raumliste</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}





export default function RoomCalendar() {
  const params = useParams();
  const [datum, setDatum] = useState<string>(heuteIso());
  const [dialogOffen, setDialogOffen] = useState(false);

  // Raum-ID aus der Route; nicht-numerische IDs werden ohne unnötigen Request
  // direkt wie ein 404 behandelt (gleiche Semantik wie die API).
  const rawId = params.id;
  const parsedId = rawId !== undefined ? Number(rawId) : NaN;
  const raumIdGueltig =
    rawId !== undefined && Number.isInteger(parsedId) && parsedId >= 1;

  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [buchungen, setBuchungen] = useState<Booking[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  /** ID der Buchung mit laufendem Check-in (Spinner am Button). */
  const [checkingInId, setCheckingInId] = useState<number | string | null>(
    null
  );
  /** Gescheiterter Check-in → destructives Inline-Feedback am Buchungsblock. */
  const [checkInFehler, setCheckInFehler] =
    useState<CheckInFehler | null>(null);

  const ladeAlles = useCallback(async (signal: AbortSignal) => {
    if (!raumIdGueltig) {
      setLoadState({ phase: "error", message: "Raum nicht gefunden." });
      return;
    }
    // Raum und Buchungen parallel holen, aber die Fehler DETERMINISTISCH
    // werten: Ein 404 des Raums gewinnt gegen jede andere Ablehnung (z. B.
    // eine gestörte Buchungsliste), damit eine unbekannte Raum-ID immer die
    // verständliche „nicht gefunden"-Meldung zeigt und nie zufällig den
    // generischen Serverfehler – je nachdem, welcher Request zuerst abbricht.
    const [raumErgebnis, buchungenErgebnis] = await Promise.allSettled([
      getRoom(parsedId),
      listBookingsForRoom(parsedId),
    ]);
    if (signal.aborted) return; // Unmount/Neuladen
    const ablehnungen = [raumErgebnis, buchungenErgebnis].filter(
      (ergebnis): ergebnis is PromiseRejectedResult =>
        ergebnis.status === "rejected"
    );
    if (
      ablehnungen.some(
        (ablehnung) =>
          ablehnung.reason instanceof ApiError && ablehnung.reason.status === 404
      )
    ) {
      setLoadState({ phase: "error", message: "Raum nicht gefunden." });
      return;
    }
    if (ablehnungen.length > 0) {
      setLoadState({
        phase: "error",
        message:
          "Der Server ist momentan nicht erreichbar oder meldet einen Fehler.",
      });
      return;
    }
    setLoadState({
      phase: "ready",
      room: (raumErgebnis as PromiseFulfilledResult<Room>).value,
    });
    setBuchungen((buchungenErgebnis as PromiseFulfilledResult<Booking[]>).value);
  }, [parsedId, raumIdGueltig]);

  useEffect(() => {
    const controller = new AbortController();
    void ladeAlles(controller.signal);
    return () => controller.abort();
  }, [ladeAlles]);

  const nochmalLaden = useCallback(() => {
    setLoadState({ phase: "loading" });
    setReloadTick((t) => t + 1);
  }, []);

  // Reload muss auf den Tick reagieren, nicht auf ladeAlles allein.
  useEffect(() => {
    if (reloadTick === 0) return;
    const controller = new AbortController();
    void ladeAlles(controller.signal);
    return () => controller.abort();
  }, [reloadTick, ladeAlles]);

  /**
   * Nach dem Anlegen nur die Buchungen neu holen (nicht die ganze Seite ins
   * Skeleton fallen lassen): Die neue Buchung erscheint damit unmittelbar im
   * Gitter. Schlägt das Nachladen fehl, bleibt der Kalender stehen – das
   * Hinweisband bzw. „Erneut versuchen" bleibt als Ausweg sichtbar.
   */
  const buchungenNeuLaden = useCallback(async () => {
    if (!raumIdGueltig) return;
    try {
      const liste = await listBookingsForRoom(parsedId);
      setBuchungen(liste);
    } catch {
      // Bewusst still: Die Ansicht bleibt benutzbar, der nächste Versuch
      // läuft über die Neuladen-Aktionen der Ansicht.
    }
  }, [parsedId, raumIdGueltig]);

  /**
   * Check-in der laufenden, eigenen Buchung (Anforderung 1): Absenden gegen
   * POST /api/bookings/:id/check-in. Erfolg → Toast (Konzept „Toast nur für
   * transiente Erfolge“) und Refetch der Liste, sodass das Badge sofort auf
   * „Eingecheckt" wechselt und der Button entfällt. Fehlschlag (etwa
   * abgelaufene No-Show-Frist → 409) → destructives Inline-Feedback am
   * Buchungsblock statt Toast – der Nutzer muss den Fall adressieren; die
   * Ansicht lädt anschließend ihren Stand nach, falls sich zwischenzeitlich
   * etwas am Beleg geändert hat. Ein Fehler des Nachladens bleibt bewusst
   * still: Der eingecheckte Stand ist im Server-System ohnehin gültig, der
   * nächste Neulade-Vorgang der Ansicht holt ihn.
   */
  const checkInAusloesen = useCallback(
    async (slotBuchung: { id: number | string }) => {
      const id = Number(slotBuchung.id);
      if (!Number.isInteger(id) || checkingInId !== null) return;
      setCheckInFehler(null);
      setCheckingInId(id);
      try {
        await checkInBooking(id);
        toast.success("Check-in erfasst");
        await buchungenNeuLaden();
      } catch (err) {
        setCheckInFehler({
          bookingId: slotBuchung.id,
          message:
            err instanceof ApiError
              ? err.message
              : "Der Server ist momentan nicht erreichbar oder meldet einen Fehler.",
        });
        void buchungenNeuLaden();
      } finally {
        setCheckingInId(null);
      }
    },
    [buchungenNeuLaden, checkingInId]
  );

  const aktuellerNutzer = useMemo(() => getCurrentUser(), []);

  const spur: TimeGridLane | null = useMemo(() => {
    if (loadState.phase !== "ready") return null;
    return {
      id: loadState.room.id,
      title: loadState.room.name,
      bookings: buchungenAmTag(buchungen, datum).map((buchung) => ({
        id: buchung.id,
        start: buchung.startsAt,
        end: buchung.endsAt,
        status: buchung.status,
        // Urheber und Raum für die Check-in-Regel („nur eigene, laufende
        // Buchung“) bzw. das gezielte Nachladen in der Tagesansicht.
        createdBy: buchung.createdBy,
        roomId: buchung.roomId,
        // No-Show-Frist aus der API-Antwort an TimeGrid weitergeben,
        // damit das Check-in-Fenster dynamisch statt hart an 15 Minuten ist.
        noShowAfterMinutes: buchung.noShowAfterMinutes,
        // Gäste für die Badge-Anzeige im Slot (rein informativ); ohne Feld
        // (alter Datenstand) erscheint keine Gäste-Anzeige.
        guests: buchung.guests,
      })),
    };
  }, [loadState, buchungen, datum]);

  return (
    <section aria-labelledby="room-calendar-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            id="room-calendar-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {loadState.phase === "ready" ? loadState.room.name : "Raumkalender"}
          </h1>
          {loadState.phase === "ready" && (
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {loadState.room.location?.name ?? "Ohne Standort"}
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <Users className="h-4 w-4" aria-hidden="true" />
                {loadState.room.capacity} Personen
              </span>
              {loadState.room.amenities.map((merkmal) => (
                <Badge key={merkmal.key}>{merkmal.label}</Badge>
              ))}
            </p>
          )}
        </div>
        {/* Primäraktion im Seitenkopf (Konzept „Spacing & Layout-Raster"):
            öffnet den Buchungsdialog, sobald der Raum bereit ist. */}
        {loadState.phase === "ready" && (
          <Button onClick={() => setDialogOffen(true)} data-testid="room-book-button">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Raum buchen
          </Button>
        )}
        <Button variant="ghost" asChild>
          <Link to="/rooms">Zurück zur Raumliste</Link>
        </Button>
      </div>

      {loadState.phase === "error" && (
        <Ladefehler meldung={loadState.message} onRetry={nochmalLaden} />
      )}

      {loadState.phase !== "error" && (
        <>
          <DateSwitcher datum={datum} onChange={setDatum} />
          <TimeGrid
            lanes={spur === null ? [] : [spur]}
            isLoading={loadState.phase === "loading"}
            error={false}
            onRetry={nochmalLaden}
            currentUser={aktuellerNutzer ?? undefined}
            onCheckIn={(slotBuchung) => void checkInAusloesen(slotBuchung)}
            checkingInId={checkingInId}
            checkInFehler={checkInFehler}
          />
          {loadState.phase === "ready" && (
            <BookingForm
              raumId={loadState.room.id}
              kalenderDatum={datum}
              open={dialogOffen}
              onOpenChange={setDialogOffen}
              onGespeichert={() => void buchungenNeuLaden()}
            />
          )}
        </>
      )}
    </section>
  );
}
