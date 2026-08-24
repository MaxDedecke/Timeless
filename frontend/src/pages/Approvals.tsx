import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Check,
  RotateCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { ApiError } from "../api/http";
import {
  decideBooking,
  listApprovals,
  type ApprovalBooking,
} from "../api/bookings";
import BookingStatusBadge from "../components/BookingStatusBadge";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import { formatDate, formatTime } from "../lib/format";

/**
 * Genehmigungsworkflow (/approvals, Anforderung 10 – Konzept „Genehmigungs-
 * workflow"): Offene Genehmigungsanfragen in einer Tabelle, mit je einer
 * BookingStatusBadge und Aktionsbuttons (Genehmigen / Ablehnen). Jede
 * Aktion oeffnet per shadcn/Dialog einen Bestaetigungsdialog mit Warnsymbol;
 * nach Entscheidung laedt die Seite die Liste neu, damit die entsprechende
 * Buchung aus den offenen Anfragen verschwindet.
 *
 * Die Statusanzeige fuer den Antragsteller (ausstehend/genehmigt/abgelehnt)
 * wird ueber BookingStatusBadge gerendert – im Genehmigungsworkflow sind
 * ausstehende Anfragen die einzigen Anzeige-Elemente (genehmigt/abgelehnt
 * tauchen dort in „Meine Buchungen" auf). Alle Fetches laufen relativ ueber
 * /api (Reverse-Proxy, kein Servicename im Browser-Code), Zeiten formatiert
 * ausschliesslich lib/format.
 *
 * Zustände laut Konzept: Skeleton in Tabellenform beim Laden (5 Zeilen,
 * h-12 pro Zeile), EmptyState „keine offenen Anfragen" mit ShieldCheck-Icon
 * und Link zur Raumliste, destructives Alert bei Ladefehlern mit „Erneut
 * versuchen". Auf schmalen Breiten (< md) stapelt die Tabelle zu Cards –
 * je eine Card pro Anfrage mit DropdownMenu fuer die Aktionsbuttons.
 */

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; meldung: string }
  | { phase: "ready"; antraege: ApprovalBooking[] };

