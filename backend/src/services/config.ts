/**
 * System-Konfiguration (Anforderung 1: No-Show-Frist).
 *
 * Bereitgestellt als schreibgeschützte GET-Route /api/config – die Werte
 * werden per Umgebungsvariable überschreibbar, mit einem Sinn-Vorgabe für
 * lokale Entwicklung. Die Sidebar-„Einstellungen" ist später der Ort, um diese
 * dauerhaft zu ändern; bis dahin gelten die Defaults / Env-Werte.
 *
 * Derzeit ein einziger Wert:
 * - noShowAfterMinutes: Minuten nach Beginn, die ein Check-in noch möglich
 *   ist, bevor die No-Show-Freigabe greift. Standard 15 (gemäß Konzept).
 *
 * Dieser Service ist die zentrale Stelle für die Konfiguration (aus der
 * Route extrahiert), damit andere Services wie bookings.ts denselben Wert
 * lesen können – ohne eine zirkuläre Abhängigkeit Route→Service zu erzeugen.
 */

/**
 * Liest eine ganze Zahl aus der Umgebung, mit Fallback auf den Default.
 * Nicht-numerische oder fehlende Werte fallen auf den Default zurück – das
 * Backend darf nicht wegen einer fehlerhaften Env-Variable nicht starten.
 */
function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;
  return value;
}

const NO_SHOW_AFTER_MINUTES_DEFAULT = 15;

/** Aktuelle System-Konfiguration – für das Frontend (Check-in-Fenster) und Services. */
export interface SystemConfig {
  /** No-Show-Frist in Minuten; Check-in-Fenster ist [Beginn, Beginn+X). */
  noShowAfterMinutes: number;
}

/**
 * Liefert die System-Konfiguration als API-Objekt.
 *
 * Die Werte sind env-überschreibbar (NO_SHOW_AFTER_MINUTES) – das Backend
 * liest sie bei jedem Request neu, damit Änderungen ohne Neustart wirksam
 * werden (lokal per Env, später über die Einstellungen-Sidebar).
 */
export function getConfig(): SystemConfig {
  return {
    noShowAfterMinutes: envInt(
      "NO_SHOW_AFTER_MINUTES",
      NO_SHOW_AFTER_MINUTES_DEFAULT
    ),
  };
}
