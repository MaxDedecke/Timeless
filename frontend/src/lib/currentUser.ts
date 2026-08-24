/**
 * Angemeldete Person – bis zur ausstehenden SSO-/Login-Klärung beim Kunden
 * (Blocker „SSO/Login-Verfahren“) wird der Urheber wie im Buchungsformular
 * als freier Text geführt. Diese kleine Naht kapselt das Lesen und Speichern,
 * damit der spätere Login genau diese eine Stelle ersetzt.
 *
 * Bewusst kein React-State: Die Ansichten lesen den Wert beim Rendern (und
 * damit nach jedem Neuladen frisch) – ein Wechsel in einem anderen Tab wirkt
 * so beim nächsten Refetch, ohne einen zusätzlichen Globalen Zustand zu
 * brauchen. Der Schlüssel ist mit dem Präfix „timeless.“ projektspezifisch.
 */

const STORAGE_KEY = "timeless.currentUser";

/**
 * Urheber der angemeldeten Person oder null, wenn nichts hinterlegt ist
 * (etwa im jsdom-Test oder bei erstmaliger Nutzung). Leerraum gilt als
 * „nicht gesetzt“.
 */
export function getCurrentUser(): string | null {
  try {
    const wert = window.localStorage.getItem(STORAGE_KEY);
    if (wert === null) return null;
    const getrimmt = wert.trim();
    return getrimmt === "" ? null : getrimmt;
  } catch {
    // localStorage kann (z. B. restriktive Browser-Einstellungen) werfen –
    // die Ansicht funktioniert dann ohne Check-in-Button weiter.
    return null;
  }
}

/** Hinterlegt den Urheber für diese Ansichts-Sitzung (idempotent). */
export function setCurrentUser(email: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, email.trim());
  } catch {
    // Wie im Lese-Pfad: ohne localStorage bleibt die Ansicht benutzbar.
  }
}
