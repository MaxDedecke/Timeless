// Gemeinsamer Test-Setup für Vitest (jsdom): Registriert die
// @testing-library/jest-dom-Matchers (z. B. toHaveClass, toBeInTheDocument)
// für alle Test-Dateien, die sich auf die globale expect-Instanz verlassen.
import "@testing-library/jest-dom/vitest";