/** Skeleton in der Layoutform der Tabelle – 5 Zeilen-Skeletons (h-12 pro Zeile). */
function ApprovalsSkeleton() {
  return (
    <div
      data-testid="approvals-loading"
      aria-busy="true"
      className="border-x border-border"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          data-testid={`approvals-skeleton-row-${i}`}
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="ml-auto h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Leerzustand: keine offenen Genehmigungsanfragen. */
function ApprovalsEmpty() {
  return (
    <Card
      data-testid="approvals-empty"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-base font-medium text-card-foreground">
        Keine offenen Genehmigungsanfragen.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Alle Anfragen sind aktuell bearbeitet.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-5">
        <Link to="/rooms">Zurück zur Raumliste</Link>
      </Button>
    </Card>
  );
}

/** Ladefehler: destructives Alert mit Retry-Button. */
function ApprovalsError({ meldung, onRetry }: { meldung: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" data-testid="approvals-error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Anfragen konnten nicht geladen werden</AlertTitle>
      <AlertDescription>
        {meldung}
        <div className="mt-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRetry}
            data-testid="approvals-retry"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: "approve" | "reject";
  onConfirm: () => void;
  confirmLabel: string;
  confirmVariant: "default" | "destructive";
}

/**
 * Bestätigungsdialog fuer die Entscheid-Aktion (Genehmigen / Ablehnen):
 * shadcn/Dialog mit Warnsymbol (AlertCircle fuer Genehmigen, XCircle fuer
 * Ablehnen) und primaeren/sekundaeren Schaltflächen. Das Dialog bleibt
 * solange offen, bis der Nutzer bestätigt oder abbricht.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  onConfirm,
  confirmLabel,
  confirmVariant,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="approval-confirm-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon === "approve" ? (
              <AlertCircle className="h-5 w-5 text-warning" aria-hidden="true" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="approval-confirm-cancel"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            data-testid="approval-confirm-action"
          >
            {icon === "approve" ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ApprovalRowProps {
  antrag: ApprovalBooking;
  onDecide: (id: number, status: "approved" | "rejected") => void;
  decidingId: number | null;
}

/**
 * Desktop-Tabellenzeile: Spalten Raum, Standort, Datum, Zeitraum,
 * Antragsteller, Status (BookingStatusBadge) mit Aktionsbuttons.
 */
function ApprovalRow({ antrag, onDecide, decidingId }: ApprovalRowProps) {
  const isDeciding = decidingId === antrag.id;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject">("approve");

  const openConfirm = (action: "approve" | "reject") => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    onDecide(antrag.id, confirmAction === "approve" ? "approved" : "rejected");
  };

  return (
    <>
      <tr data-testid={`approval-row-${antrag.id}`}>
        <td className="py-3 text-sm font-medium">{antrag.room?.name ?? "-"}</td>
        <td className="py-3 text-sm text-muted-foreground">
          {antrag.location?.name ?? "-"}
        </td>
        <td className="py-3 text-sm tabular-nums">
          {formatDate(antrag.startsAt)}
        </td>
        <td className="py-3 text-sm tabular-nums">
          {formatTime(antrag.startsAt)} – {formatTime(antrag.endsAt)}
        </td>
        <td className="py-3 text-sm">{antrag.createdBy}</td>
        <td className="py-3">
          <BookingStatusBadge status={antrag.status} />
        </td>
        <td className="py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              disabled={isDeciding}
              onClick={() => openConfirm("approve")}
              data-testid={`approval-approve-${antrag.id}`}
            >
              {isDeciding ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Genehmigen
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isDeciding}
              onClick={() => openConfirm("reject")}
              data-testid={`approval-reject-${antrag.id}`}
            >
              {isDeciding ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden="true" />
              )}
              Ablehnen
            </Button>
          </div>
        </td>
      </tr>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          confirmAction === "approve"
            ? "Anfrage genehmigen?"
            : "Anfrage ablehnen?"
        }
        description={
          confirmAction === "approve"
            ? "Möchtest du diese Anfrage wirklich genehmigen? Der Raum wird für den gewünschten Zeitraum verbindlich belegt."
            : "Möchtest du diese Anfrage wirklich ablehnen? Der angeforderte Zeitraum wird freigegeben."
        }
        icon={confirmAction}
        onConfirm={handleConfirm}
        confirmLabel={confirmAction === "approve" ? "Genehmigen" : "Ablehnen"}
        confirmVariant={confirmAction === "approve" ? "default" : "destructive"}
      />
    </>
  );
}

/**
 * Mobile Karten-Ansicht fuer die Tabelle auf schmalen Breiten (< md):
 * jeweils eine Card pro Anfrage mit den wichtigsten Feldern und
 * DropdownMenu fuer die Aktionsbuttons.
 */
function ApprovalCard({ antrag, onDecide, decidingId }: ApprovalRowProps) {
  const isDeciding = decidingId === antrag.id;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject">("approve");

  const openConfirm = (action: "approve" | "reject") => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    onDecide(antrag.id, confirmAction === "approve" ? "approved" : "rejected");
  };

  return (
    <Card data-testid={`approval-card-${antrag.id}`} className="mb-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">{antrag.room?.name ?? "-"}</span>
          <BookingStatusBadge status={antrag.status} />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {antrag.location?.name ?? "-"} ·{" "}
          <span className="tabular-nums">
            {formatDate(antrag.startsAt)}
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-3 text-sm tabular-nums">
          {formatTime(antrag.startsAt)} – {formatTime(antrag.endsAt)}
        </div>
        <p className="mb-3 text-sm">
          Antragsteller: <span className="font-medium">{antrag.createdBy}</span>
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={isDeciding}
            onClick={() => openConfirm("approve")}
            data-testid={`approval-approve-${antrag.id}`}
          >
            {isDeciding ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Genehmigen
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={isDeciding}
            onClick={() => openConfirm("reject")}
            data-testid={`approval-reject-${antrag.id}`}
          >
            {isDeciding ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}
            Ablehnen
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          confirmAction === "approve"
            ? "Anfrage genehmigen?"
            : "Anfrage ablehnen?"
        }
        description={
          confirmAction === "approve"
            ? "Möchtest du diese Anfrage wirklich genehmigen? Der Raum wird für den gewünschten Zeitraum verbindlich belegt."
            : "Möchtest du diese Anfrage wirklich ablehnen? Der angeforderte Zeitraum wird freigegeben."
        }
        icon={confirmAction}
        onConfirm={handleConfirm}
        confirmLabel={confirmAction === "approve" ? "Genehmigen" : "Ablehnen"}
        confirmVariant={confirmAction === "approve" ? "default" : "destructive"}
      />
    </Card>
  );
}

