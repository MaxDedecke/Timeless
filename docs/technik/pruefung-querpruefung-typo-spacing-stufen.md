# Querprüfung: Manuell gesetzte Typo-/Spacing-Stufen auf Konzept-Stufen zurückgeführt

Grep über `frontend/src/` auf `text-[`, `px-[`, `py-[`, `-[` (Arbitrary Values insgesamt), `font-semibold`, `font-bold` sowie ergänzend Inline-Styles (`style={`) und Tracking-Klassen. Maßstab: Typo-Skala und Spacing-Raster aus `docs/design-konzept.md`.

## Befund

- **Arbitrary Values:** In Seiten und eigenen Komponenten (`App.tsx`, `pages/`, `components/AmenityFilter.tsx`, `components/Sidebar.tsx`) gibt es keine – kein `text-[…]`/`px-[…]`/`py-[…]`, kein Inline-Style; Spacing ist durchgehend Tailwind-Skala.
- **Begründeter Restbefund in einer shadcn/ui-Basiskomponente:** `ui/alert.tsx` setzt im Lagerbestand des Primitives `[&>svg+div]:translate-y-[-3px]` (Icon-Ausrichtung). Wie bei den Typo-Stufen der Basiskomponenten (Präzedenz Commit 579eb15) greift die Normalisierung nicht in shadcn/ui-Primitive ein; angepasst werden nur Stufen in der Anwendungsschicht. Die übrigen `data-[state=…]`-Vorkommen in `ui/checkbox.tsx` und `ui/sheet.tsx` sind Tailwind-Variant-Selektoren, keine Pixelwerte.
- **Drei Abweichungen gefunden und normalisiert:**

| Stelle | Vorher | Nachher | Begründung |
|---|---|---|---|
| `Sidebar.tsx` – Produktname Desktop | `text-lg font-semibold tracking-tight` | `text-lg font-semibold` | `tracking-tight` gehört laut Skala ausschließlich zur Seitenüberschrift (`text-2xl …`) |
| `Sidebar.tsx` – Produktname Topbar mobil | `text-base font-semibold tracking-tight` | `text-lg font-semibold` | exakt das AmenityFilter-Fehlmuster; nächste Konzept-Stufe ist der Abschnitts-/Kartentitel |
| `RoomList.tsx` – Raumname in RoomCard | `text-lg font-semibold leading-tight tracking-tight` | `text-lg font-semibold` (Stufe kommt unverändert aus `ui/card`) | Karten-Titel-Stufe ist dokumentiert als `text-lg font-semibold`; manuelle Zusatz-Klassen entfernt |

- **Konforme Fundstellen (nicht geändert), je mit Skalenbezug:** Seitenüberschriften `text-2xl font-semibold tracking-tight` (`App.tsx`, `RoomList.tsx`, `RoomForm.tsx`) = Stufe „Seitenüberschrift"; CardTitle-Overrides `text-lg font-semibold` (`App.tsx`, vormals `RoomList.tsx`) = Stufe „Abschnitts-/Kartentitel"; Labels `text-sm font-medium` = Stufe „Formular-Labels"; Gruppenlabel Sidebar `text-xs uppercase tracking-wide` = dokumentiert; Empty-State-Texte `text-base` = Stufe „erklärende Texte/Empty States". Die shadcn/ui-Basiskomponenten (`ui/button`, `ui/card`, `ui/alert`, `ui/badge`, `ui/sheet`) behalten ihre Stufen – Präzedenz aus Commit 579eb15: Overrides setzt die Anwendung nicht mehr, die Basiskomponenten selbst sind nicht Teil dieser Normalisierung.

## Verifikation

### frontend
npm run lint: exit 0 (tsc --noEmit)
npm test: exit 0 — 32 Tests in 5 Dateien, **Testdateien unverändert** (Diff betrifft nur die zwei Komponentendateien)

### Browser-Check (check_in_browser gegen den Compose-Stack)
- `/rooms` Desktop: HTTP 200, Sidebar + Seitenkopf sichtbar, keine Konsolen-/JS-Fehler, keine fehlgeschlagenen Requests.
- `/rooms` mobil (Viewport mobile) inkl. Off-Canvas-Sidebar via Burger-Trigger: fehlerfrei.
- `/rooms/new`: Formular lädt mit Merkmals-Katalog, Client-Validierung greift korrekt (Feldfehler bei fehlendem Standort), kein JS-Fehler.
- Hinweis: Der Stack wird je Browser-Aufruf frisch initialisiert (leere DB ohne Stammdaten), daher zeigt die Liste den Empty-State statt Karten; die Karten-Darstellung (inkl. geänderter CardTitle-Stufe) ist durch die 17 vitest-Tests zu RoomList abgedeckt.
