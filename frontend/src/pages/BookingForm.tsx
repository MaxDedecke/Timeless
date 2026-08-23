import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CalendarPlus } from "lucide-react";

import { ApiError } from "../api/http";
import { createBooking } from "../api/bookings";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

/**
 * Buchungsdialog (Design-Konzept „Kernkomponenten → Dialog"): wird aus dem
 * Raumkalender über den „Raum buchen"-Primärbutton im Seitenkopf geöffnet.
 * Vorausgefüllt mit dem gewählten Kalendertag; Absenden ruft POST /api/
 * bookings auf. Zustände laut Konzept: Während des Speicherns bleibt der
 * Dialog offen, der Submit-Button ist deaktiviert und zeigt einen Inline-
 * Spinner; ein Konflikt (HTTP 409) oder sonstiger Fachfehler erscheint als
 * destructives Alert MIT der Backend-Meldung, Eingaben bleiben erhalten.
 * Bei Erfolg schließt der Dialog, der Kalender lädt die Liste neu, sodass
 * die neue Buchung unmittelbar im Gitter steht. Alle Fetches laufen relativ
 * über /api (kein Servicename im Browser-Code), Zeiten formatiert
 * ausschließlich lib/format.
 */

/** Einheitlicher Eingaben-Stil wie im Raumformular (Tokens, kein Hex-Wert). */
const inputClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface FeldFehler {
  datum?: string;
  start?: string;
  ende?: string;
  urheber?: string;
}

interface BookingFormProps {
  raumId: number;
  /** Gewählter Kalendertag als „YYYY-MM-DD" – Vorausfüllung des Datumsfelds. */
  kalenderDatum: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wird nach erfolgreicher Speicherung gerufen: Kalender lädt neu. */
  onGespeichert: () => void;
}

export default function BookingForm({
  raumId,
  kalenderDatum,
  open,
  onOpenChange,
  onGespeichert,
}: BookingFormProps) {
  const [datum, setDatum] = useState(kalenderDatum);
  const [start, setStart] = useState("");
  const [ende, setEnde] = useState("");
  const [urheber, setUrheber] = useState("");
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  // Jedes Öffnen startet sauber: Kalendertag als Datum, leere Zeiten, keine
  // alten Meldungen – kein veralteter Fehler über einer neuen Buchung.
  useEffect(() => {
    if (open) {
      setDatum(kalenderDatum);
      setStart("");
      setEnde("");
      setUrheber("");
      setFeldFehler({});
      setSpeicherFehler(null);
    }
  }, [open, kalenderDatum]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Alte Meldung sofort entfernen – auch wenn die Validierung abbricht
    // (Konzept „Speicherfehler im Formular").
    setSpeicherFehler(null);

    const fehler: FeldFehler = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
      fehler.datum = "Bitte wähle ein Datum.";
    }
    if (start === "") {
      fehler.start = "Bitte gib eine Startzeit ein.";
    }
    if (ende === "") {
      fehler.ende = "Bitte gib eine Endzeit ein.";
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
    if (urheber.trim() === "") {
      fehler.urheber = "Bitte gib deine E-Mail-Adresse als Urheber an.";
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
      setSpeichert(false);
      onGespeichert();
      onOpenChange(false);
    } catch (err) {
      setSpeichert(false);
      setSpeicherFehler(
        err instanceof ApiError
          ? err.message
          : "Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="booking-dialog" className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Raum buchen</DialogTitle>
          <DialogDescription>
            Datum und Zeitraum angeben – überschneidende Buchungen werden
            abgelehnt.
          </DialogDescription>
        </DialogHeader>

        <form
          data-testid="booking-form"
          noValidate
          onSubmit={onSubmit}
          className="space-y-4"
        >
          {/* Zusammengehörige Felder laut Konzept im Dreispalter ab sm. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="booking-date" className="text-sm font-medium">
                Datum
              </label>
              <input
                id="booking-date"
                data-testid="booking-date"
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className={`${inputClass} tabular-nums`}
                aria-invalid={feldFehler.datum !== undefined}
                aria-describedby={
                  feldFehler.datum !== undefined ? "booking-date-error" : undefined
                }
              />
              {feldFehler.datum !== undefined && (
                <p
                  id="booking-date-error"
                  data-testid="booking-date-error"
                  className="text-xs text-destructive"
                >
                  {feldFehler.datum}
                </p>
              )}
            </div>
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
                className={`${inputClass} tabular-nums`}
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
                className={`${inputClass} tabular-nums`}
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

          <DialogFooter className="pt-2">
            {/* type="button": Ohne Angabe wäre der Button implizit ein Submit
                und würde beim Klick das Formular zusätzlich absenden. */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={speichert}
              data-testid="booking-cancel"
            >
              Abbrechen
            </Button>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
