import { NavLink } from "react-router-dom";
import { CalendarCheck, DoorOpen, LayoutDashboard, Menu, X } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./ui/button";

/**
 * Hauptnavigation des App-Shell (docs/design-konzept.md, Abschnitt Navigation):
 * ab lg fixiert sichtbar links (w-64, dunkler Neutral-Ton), darunter
 * Off-Canvas-Panel von links mit Overlay – geschlossen per X, Overlay-Klick
 * oder Esc. Der aktive Menüpunkt ist gefüllt hervorgehoben und trägt
 * aria-current="page"; Unterseiten markieren weiter ihren Bereich.
 */

interface MenuItem {
  to: string;
  label: string;
  icon: typeof DoorOpen;
  end?: boolean;
}

// Menüstand des ersten Sprints: nur Bereiche, die es fachlich schon gibt.
// Spätere Gruppen (Verwalten/Administration) kommen hier hinzu, ohne das
// Layout anzufassen.
const NAV_ITEMS: MenuItem[] = [
  { to: "/", label: "Übersicht", icon: LayoutDashboard },
  { to: "/rooms", label: "Räume", icon: DoorOpen, end: false },
];

interface NavItemProps {
  item: MenuItem;
  onNavigate?: () => void;
}

function NavItem({ item, onNavigate }: NavItemProps) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
        )
      }
      // NavLink setzt aria-current="page" selbst, wenn aktiv.
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {/* Kopf: Produktname mit Logo */}
      <div className="flex items-center gap-2 px-4 pb-6 pt-5">
        <CalendarCheck className="h-5 w-5 text-primary-tint" aria-hidden="true" />
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Timeless
        </span>
        <span className="sr-only">Raumbuchung der DesignFreak GmbH</span>
      </div>
      {/* Gruppenlabel in xs-uppercase laut Typo-Skala; weitere Gruppen folgen
          mit den Rollen-Bereichen im nächsten Ausbau. */}
      <nav aria-label="Hauptnavigation" className="flex flex-col gap-1 px-3">
        <p className="px-3 pb-1 pt-2 text-xs uppercase tracking-wide text-sidebar-foreground/50">
          Buchen
        </p>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  );
}

interface SidebarProps {
  /** Off-Canvas auf schmalen Breiten: offen? */
  mobileOpen: boolean;
  /** Öffnet das mobile Panel per Burger-Trigger. */
  onMobileOpen: () => void;
  /** Schließt das mobile Panel (X, Overlay-Klick, Esc oder Navigation). */
  onMobileClose: () => void;
}

export default function Sidebar({
  mobileOpen,
  onMobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {/* Desktop: fixierte Seitenleiste ab lg */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/20 bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobil (< lg): Burger-Trigger in schlanker Topbar … */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-sidebar px-4 text-sidebar-foreground lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
          aria-label="Navigation öffnen"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          data-testid="sidebar-trigger"
          onClick={onMobileOpen}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <span className="text-base font-semibold tracking-tight">Timeless</span>
      </div>

      {/* … und das Off-Canvas-Panel von links (Sheet = Radix Dialog). */}
      {mobileOpen && (
        <div
          id="mobile-navigation"
          data-testid="mobile-sidebar"
          className="fixed inset-0 z-40 lg:hidden"
        >
          {/* Overlay: Klick schließt */}
          <div
            className="absolute inset-0 bg-foreground/50"
            aria-hidden="true"
            onClick={onMobileClose}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground shadow-lg"
          >
            <div className="flex items-start justify-between pr-2">
              <div className="min-w-0">
                <SidebarContent onNavigate={onMobileClose} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
                aria-label="Navigation schließen"
                onClick={onMobileClose}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
