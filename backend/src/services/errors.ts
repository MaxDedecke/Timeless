/**
 * Fachfehler der Services-Schicht – die Router übersetzen sie in Statuscodes:
 * ValidationError -> 400, ConflictError -> 409, DomainNotFoundError -> 404.
 *
 * Eigene Datei, damit sich Services gegenseitig die Fehlerklasse importieren
 * können, ohne einen Import-Zirkel zu erzeugen (rooms <-> amenities).
 */

/** Fachliche Regel verletzt (HTTP 400). */
export class ValidationError extends Error {}

/** Konflikt mit bestehendem Zustand, z. B. Doppelbuchung (HTTP 409). */
export class ConflictError extends Error {}

/** Objekt nicht vorhanden (HTTP 404). */
export class DomainNotFoundError extends Error {}
