import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import BookingStatusBadge, {
  BOOKING_STATUSES,
} from "../src/components/BookingStatusBadge";

/**
 * BookingStatusBadge: je bekanntem Buchungsstatus ein Rendering-Test, der
 * Anzeige-Label UND die variantenspezifischen Klassen des verbindlichen
 * Mappings prüft (Design-Konzept „Buchungsstatus-Badge"; Varianten aus dem
 * semantischen Inventar von ui/badge.tsx). Dazu der Fallback für unbekannte
 * Statuswerte: neutraler Muted-Badge (default-Variante) mit Rohtext statt Crash oder verschlucktem Wert.
 *
 * Reines jsdom-Rendering ohne Formular/Radix-Checkbox – deshalb ist hier
 * kein ResizeObserver-Stub nötig (siehe RoomList.test.tsx).
 */

/** Rendert das Badge und liefert es über sein sichtbares Label zurück. */
function getBadgeByText(text: string) {
  return screen.getByText(text);
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
});

describe("BookingStatusBadge – bekannte Statuswerte", () => {
  it("mappt „bestaetigt“ auf das Success-Badge mit Label „Bestätigt“", () => {
    render(<BookingStatusBadge status="bestaetigt" />);
    const badge = getBadgeByText("Bestätigt");
    expect(badge).toHaveClass("bg-success-background");
    expect(badge).toHaveClass("text-success");
  });

  it("mappt „ausstehend“ auf das Warning-Badge mit Label „Ausstehend“", () => {
    render(<BookingStatusBadge status="ausstehend" />);
    const badge = getBadgeByText("Ausstehend");
    expect(badge).toHaveClass("bg-warning-background");
    expect(badge).toHaveClass("text-warning");
  });

  it("mappt „genehmigt“ auf denselben Success-Stil wie „bestaetigt“", () => {
    render(<BookingStatusBadge status="genehmigt" />);
    const badge = getBadgeByText("Genehmigt");
    expect(badge).toHaveClass("bg-success-background");
    expect(badge).toHaveClass("text-success");
  });

  it("mappt „abgelehnt“ auf das Destructive-Badge mit Label „Abgelehnt“", () => {
    render(<BookingStatusBadge status="abgelehnt" />);
    const badge = getBadgeByText("Abgelehnt");
    expect(badge).toHaveClass("bg-destructive-background");
    expect(badge).toHaveClass("text-destructive");
  });

  it("mappt „eingecheckt“ auf das Primary-Badge mit Label „Eingecheckt“", () => {
    render(<BookingStatusBadge status="eingecheckt" />);
    const badge = getBadgeByText("Eingecheckt");
    expect(badge).toHaveClass("bg-primary");
    expect(badge).toHaveClass("text-primary-foreground");
  });

  it("mappt „nicht erschienen“ auf den neutralen Muted-Badge-Stil (default-Variante)", () => {
    render(<BookingStatusBadge status="nicht erschienen" />);
    const badge = getBadgeByText("Nicht erschienen");
    expect(badge).toHaveClass("border-border");
    expect(badge).toHaveClass("bg-muted");
    expect(badge).toHaveClass("text-foreground");
  });

  it("rendert jeden bekannten Status als shadcn-Badge mit Basis-Klassen und Label", () => {
    for (const status of BOOKING_STATUSES) {
      render(<BookingStatusBadge status={status} />);
    }
    expect(getBadgeByText("Bestätigt")).toHaveClass("inline-flex");
    expect(getBadgeByText("Ausstehend")).toHaveClass("rounded-md");
    expect(getBadgeByText("Genehmigt")).toHaveClass("px-2");
    expect(getBadgeByText("Abgelehnt")).toHaveClass("text-xs");
    expect(getBadgeByText("Eingecheckt")).toHaveClass("font-medium");
    expect(getBadgeByText("Nicht erschienen")).toBeInTheDocument();
  });
});

describe("BookingStatusBadge – unbekannter Statuswert", () => {
  it("zeigt einen unbekannten Status defensiv als neutralen Muted-Badge mit Rohtext", () => {
    render(<BookingStatusBadge status="zukuenftiger-status" />);
    const badge = getBadgeByText("zukuenftiger-status");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("border-border");
    expect(badge).toHaveClass("bg-muted");
    // Kein Success-/Warning-/Destructive-Stil: Der Fallback bleibt neutral,
    // damit er nicht als fachliche Wertung gelesen wird.
    expect(badge).not.toHaveClass("bg-success-background");
    expect(badge).not.toHaveClass("bg-warning-background");
    expect(badge).not.toHaveClass("bg-destructive-background");
  });
});