export default function Approvals() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [reloadTick, setReloadTick] = useState(0);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState({ phase: "loading" });
    try {
      const antraege = await listApprovals();
      if (signal?.aborted) return;
      setState(
        antraege.length === 0
          ? { phase: "ready", antraege: [] }
          : { phase: "ready", antraege }
      );
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const meldung =
        err instanceof ApiError
          ? err.message
          : "Der Server ist momentan nicht erreichbar oder meldet einen Fehler.";
      setState({ phase: "error", meldung });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadTick]);

  const retry = useCallback(() => {
    setReloadTick((t) => t + 1);
  }, []);

  const decide = useCallback(
    async (id: number, status: "approved" | "rejected") => {
      setDecidingId(id);
      try {
        await decideBooking(id, status);
        await load();
      } catch (err) {
        const meldung =
          err instanceof ApiError
            ? err.message
            : "Die Entscheidung konnte nicht gespeichert werden. Bitte versuche es erneut.";
        setState({ phase: "error", meldung });
      } finally {
        setDecidingId(null);
      }
    },
    [load]
  );

  return (
    <section aria-labelledby="approvals-heading" data-testid="approvals-page">
      {/* Seitenkopf: einheitliches Muster – Titel links, keine Primäraktion
          (die Aktionen liegen pro Zeile). */}
      <div className="mb-6">
        <h1
          id="approvals-heading"
          className="text-2xl font-semibold tracking-tight"
        >
          Genehmigungen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Offene Anfragen zur Genehmigung
        </p>
      </div>

      {state.phase === "loading" && <ApprovalsSkeleton />}
      {state.phase === "error" && (
        <ApprovalsError meldung={state.meldung} onRetry={retry} />
      )}
      {state.phase === "ready" && state.antraege.length === 0 && <ApprovalsEmpty />}
      {state.phase === "ready" && state.antraege.length > 0 && (
        <>
          {/* Desktop-Tabelle (>= md) */}
          <div className="hidden overflow-x-auto md:block" data-testid="approvals-table">
            <table className="w-full table-fixed border-x border-border text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="py-3 text-left font-medium">Raum</th>
                  <th className="py-3 text-left font-medium">Standort</th>
                  <th className="py-3 text-left font-medium">Datum</th>
                  <th className="py-3 text-left font-medium">Zeitraum</th>
                  <th className="py-3 text-left font-medium">Antragsteller</th>
                  <th className="py-3 text-left font-medium">Status</th>
                  <th className="py-3 text-right font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {state.antraege.map((antrag) => (
                  <ApprovalRow
                    key={antrag.id}
                    antrag={antrag}
                    onDecide={decide}
                    decidingId={decidingId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Kartenstapel (< md) */}
          <div className="space-y-3 md:hidden" data-testid="approvals-cards">
            {state.antraege.map((antrag) => (
              <ApprovalCard
                key={antrag.id}
                antrag={antrag}
                onDecide={decide}
                decidingId={decidingId}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
