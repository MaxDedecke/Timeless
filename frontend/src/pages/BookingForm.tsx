import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CalendarPlus, Trash2, Users } from "lucide-react";

import { ApiError } from "../api/http";
import { createBooking } from "../api/bookings";
import { setCurrentUser } from "../lib/currentUser";
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
 * Buchungsdialog (Design-Konzept „Kernkomponenten → Dialog" und „Formularmuster:
 * Dialog vs. Route"): kontextunabhängig – Raum und Zeitraum kommen ausschließlich
 * als Props von der aufrufenden Ansicht. Einstiege heute: der Raumkalender über
 * den „Raum buchen"-Primärbutton im Seitenkopf sowie die Freie-Räume-Suche je
 * Treffer (pages/RoomSearch.tsx) mit vorbelegten Zeiten aus dem aktiven Suchfilter
 * (startZeit/endZeit). Absenden ruft POST /api/bookings auf. Zustände laut Konzept: Während des Speicherns bleibt der
 * Dialog offen, der Submit-Button ist deaktiviert und zeigt einen Inline-
 * Spinner; ein Konflikt (HTTP 409) oder sonstiger Fachfehler erscheint als
 * destructives Alert MIT der Backend-Meldung, Eingaben bleiben erhalten.
 * Bei Erfolg schließt der Dialog, der Kalender lädt die Liste neu, sodass
 * die neue Buchung unmittelbar im Gitter steht. Alle Fetches laufen relativ
 * über /api (kein Servicename im Browser-Code), Zeiten formatiert
 * ausschließlich lib/format.
 *
 * Gäste ohne eigenen Account (Anforderung „Buchung für Gäste ohne eigenen
 * Account", Konzept „Gäste-Erfassung im BookingForm"): Unterhalb des
 * Urheber-Felds liegt die Sektion „Gäste (ohne Account)" mit dynamischen
 * Zeilen (Name/E-Mail, Hinzufügen/Entfernen). Pflichtfelder und lockere
 * E-Mail-Prüfung greifen erst beim Submit; eine komplett leere Zeile wird
 * ignoriert statt als Fehler gewertet, ausgefüllte Zeilen gehen als
 * `guests: [{ name, email }, …]` in den POST – ohne Gäste bleibt der
 * Request byte-identisch zum bisherigen Vertrag.
 */

/** Einheitlicher Eingaben-Stil wie im Raumformular (Tokens, kein Hex-Wert). */
const inputClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Feldfehler des Formulars. Die Gäste-Keys (`guest-<id>-name` /
 * `guest-<id>-email`) sind dynamisch – deshalb Typ-Alias mit Index-Signatur
 * statt Interface: TypeScript erlaubt berechnete Template-Literal-Namen in
 * Interfaces nicht (Konzept „Validierung und Fehlerdarstellung": Gäste
 * erweitern das Record um dynamische Keys im gleichen Pattern).
 */
type FeldFehler = {
  datum?: string;
  start?: string;
  ende?: string;
  urheber?: string;
} & {
  [key: `guest-${number}-name` | `guest-${number}-email`]: string | undefined;
};

/** Eine Gästezeile im Formular: id als Laufnummer für Key, Fehler-Keys und Fokus. */
interface GastZeile {
  id: number;
  name: string;
  email: string;
}

interface BookingFormProps {
  raumId: number;
  /** Gewählter Tag als „YYYY-MM-DD" – Vorausfüllung des Datumsfelds. */
  kalenderDatum: string;
  /**
   * Optionale Zeit-Vorbelegung („HH:mm"), z. B. aus dem aktiven Suchfilter der
   * Freie-Räume-Suche. Ohne Angabe starten die Zeitfelder leer – das ist der
   * Pfad des Raumkalenders, dessen Verhalten sich dadurch nicht ändert.
   * Bewusst nur Startwerte beim Öffnen (Reset-Effekt), kein kontrollierter
   * Anschluss an Filter-State.
   */
  startZeit?: string;
  endZeit?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wird nach erfolgreicher Speicherung gerufen: Ansicht lädt neu. */
  onGespeichert: () => void;
}

export default function BookingForm({
  raumId,
  kalenderDatum,
  startZeit = "",
  endZeit = "",
  open,
  onOpenChange,
  onGespeichert,
}: BookingFormProps) {
  const [datum, setDatum] = useState(kalenderDatum);
  const [start, setStart] = useState("");
  const [ende, setEnde] = useState("");
  const [urheber, setUrheber] = useState("");
  // Gäste ohne eigenen Account (Anforderung „Buchung für Gäste ohne eigenen
  // Account"): lokale Zeilenliste gemäß Konzept „Dynamisches Hinzufügen und
  // Entfernen". Startet leer – „keine Gäste" ist der Normalfall.
  const [gaeste, setGaeste] = useState<GastZeile[]>([]);
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  /** Laufnummer für die nächste Gästezeile (Key, Fehler-Keys, Fokus-Handle). */
  const naechsteGastId = useRef(1);

  // Jedes Öffnen startet sauber: Tag und – sofern von der Ansicht gereicht –
  // vorbelegte Zeiten, keine alten Meldungen, keine Gästezeilen aus dem
  // vorherigen Vorgang; kein veralteter Fehler über einer neuen Buchung.
  // Ohne Vorbelegung (Raumkalender) bleiben die Zeitfelder leer wie bisher.
  useEffect(() => {
    if (open) {
      setDatum(kalenderDatum);
      setStart(startZeit);
      setEnde(endZeit);
      setUrheber("");
      setGaeste([]);
      setFeldFehler({});
      setSpeicherFehler(null);
    }
  }, [open, kalenderDatum, startZeit, endZeit]);

  /** Legt eine leere Gästezeile an und fokussiert deren Name-Feld (Konzept). */
  const gastHinzufuegen = () => {
    const id = naechsteGastId.current;
    naechsteGastId.current += 1;
    setGaeste((bisher) => [...bisher, { id, name: "", email: "" }]);
    // Der Fokus folgt unmittelbar auf den Klick („Gast hinzufügen fügt eine
    // Zeile … hinzu. Die neue Zeile erhält den Fokus auf das Name-Feld").
    requestAnimationFrame(() => {
      document.getElementById(`booking-guest-${id}-name`)?.focus();
    });
  };

  /** Entfernt genau diese Zeile samt ihrer etwaigen Feldfehler (ohne Bestätigung). */
  const gastEntfernen = (id: number) => {
    setGaeste((bisher) => bisher.filter((gast) => gast.id !== id));
    setFeldFehler((bisher) => {
      const rest = Object.entries(bisher).filter(
        ([key]) =>
          key !== `guest-${id}-name` && key !== `guest-${id}-email`
      );
      return Object.fromEntries(rest) as FeldFehler;
    });
  };

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
    // Gäste (Konzept „Validierung und Fehlerdarstellung"): Eine KOMPLETT
    // leere Zeile wird ignoriert statt als Fehler gewertet – nur halb- oder
    // falsch ausgefüllte Zeilen blockieren den Submit.
    for (const gast of gaeste) {
      const nameKey = `guest-${gast.id}-name` as const;
      const emailKey = `guest-${gast.id}-email` as const;
      const name = gast.name.trim();
      const email = gast.email.trim();
      const zeileVollstaendigLeer = name === "" && email === "";
      if (!zeileVollstaendigLeer && name === "") {
        fehler[nameKey] = "Bitte gib den Namen des Gastes an.";
      }
      if (!zeileVollstaendigLeer && email === "") {
        fehler[emailKey] = "Bitte gib die E-Mail-Adresse des Gastes an.";
      }
      // Lockeres Format wie im Konzept festgelegt: Ein Zeichen im E-Mail-Feld
      // muss nur ein „@" tragen, mehr nicht – Gäste haben keinen Account,
      // ein strenger Regex wäre unnötig und nervig.
      if (!zeileVollstaendigLeer && email !== "" && !email.includes("@")) {
        fehler[emailKey] = "Bitte gib eine gültige E-Mail-Adresse ein.";
      }
    }
    setFeldFehler(fehler);
    if (Object.keys(fehler).length > 0) return;

    // Ausgefüllte Gästezeilen gehen mit; eine komplett leere Zeile wird
    // verworfen (siehe Validierung oben), nicht als leerer Gast gesendet.
    const gesendeteGaeste = gaeste
      .map((gast) => ({ name: gast.name.trim(), email: gast.email.trim() }))
      .filter((gast) => gast.name !== "" || gast.email !== "");

    // ISO mit explizitem Z-Suffix: Der Server parst sonst in seiner lokalen
    // Zeitzone; „YYYY-MM-DD" + „HH:mm" ergeben so eindeutig UTC.
    setSpeichert(true);
    try {
      // Leerer Gästefall: Feld bewusst WEGGESSEN – die Buchung ohne Gäste
      // geht byte-identisch zum bisherigen Vertrag über die Leitung (Konzept
      // „API und Datenmodell": guests ist optional).
      const payload: Parameters<typeof createBooking>[0] = {
        roomId: raumId,
        startsAt: `${datum}T${start.slice(0, 5)}:00Z`,
        endsAt: `${datum}T${ende.slice(0, 5)}:00Z`,
        createdBy: urheber.trim(),
      };
      if (gesendeteGaeste.length > 0) payload.guests = gesendeteGaeste;
      await createBooking(payload);
      // Ab jetzt gilt diese Person der Ansicht als „angemeldet" (Naht
      // lib/currentUser bis zur SSO-Klärung): Nur so erkennt der Raumkalender
      // und die Tagesansicht die frische Buchung als eigene und zeigt ihren
      // Check-in-Button an. Idempotent, ohne Auswirkung auf den POST.
      setCurrentUser(urheber);
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
      {/* max-h + Scroll laut Konzept „Responsive-Verhalten": Der Dialog
          scrollt bei Bedarf selbst (z. B. viele Gästezeilen), statt den
          Inhalt abzuschneiden. */}
      <DialogContent
        data-testid="booking-dialog"
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
      >
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

          {/* Gäste ohne eigenen Account (Konzept „Gäste-Erfassung im
              BookingForm"): Sektion unterhalb des Urheber-Felds, Teil des
              fließenden space-y-4-Stacks. Kein Leerzustand mit Text – der
              „Gast hinzufügen"-Button ist der einzige Inhalt, solange keine
              Zeilen existieren („keine Gäste" ist der Normalfall). */}
          <section aria-label="Gäste (ohne Account)" className="space-y-2">
            <p className="text-sm font-medium">Gäste (ohne Account)</p>
            <p className="text-sm text-muted-foreground">
              Diese Personen erhalten keinen Login, werden aber in die Buchung
              aufgenommen.
            </p>
            {gaeste.map((gast) => {
              const nameFehler = feldFehler[`guest-${gast.id}-name`];
              const emailFehler = feldFehler[`guest-${gast.id}-email`];
              return (
                <div key={gast.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <label
                        htmlFor={`booking-guest-${gast.id}-name`}
                        className="sr-only"
                      >
                        Name des Gastes
                      </label>
                      <input
                        id={`booking-guest-${gast.id}-name`}
                        data-testid={`booking-guest-${gast.id}-name`}
                        type="text"
                        value={gast.name}
                        onChange={(e) =>
                          setGaeste((bisher) =>
                            bisher.map((zeile) =>
                              zeile.id === gast.id
                                ? { ...zeile, name: e.target.value }
                                : zeile
                            )
                          )
                        }
                        placeholder="Vorname Nachname"
                        className={inputClass}
                        aria-invalid={nameFehler !== undefined}
                        aria-describedby={
                          nameFehler !== undefined
                            ? `booking-guest-${gast.id}-name-error`
                            : undefined
                        }
                      />
                      {nameFehler !== undefined && (
                        <p
                          id={`booking-guest-${gast.id}-name-error`}
                          data-testid={`booking-guest-${gast.id}-name-error`}
                          className="text-xs text-destructive"
                        >
                          {nameFehler}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor={`booking-guest-${gast.id}-email`}
                        className="sr-only"
                      >
                        E-Mail des Gastes
                      </label>
                      <input
                        id={`booking-guest-${gast.id}-email`}
                        data-testid={`booking-guest-${gast.id}-email`}
                        type="text"
                        value={gast.email}
                        onChange={(e) =>
                          setGaeste((bisher) =>
                            bisher.map((zeile) =>
                              zeile.id === gast.id
                                ? { ...zeile, email: e.target.value }
                                : zeile
                            )
                          )
                        }
                        placeholder="gast@example.com"
                        className={inputClass}
                        aria-invalid={emailFehler !== undefined}
                        aria-describedby={
                          emailFehler !== undefined
                            ? `booking-guest-${gast.id}-email-error`
                            : undefined
                        }
                      />
                      {emailFehler !== undefined && (
                        <p
                          id={`booking-guest-${gast.id}-email-error`}
                          data-testid={`booking-guest-${gast.id}-email-error`}
                          className="text-xs text-destructive"
                        >
                          {emailFehler}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Papierkorb am rechten Rand; Touch-Ziele mindestens h-11
                      auf schmalen Breiten (Konzept „Responsive-Verhalten"). */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => gastEntfernen(gast.id)}
                    aria-label="Gast entfernen"
                    data-testid={`booking-guest-remove-${gast.id}`}
                    className="mt-0.5 h-11 w-11 shrink-0 sm:h-10 sm:w-10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={gastHinzufuegen}
              data-testid="booking-guest-add"
              className="h-11 sm:h-9"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Gast hinzufügen
            </Button>
          </section>

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
