# Design-Konzept

Projekt **Timeless** – Raumbuchungssystem der DesignFreak GmbH. Dieses Dokument legt das visuelle und interaktive Erscheinungsbild fest und ist die Referenz für jedes Frontend-Ticket. Technischer Rahmen: React + TypeScript (Vite) in `frontend/`, Tailwind CSS und shadcn/ui, dauerhafte Sidebar-Navigation. Oberflächensprache ist Deutsch.

## Look & Feel

Die Anwendung ist ein internes Arbeitswerkzeug für drei Zielgruppen – Mitarbeitende, die in wenigen Klicks einen passenden Raum buchen wollen, Facility-Manager, die Räume und Auslastung im Blick behalten, und Admins. Sie soll sich ruhig, präzise und schnell anfühlen: viel Weißraum, klare Hierarchie, Datendichte nur dort, wo sie hilft (Kalender, Tagesansicht, Berichte). Der Name „Timeless" zieht sich als Motiv durch – Zeit und Räume sind die Helden, deshalb arbeiten Kalender- und Zeitangaben mit tabellarischen Ziffern und einer festen Zeitraster-Optik. Die Ansprache in der UI ist per „Du", knapp und sachlich-freundlich („Raum buchen", „Nicht mehr verfügbar"), ohne Marketingsprech.

## Farbpalette

Alle Farben werden zentral als shadcn/ui-CSS-Variablen in `frontend/src/index.css` definiert und ausschließlich über semantische Tailwind-Klassen verwendet (`bg-primary`, `text-muted-foreground`, …). Rohe Hex-Werte verstreut in Komponenten gibt es nicht.

**Primär – „Petrol"** (Interaktion, aktive Navigation, primäre Buttons, belegte Kalenderslots):

| Token | Wert | Verwendung |
|---|---|---|
| `--primary` | `hsl(193 78% 26%)` ≈ `#156076` | Buttons, Links, aktiver Nav-Punkt, Belegung |
| `--primary-hover` | `hsl(193 78% 21%)` | Hover/Zustand gedrückt |
| `--primary-tint` | `hsl(190 60% 95%)` | dezente Flächen, ausgewählte Slots |

**Sekundär – „Terrakotta"** (Akzent, sparsam: Hervorhebung des eigenen Buchungsslots, Warnhinweis-Betonung, Chart-Differenzierung):

| Token | Wert | Verwendung |
|---|---|---|
| `--accent` | `hsl(16 70% 52%)` ≈ `#d95f33` | eigene Buchungen im Kalender, Akzentdetails |
| `--accent-tint` | `hsl(16 80% 95%)` | Hintergrundflächen dazu |

**Neutral – kühl, leicht blau getönt:**

| Token | Wert |
|---|---|
| `--background` | `hsl(210 25% 97%)` |
| `--card` / `--foreground` | `hsl(0 0% 100%)` / `hsl(213 30% 14%)` |
| `--border` / `--input` | `hsl(210 15% 89%)` / `hsl(210 15% 85%)` |
| `--muted` / `--muted-foreground` | `hsl(210 20% 95%)` / `hsl(211 12% 43%)` |

**Statusfarben** (jeweils mit heller Hintergrundvariante für Badges/Alerts):

| Token | Vordergrund | Hintergrund |
|---|---|---|
| Success | `hsl(150 62% 30%)` | `hsl(150 55% 94%)` |
| Warning | `hsl(35 92% 40%)` | `hsl(43 96% 93%)` |
| Destructive | `hsl(0 66% 47%)` | `hsl(0 82% 96%)` |
| Info | `hsl(210 85% 42%)` | `hsl(210 85% 95%)` |

**Fachliches Status-Mapping** (verbindlich für Badges und Kalenderlegenden): bestätigt/genehmigt → Success · ausstehend → Warning · abgelehnt/storniert → Destructive bzw. Muted-durchgestrichen · eingecheckt → Primary. Freie Zeitfenster im Kalender: `--background` mit `--border`, belegte: Primary-Töne, eigene Buchungen: Accent-Rand.

