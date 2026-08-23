import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
  createBooking,
  listBookingsForRoom,
  type Booking,
} from "../api/bookings";
import { getRoom, type Room } from "../api/rooms";
import TimeGrid, { type TimeGridLane } from "../components/TimeGrid";
import { formatDate } from "../lib/format";
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

/**
 * Raumkalender (/rooms/:id): zeigt die Buchungen eines Raums zeitlich geordnet
 * im gemeinsamen Zeitraster (TimeGrid, eine Spur) mit Start-/Endzeit und
 * Status-Badge; freie Fenster zeichnet TimeGrid über das Muted-Token. Alle
 * Fetches laufen relativ über /api (Reverse-Proxy, kein Servicename im
 * Browser-Code); Zeitangaben formatiert ausschließlich lib/format. Zustände
 * laut Konzept: Skeleton beim Laden (in Rasterform über TimeGrid), destructives
 * Alert bei Ladefehlern mit „Erneut versuchen" und Rückweg zur Raumliste,
 * Leere als Hinweisband über dem sichtbaren Gitter (freie Fenster sind
 * fachliches Ergebnis, kein Fehler). Unter dem Kalender liegt das Buchungs-
 * formular: Speichern läuft gegen die bestehende Anlegen-API inklusive
 * Konfliktprüfung (409 erscheint als verständliches Alert), danach wird die
 * Buchungsliste neu geladen, sodass die neue Buchung unmittelbar erscheint.
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
        className={`${inputClass} w-auto`}
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

interface BuchungsFormularProps {
  raumId: number;
  /** Gewählter Kalendertag als „YYYY-MM-DD" – Buchungen gelten für diesen Tag. */
  datum: string;
  /** Wird nach erfolgreicher Speicherung aufgerufen: Kalender neu laden. */
  onGespeichert: () => void;
}

interface FeldFehler {
  start?: string;
  ende?: string;
  urheber?: string;
}

/**
 * Buchungsformular dieses Raums: Datum kommt vom Datumswechsler, Start/Ende
 * und Urheber werden hier erfasst. Beim Speichern prüft das Backend Pflicht-
 * felder, Raumexistenz und Überschneidungen – ein Konflikt (HTTP 409) erscheint
 * als destructives Alert mit der Backend-Meldung, das Formular bleibt offen.
 */
