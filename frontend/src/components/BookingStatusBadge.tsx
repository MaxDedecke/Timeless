import { Badge, type BadgeProps } from "./ui/badge";

/**
 * BookingStatusBadge: zeigt den Status einer Buchung als shadcn-Badge.
 *
 * Die Zuordnung Status → Badge-Variante ist im Design-Konzept
 * („Buchungsstatus-Badge") verbindlich festgelegt und deckt sich mit dem
 * fachlichen Status-Mapping des Konzepts (bestätigt/genehmigt → Success,
 * ausstehend → Warning, abgelehnt/storniert → Destructive). Die Varianten
 * selbst kommen aus dem semantischen Inventar in ui/badge.tsx – eigene
 * Farbwerte oder Ad-hoc-Styles gibt es hier nicht.
 *
 * Die Werte entsprechen der Datenbank: Migration 003 legt `status` als
 * freien TEXT ohne Umlaute an ('bestaetigt', Default), die Service-Schicht
 * vergibt 'ausstehend' | 'genehmigt' | 'abgelehnt' | 'nicht erschienen',
 * sobald Genehmigungsworkflow und No-Show-Logik umgesetzt sind.
 */

/** Alle fachlich bekannten Buchungsstatuswerte (Datenbank-Textwerte). */
export const BOOKING_STATUSES = [
  "bestaetigt",
  "ausstehend",
  "genehmigt",
  "abgelehnt",
  "eingecheckt",
  "nicht erschienen",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Deutsche Anzeige-Labels je Statuswert. */
const STATUS_LABELS: Record<BookingStatus, string> = {
  bestaetigt: "Bestätigt",
  ausstehend: "Ausstehend",
  genehmigt: "Genehmigt",
  abgelehnt: "Abgelehnt",
  eingecheckt: "Eingecheckt",
  "nicht erschienen": "Nicht erschienen",
};

/**
 * Verbindliche Zuordnung Status → Badge-Variante (Design-Konzept).
 * Vier visuell unterscheidbare Stile für die vier Kernfälle; genehmigte
 * Buchungen teilen sich den Bestätigt-Stil (Konzept: gleiche Farbe).
 */
const STATUS_VARIANTS: Record<BookingStatus, NonNullable<BadgeProps["variant"]>> = {
  bestaetigt: "success",
  ausstehend: "warning",
  genehmigt: "success",
  abgelehnt: "destructive",
  eingecheckt: "primary",
  // Kein eigener Stil: „nicht erschienen" bleibt als neutraler Muted-Badge
  // (default-Variante) lesbar, statt wie eine Ablehnung zu wirken. Eine
  // Outline-Variante gibt es im Inventar von ui/badge.tsx nicht.
  "nicht erschienen": "default",
};

interface BookingStatusBadgeProps {
  status: string;
}

export default function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const known = (BOOKING_STATUSES as readonly string[]).includes(status);
  return (
    <Badge variant={known ? STATUS_VARIANTS[status as BookingStatus] : "default"}>
      {known ? STATUS_LABELS[status as BookingStatus] : status}
    </Badge>
  );
}