## Typografie

**Schriftfamilie:** Inter (Variable, self-hosted über `@fontsource/inter`, kein Google-CDN zur Laufzeit), Fallback `system-ui`. Für Code-artige Inhalte (iCal-Abo-URL, technische IDs): `ui-monospace`/JetBrains Mono.

**Skala** (ausschließlich Tailwind-Stufen, feste Verwendungszwecke):

| Stufe | Verwendung |
|---|---|
| `text-2xl font-semibold tracking-tight` | Seitenüberschrift im Seitenkopf |
| `text-lg font-semibold` | Abschnitts-/Kartentitel (z. B. Raumname) |
| `text-sm font-medium` | Formular-Labels, Tabellenzellen, UI-Basis |
| `text-sm` | Fließtext in der UI (Standardgröße 14 px wegen Datendichte) |
| `text-base` | erklärende Texte, Empty States |
| `text-xs uppercase tracking-wide` | Tabellenköpfe, Meta-Infos, Gruppenlabels in der Sidebar |
| `text-xs` | Badges, Zeitstempel, Hilfetexte |

Gewichte: 400 (Text), 500 (Labels/Betonung), 600 (Buttons, Titel), 700 nur für die Seitenüberschrift bei starker Hierarchie. **Pflicht:** `tabular-nums` für alle Uhrzeiten, Daten und Zahlen in Kalender, Tagesansicht und Berichten – sonst springen die Ziffern im Zeitraster.

## Spacing & Layout-Raster

Ausschließlich Tailwinds Spacing-Skala (4-px-Basis), keine freien Pixelwerte.