function BuchungsFormular({
  raumId,
  datum,
  onGespeichert,
}: BuchungsFormularProps) {
  const [start, setStart] = useState("");
  const [ende, setEnde] = useState("");
  const [urheber, setUrheber] = useState("");
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Alte Meldung sofort entfernen – auch wenn die Validierung abbricht
    // (Konzept „Speicherfehler im Formular").
    setSpeicherFehler(null);

    const fehler: FeldFehler = {};
    if (start === "") {
      fehler.start = "Bitte gib eine Startzeit ein.";
    }
    if (ende === "") {
      fehler.ende = "Bitte gib eine Endzeit ein.";
    }
    if (urheber.trim() === "") {
      fehler.urheber = "Bitte gib deine E-Mail-Adresse als Urheber an.";
    }
    if (
      fehler.start === undefined &&
      fehler.ende === undefined &&
      start !== "" &&
      ende !== "" &&
      ende <= start
    ) {
      fehler.ende = "Die Endzeit muss nach der Startzeit liegen.";
    }
    setFeldFehler(fehler);
    if (Object.keys(fehler).length > 0) return;

    // ISO mit explizitem Z-Suffix: Der Server parst sonst in seiner lokalen
    // Zeitzone; „YYYY-MM-DD" + „HH:mm" ergeben so eindeutig UTC.
    setSpeichert(true);
    try {
      await createBooking({
        roomId: raumId,
        startsAt: `${datum}T${start.slice(0, 5)}:00Z`,
        endsAt: `${datum}T${ende.slice(0, 5)}:00Z`,
        createdBy: urheber.trim(),
      });
      setStart("");
      setEnde("");
      onGespeichert();
    } catch (err) {
      setSpeicherFehler(
        err instanceof ApiError
          ? err.message
          : "Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut."
      );
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <Card className="mt-8" data-testid="booking-form-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Raum buchen</CardTitle>
        <CardDescription>
          Zeitraum am {formatDate(`${datum}T12:00:00Z`)} angeben – überschneidende
          Buchungen werden abgelehnt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          data-testid="booking-form"
          noValidate
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="booking-start" className="text-sm font-medium">
                Start
              </label>
              <input
                id="booking-start"
                data-testid="booking-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputClass}
                aria-invalid={feldFehler.start !== undefined}
                aria-describedby={
                  feldFehler.start !== undefined ? "booking-start-error" : undefined
                }
              />
              {feldFehler.start !== undefined && (
                <p
                  id="booking-start-error"
                  data-testid="booking-start-error"
                  className="text-xs text-destructive"
                >
                  {feldFehler.start}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="booking-end" className="text-sm font-medium">
                Ende
              </label>
              <input
                id="booking-end"
                data-testid="booking-end"
                type="time"
                value={ende}
                onChange={(e) => setEnde(e.target.value)}
                className={inputClass}
                aria-invalid={feldFehler.ende !== undefined}
                aria-describedby={
                  feldFehler.ende !== undefined ? "booking-end-error" : undefined
                }
              />
              {feldFehler.ende !== undefined && (
                <p
                  id="booking-end-error"
                  data-testid="booking-end-error"
                  className="text-xs text-destructive"
                >
                  {feldFehler.ende}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="booking-created-by" className="text-sm font-medium">
              Urheber (E-Mail)
            </label>
            {/* Solange die SSO-Klärung beim Kunden läuft, führt der Urheber als
                Text weiter – dieselbe Semantik wie POST /api/bookings. */}
            <input
              id="booking-created-by"
              data-testid="booking-createdby"
              type="text"
              value={urheber}
              onChange={(e) => setUrheber(e.target.value)}
              placeholder="name@designfreak.de"
              className={inputClass}
              aria-invalid={feldFehler.urheber !== undefined}
              aria-describedby={
                feldFehler.urheber !== undefined
                  ? "booking-createdby-error"
                  : undefined
              }
            />
            {feldFehler.urheber !== undefined && (
              <p
                id="booking-createdby-error"
                data-testid="booking-createdby-error"
                className="text-xs text-destructive"
              >
                {feldFehler.urheber}
              </p>
            )}
          </div>

          {speicherFehler !== null && (
            <Alert variant="destructive" data-testid="booking-save-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Speichern fehlgeschlagen</AlertTitle>
              <AlertDescription>{speicherFehler}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={speichert} data-testid="booking-submit">
              {speichert && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                  data-testid="booking-save-spinner"
                />
              )}
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Buchung speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function RoomCalendar() {
  const params = useParams();
  const [datum, setDatum] = useState<string>(heuteIso());

  // Raum-ID aus der Route; nicht-numerische IDs werden ohne unnötigen Request
  // direkt wie ein 404 behandelt (gleiche Semantik wie die API).
  const rawId = params.id;
  const parsedId = rawId !== undefined ? Number(rawId) : NaN;
  const raumIdGueltig =
    rawId !== undefined && Number.isInteger(parsedId) && parsedId >= 1;

  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [buchungen, setBuchungen] = useState<Booking[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  const ladeAlles = useCallback(async (signal: AbortSignal) => {
    try {
      if (!raumIdGueltig) {
        setLoadState({ phase: "error", message: "Raum nicht gefunden." });
        return;
      }
      const [raum, liste] = await Promise.all([
        getRoom(parsedId),
        listBookingsForRoom(parsedId),
      ]);
      if (signal.aborted) return;
      setLoadState({ phase: "ready", room: raum });
      setBuchungen(liste);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // Unmount/Neuladen
      const message =
        err instanceof ApiError && err.status === 404
          ? "Raum nicht gefunden."
          : "Der Server ist momentan nicht erreichbar oder meldet einen Fehler.";
      setLoadState({ phase: "error", message });
    }
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
          />
          {loadState.phase === "ready" && (
            <BuchungsFormular
              raumId={loadState.room.id}
              datum={datum}
              onGespeichert={() => void buchungenNeuLaden()}
            />
          )}
        </>
      )}
    </section>
  );
}