- **App-Shell:** Sidebar links (`w-64`), Inhalt daneben flexibel mit `px-4 md:px-6 lg:px-8`; Inhaltsbereich `max-w-7xl` zentriert.
- **Seitenkopf:** jede Seite hat einen einheitlichen Kopf – Titel links (`text-2xl`), Primäraktion rechts (z. B. „Raum buchen"), darunter `mb-6` Abstand zum Inhalt.
- **Cards:** `rounded-lg border shadow-sm`, Innenabstand `p-4` (kompakt, Listen) bzw. `p-6` (Formulare).
- **Formulare:** einspaltig, `space-y-4`; zusammengehörige Felder (Datum + Start + Ende) in `grid grid-cols-1 sm:grid-cols-3 gap-3`.
- **Tabellen:** Zeilenhöhe `h-12`, `divide-y`, Kopfzeile `text-xs uppercase text-muted-foreground`.
- **Kalender/Tagesansicht:** feste Stundenhöhe `h-12` (48 px) pro Stunde, 15-Minuten-Raster für Slot-Positionierung; Zeitachse sticky.
- **Vertikalrhythmus:** Sektionen trennen mit `mt-8`, innerhalb von Sektionen `gap-4`.

## Navigation

Die Sidebar ist die Hauptnavigation – dauerhaft vorhanden, auch wenn einzelne Rollen zunächst wenige Punkte sehen.

**Aufbau (links, `w-64`, dunkler Neutral-Hintergrund `hsl(213 30% 14%)` mit hellem Text):**

- Kopf: Produktname „Timeless" mit kleinem Uhr-/Raum-Logo.
- Gruppe **Buchen**: „Räume" (Liste + Filter, Landeseite nach Login), „Tagesansicht", „Meine Buchungen" (inkl. Check-in und Status eigener Anfragen).
- Gruppe **Verwalten** (nur Facility-Manager und Admin): „Genehmigungen", „Raumverwaltung", „Auslastungsberichte".
- Gruppe **Administration** (nur Admin): „Nutzer & Rollen", „Einstellungen" (u. a. No-Show-Frist).
- Fuß: angemeldete Person mit Namenskürzel-Avatar und Rollen-Badge, darunter „Abmelden".

Menüpunkte, deren Funktionen die Rolle nicht darf, werden ausgeblendet (nicht nur deaktiviert) – das setzt die Sichtbarkeitsregeln aus den Anforderungen 15/16 um.

**Aktiver Punkt:** gefüllter Stil – `bg-primary text-primary-foreground rounded-md`, zusätzlich `aria-current="page"`; gilt auch für Unterseiten (Raumdetail markiert weiter „Räume"). Hover auf inaktiven Punkten: `bg-white/10`.

**Schmale Breiten (< `lg` / 1024 px):** Sidebar wird zum Off-Canvas-Panel (shadcn `Sheet` von links) mit Overlay, geschlossen per X, Overlay-Klick oder Esc; Trigger ist ein Burger-Button in einer schlanken Topbar (`h-14`) mit Produktnamen. Ab `lg` ist die Sidebar fixiert sichtbar, die Topbar entfällt.

## Kernkomponenten

Durchgängig genutzte shadcn/ui-Komponenten und ihr Einsatzzweck:

- **Button** – Varianten `default` (Primary-Aktion, max. eine pro Sicht), `outline`, `ghost`, `destructive`; Größe `sm` in Tabellenzeilen, `icon` für Symbolaktionen.
- **Card** – Raumkarte in der Liste, Statistik-Kacheln im Bericht, Empty States.
- **Dialog** – Buchungsformular, Raum anlegen/bearbeiten, Bestätigungsfragen (insbesondere Serienbearbeitung: „Nur dieser Termin" vs. „Gesamte Serie").
- **Table** – Tagesansicht, Berichte, Nutzerverwaltung, Genehmigungsliste.
- **Form** mit Input, Textarea, Select, Checkbox, Switch – alle Eingaben; Switch für Genehmigungspflicht je Raum und Einstellungen.
- **Popover + Calendar** – Datumswahl im Buchungsformular und bei Filtern.
- **Badge** – Buchungsstatus (Success/Warning/Destructive-Mapping oben), Ausstattungsmerkmale (neutral), Rollen.
- **Alert** – blockierende Fehler inline (z. B. Doppelbuchungskonflikt), Hinweise.
- **Toast (Sonner)** – transiente Erfolge („Buchung gespeichert"), nie für Fehler, die der Nutzer adressieren muss.
- **Skeleton** – Ladezustände in der Layoutform der Zielsicht.
- **Sheet** – mobile Sidebar, mobiler Filter-Panel.
- **DropdownMenu** – Zeilenaktionen in Tabellen (Bearbeiten, Löschen, .ics erneut senden).
- **Tabs** – Raumdetail („Kalender" / „Details"), Berichtsfilter.
- **Progress** – Auslastungsbalken im Bericht.
- **Avatar, Separator, Tooltip, ScrollArea** – ergänzend nach Bedarf.

Eigene Komponenten nur als Kombination dieser Bausteine (z. B. `EmptyState` auf Card-Basis, `BookingSlot` für Kalendereinträge) – keine parallel gebauten UI-Primitive.

## Zustände

Jede Ansicht mit Daten definiert alle drei Zustände explizit – der Erfolgsfall allein reicht nicht:

- **Lädt:** Skeleton in der Layoutform der Zielsicht (Raumliste: 6 Karten-Skeletons; Tabellen: 5 Zeilen-Skeletons; Kalender: graues Zeitgitter). Keine freischwebenden Spinner. Beim Speichern: Submit-Button `disabled` mit Inline-Spinner, Dialog bleibt offen.
- **Leer:** zentrierte `EmptyState`-Card mit Icon, einem kurzen deutschen Satz und einer Handlung – z. B. Raumliste ohne Treffer: „Keine Räume entsprechen deinem Filter." + Button „Filter zurücksetzen"; „Meine Buchungen" ohne Einträge: „Du hast noch keine Buchungen." + „Jetzt Raum buchen"; Tagesansicht ohne Termine: dezentes Hinweisband über dem Zeitgitter, Gitter bleibt sichtbar (freie Fenster sind hier fachlich korrekt, kein Fehlerzustand).
- **Fehler:** blockierende Fehler inline als `Alert` (destructive) mit verständlicher Meldung und, wo sinnvoll, „Erneut versuchen" – z. B. Konfliktprüfung (Anforderung 8) meldet im Buchungsdialog den kollidierenden Zeitraum konkret („Dieser Raum ist bereits von 14:00 bis 15:30 gebucht."). Feldvalidierungsfehler stehen klein und rot unter dem jeweiligen Feld. Globale API-Ausfälle erscheinen zusätzlich als Banner über dem Seiteninhalt. Toasts tragen nur Erfolge.

Die folgenden drei Abschnitte heben die mit Sprint 2 umgesetzten Muster (Referenz-Umsetzung: `frontend/src/pages/RoomList.tsx`, `frontend/src/pages/RoomForm.tsx`) von der allgemeinen Beschreibung oben auf verbindliche Bausteine: Jede neue datengetriebene Ansicht baut sie so nach, statt eigene Varianten zu erfinden.

## Ladezustand

Während Daten geladen werden, zeigt die Ansicht shadcn/ui-**Skeleton**-Flächen in der Layoutform der Zielsicht – nie freischwebende Spinner:

- **Listen/Raster** (`RoomList.tsx`, `RoomsSkeleton`): Raster aus sechs Card-Skeletons im Listenraster (`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`); je Karte zwei Kopfzeilen-Skelette (Titel `h-5`, Beschreibung `h-4`) und drei Badge-Skelette (`h-5 rounded-md`).
- **Formulare** (`RoomForm.tsx`, `FormSkeleton`): eine Card mit Skeletten für Titel/Beschreibung, je Feld Label- plus Input-Skelett (`h-10`) in derselben Spaltenaufteilung wie das echte Formular (dreispaltig ab `sm`), drei Checkbox-Paare für die Merkmale und ein rechtsbündiges Button-Skelett.
- **Teilbereiche** (`AmenityFilter.tsx`): Eine Sektion, die ihre Daten selbst nachlädt, zeigt ihr Skeleton inline innerhalb ihrer Card (vier Checkbox-Paar-Skelette) und blockiert nicht die ganze Seite.
- Der Ladepfad ist mit `aria-busy="true"` markiert. Ein erneutes Laden (nach Fehler oder Nutzeraktion) zeigt dasselbe Skeleton erneut, statt den alten Inhalt einzufrieren.

Buchungsformular, Raumkalender und Tagesansicht übernehmen dieses Muster unverändert – Skeleton in der Layoutform der jeweiligen Zielsicht – statt eigene Ladeindikatoren zu erfinden.

## Fehleranzeige

Zwei getrennte Fälle, beide über shadcn/ui-**Alert** mit `variant="destructive"`:

- **Ladefehler einer Ansicht** (`RoomList.tsx`, `RoomsError`): `AlertCircle`-Icon (`h-4 w-4`), knapper `AlertTitle` („Räume konnten nicht geladen werden"), verständlicher `AlertDescription` und darin ein „Erneut versuchen"-Button (`variant="destructive" size="sm"`, `RotateCw`-Icon), der denselben Ladevorgang neu anstößt und die Ansicht zuvor in den Ladezustand (Skeleton) zurücksetzt. Bleibt die Ansicht unbenutzbar, kommt ein Ausweg als zweiter Button hinzu („Zurück zur Raumliste", `variant="outline"`, wie im Formular-Ladefehler von `RoomForm.tsx`). Sekundäre Ladequellen (z. B. Filter-Katalog in `AmenityFilter.tsx`) melden ihren Fehler dezenter inline in der eigenen Card – Meldungstext plus `outline`-„Erneut versuchen" – statt die ganze Seite zu blockieren.
- **Speicherfehler im Formular** (`RoomForm.tsx`): Während des Absendens ist der Submit-Button deaktiviert (`disabled={saving}`) und zeigt einen Inline-Spinner (`h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent`, `aria-hidden`) vor dem Label – damit ist kein Doppel-Submit möglich. Schlägt das Speichern fehl, erscheint oberhalb der Buttonzeile ein destructives Alert („Speichern fehlgeschlagen" + konkrete Meldung); das Formular bleibt offen und alle Eingaben bleiben erhalten. Der Alert wird mit dem nächsten Submit sofort entfernt (`setSaveError(null)` am Anfang des Handlers, auch wenn die Client-Validierung anschließend abbricht) – kein veralteter Fehler über einer neuen Eingabe.

Feldvalidierungsfehler sind kein Alert-Fall: Sie stehen klein und rot (`text-xs text-destructive`) unter dem jeweiligen Feld (siehe „Zustände"). Buchungsformular, Raumkalender und Tagesansicht übernehmen beide Fälle unverändert statt eigene Varianten zu erfinden.

## Leerzustand

„Noch nichts angelegt" und „Filter liefert keinen Treffer" sind zwei Zustände mit eigenem Text und eigener Aktion (beide in `RoomList.tsx`). Gemeinsame Form: zentrierte shadcn/ui-**Card** (`px-6 py-14 text-center`) mit lucide-Icon (`h-8 w-8 text-muted-foreground`, `aria-hidden`), Kernaussage in `text-base font-medium`, Erläuterung in `text-sm text-muted-foreground`, Aktionen darunter:

- **Noch nichts angelegt** (`RoomsEmpty`, Icon `Inbox`): benennt den Ist-Zustand („Noch keine Räume angelegt.") und führt weiter mit dem Anlegen-CTA als echtem Router-Link im Button-Look (`asChild`, „Raum anlegen") plus sekundärer „Liste neu laden"-Aktion (`variant="outline"`).
- **Filter ohne Treffer** (`NoMatchesEmpty`, Icon `SearchX`): Es existieren Räume, aber keiner erfüllt die gewählte Merkmalskombination – die Aktion ist daher ausschließlich „Filter zurücksetzen" (`variant="outline"`), nicht das Anlegen eines Raums.

Beide Varianten kombinieren Card und Button aus dem shadcn-Bestand, ohne eigene UI-Primitive. Wo Leere fachlich korrekt ist (Tagesansicht ohne Termine: freie Fenster sind Ergebnis, kein Fehler), gilt das Hinweisband-Muster aus „Zustände", kein Empty State über dem Gitter. Buchungsformular, Raumkalender und Tagesansicht übernehmen diese Trennung unverändert statt eigene Varianten zu erfinden.

## Responsive-Verhalten

Mobile-first; maßgebliche Schwellen: `sm` 640, `md` 768, `lg` 1024 (Sidebar-Schwelle), `xl` 1280.

- **Sidebar:** < `lg` Off-Canvas (siehe Navigation), ≥ `lg` fixiert.
- **Raumliste:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Tagesansicht:** ≥ `md` Zeitleiste je Raum nebeneinander (horizontal scrollbar bei vielen Räumen, Raumspalte sticky); < `md` automatisch gestapelte Kartenliste – ein Raum-Card mit kompakter Terminliste statt Zeitgitter, kein erzwungenes Horizontalscrollen.
- **Tabellen:** ≥ `md` vollständige Tabelle; < `md` Kartenstapel mit den wichtigsten Feldern, restliche Details über Dialog (DropdownMenu-Aktionen bleiben erreichbar).
- **Filter:** Desktop inline über der Liste; mobil hinter „Filter"-Button in einem `Sheet`.
- **Touch-Ziele:** auf kleinen Breiten Buttons/Zeilenaktionen mindestens `h-11` (~44 px).
- **Formulare:** einspaltig auf Mobil, ab `sm` gruppierte Felder nebeneinander (Datum/Start/Ende), Buttons unten rechtsbündig, Primäraktion zuletzt.
