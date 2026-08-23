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

## Datum & Uhrzeit

Alle Zeitangaben in der Oberfläche laufen durch den gemeinsamen Formatierer `frontend/src/lib/format.ts` – Referenz-Umsetzung mit Tests in `frontend/test/format.test.ts`. Beide Helfer nehmen `Date` oder ISO-String aus der API entgegen und sind über fest gesetzte Locale `de-DE` und fixe `Intl.DateTimeFormat`-Optionen deterministisch, unabhängig von der Browser-Locale:

- **`formatTime(value)`** → „HH:mm" mit führenden Nullen: „09:05", „17:30", Mitternacht als „00:07" (nie „24:xx").
- **`formatDate(value)`** → kurzer Wochentag mit Komma plus DD.MM.YYYY: „So., 23.08.2026", „Fr., 21.08.2026".
- Fehlende oder nicht parsebare Eingabe (`null`, leerer String, Invalid Date) ergibt bei beiden den Platzhalter „–" statt eines Throws – eine einzelne kaputte Angabe soll keine Ansicht crashen.

**Verbindliche Regel:** Kalenderansicht, Buchungsformular und Tagesansicht formatieren Zeit und Datum ausschließlich über diese Helfer. Verteile `toLocaleTimeString`-, `toLocaleDateString`- oder `toLocaleString`-Aufrufe in Ansichten gibt es nicht; neue Ansichten importieren aus `lib/format`, statt eigene Formate einzuführen. Zusammen mit der `tabular-nums`-Pflicht oben gilt das auch für Zeitachsen, Slot-Beschriftungen und Badges in Kalender und Tagesansicht. Abweichende Formate (etwa ein ausgeschriebener Wochentag im Seitenkopf) gehören zuerst hier ins Konzept, dann in den Helfer – nicht als lokale Ausnahme in einer Komponente.

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
- Gruppe **Buchen**: „Räume" (Liste + Filter, Landeseite nach Login), „Freie Räume" (Suche nach Zeitraum und Ausstattung, Route `/free` – Details im Kapitel „Freie-Räume-Suche"), „Tagesansicht", „Meine Buchungen" (inkl. Check-in und Status eigener Anfragen).
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
- **Dialog** – Buchungsformular, kontextuelle Kurzaktionen (z. B. „Buchen“ aus der Freie-Räume-Suche), Bestätigungsfragen (insbesondere Serienbearbeitung: „Nur dieser Termin" vs. „Gesamte Serie"). Ob ein Formular als Dialog oder als eigene Route läuft, regelt „Formularmuster: Dialog vs. Route“.
- **Table** – Tagesansicht, Berichte, Nutzerverwaltung, Genehmigungsliste.
- **Form** mit Input, Textarea, Select, Checkbox, Switch – alle Eingaben; Switch für Genehmigungspflicht je Raum und Einstellungen.
- **Popover + Calendar** – Datumswahl im Buchungsformular und bei Filtern (bislang umgesetzt als natives `type="date"`-Feld, siehe Raumkalender; die Freie-Räume-Suche folgt derselben Praxis).
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

## Buchungsstatus-Badge

Der Status einer Buchung erscheint in jeder Ansicht als dasselbe Badge – Referenz-Umsetzung: `frontend/src/components/BookingStatusBadge.tsx`. Die Komponente mappt den Datenbank-Textwert (Migration 003: Kleinschreibung ohne Umlaute) auf eine feste Badge-Variante und ein deutsches Anzeige-Label; Raumkalender, Tagesansicht, „Meine Buchungen" und die Genehmigungsliste rendern sie direkt, statt Badge-Varianten lokal zu wählen oder Statuswerte roh anzuzeigen. Die Varianten stammen aus dem semantischen Inventar von `ui/badge.tsx` und setzen damit das Fachliche Status-Mapping aus „Farbpalette" um – der Ticketvorschlag (default/secondary/outline) war zum Zeitpunkt der Umsetzung bereits vom semantischen Inventar abgelöst (eine Outline-Variante existiert im Badge-Inventar nicht):

| Status (Datenbank) | Label | Badge-Variante |
|---|---|---|
| `bestaetigt`, `genehmigt` | Bestätigt / Genehmigt | `success` |
| `ausstehend` | Ausstehend | `warning` |
| `abgelehnt` | Abgelehnt | `destructive` |
| `eingecheckt` | Eingecheckt | `primary` |
| `nicht erschienen` | Nicht erschienen | `default` (neutraler Muted-Stil) |

Genehmigte Buchungen teilen sich bewusst den Bestätigt-Stil (Konzept: gleiche Farbe); „nicht erschienen" bleibt im neutralen Muted-Stil der default-Variante lesbar statt wie eine Ablehnung zu wirken. Ein unbekannter Statuswert wird nicht verschluckt: Er erscheint als Muted-Badge mit Rohtext, damit auffällt, dass die Zuordnung lückenhaft ist – ein neuer Statuswert bekommt zuerst hier eine Tabellenzeile und dann eine Zeile in der Komponente. Raumkalender und Tagesansicht übernehmen diese Zuordnung unverändert statt eigener Varianten.

## Check-in & No-Show

Adressaten dieses Kapitels sind die Umsetzungs-Tickets zu Anforderung 1 (Check-in für die laufende eigene Buchung) und Anforderung 2 (automatische Freigabe bei No-Show) sowie später „Meine Buchungen". Wer den Status wechselt, ist geklärt: Das Backend setzt `eingecheckt` beim Check-in und `nicht erschienen` beim Freigabe-Lauf (Beschluss vom 21.8.2026: Die Buchung bleibt als „nicht erschienen" erhalten, sie wird nicht gelöscht) – die Oberfläche erfindet keinen Zustand, sie rendert ihn. Referenz-Platzierung aller folgenden Regeln ist der Buchungsblock im gemeinsamen TimeGrid (`frontend/src/components/TimeGrid.tsx`); weil Raumkalender (`/rooms/:id`) und Tagesansicht (`/day`) dasselbe Raster speisen, gelten sie damit in beiden Ansichten automatisch und gleichartig.

**Badge-Zuordnung:** Sie steht bereits verbindlich in „Buchungsstatus-Badge" und ist in `BookingStatusBadge.tsx` samt Test umgesetzt; hier nur die Auslegung: `eingecheckt` → `primary` („Eingecheckt", aktiver positiver Endzustand), `nicht erschienen` → `default` (neutraler Muted-Stil, „Nicht erschienen"). „Nicht erschienen" ist ein Endzustand ohne Handlungsbedarf und darf nicht wie eine Ablehnung wirken – deshalb bewusst keine `destructive`-Zuordnung, obwohl der Termin ausgefallen ist. Neue Varianten werden dafür nicht eingeführt; das Inventar von `ui/badge.tsx` kennt ohnehin kein `secondary`/`outline`, und cva rendert unbekannte Variantenwerte still ohne Farbklassen.

**Check-in-Button:**

- **Platzierung:** Im Buchungsblock des laufenden eigenen Termins, in derselben Kopfzeile rechts neben dem Status-Badge (die `flex-wrap`-Anordnung des Blocks bricht bei schmalen Spalten um). Nicht pro Ansicht gebaut, sondern einmal im TimeGrid – Raumkalender und Tagesansicht bekommen das Verhalten dadurch automatisch; „Meine Buchungen" wiederholt dieselbe Aktion später je Zeile.
- **Aussehen:** shadcn/ui-Button `size="sm"` mit `Check`-Icon (lucide) und Beschriftung „Check-in", kein Icon-Only; auf schmalen Breiten mindestens `h-11` (Touch-Regel, „Responsive-Verhalten"). Die Regel „max. eine Primäraktion pro Sicht" meint die Aktion im Seitenkopf – kontextuelle Inline-Aktionen im Raster fallen nicht darunter, denn in der Tagesansicht können mehrere eigene laufende Buchungen gleichzeitig laufen.
- **Sichtbarkeit** (alle Bedingungen zugleich, geprüft beim Rendern gegen die aktuelle Uhrzeit):
  1. **Eigene Buchung** – Urheber ist die angemeldete Person. Solange der Urheber nur als Text geführt wird (bis zur SSO-Klärung), ordnet die Umsetzung zu; an der Ansichtsregel ändert das nichts: Fremde Buchungen zeigen niemals einen Check-in-Button.
  2. **Laufend** – Beginn ≤ jetzt < Ende. Vor Beginn und nach Ende erscheint die Aktion nicht; der Check-in gehört zur laufenden Buchung, nicht zur kommenden.
  3. **Noch nicht eingecheckt** – der Status ist nicht bereits `eingecheckt`.
  4. **Innerhalb der Frist** – jetzt < Beginn + X Minuten; X ist die konfigurierbare No-Show-Frist (Sidebar „Einstellungen"). Liegt die Frist hinter dem Buchungsende, endet das Fenster spätestens mit dem Ende.

  Zusammengefasst: sichtbar genau im Fenster [Beginn, min(Beginn + X, Ende)). Woher das Frontend X kennt (Konfigurations-API oder abgeleitetes Feld der Buchung), legen die Umsetzungs-Tickets fest – die Regeln hier hängen nicht davon ab.
- **Nach erfolgreichem Check-in:** Der Button entfällt sofort, das Badge wechselt auf „Eingecheckt" (`primary`), der Block bleibt im Beleg-Stil. Erfolgsfeedback als Toast („Check-in erfasst") gemäß Toast-Regel; schlägt die Aktion fehl (etwa weil die Frist zwischenzeitlich abgelaufen ist), erscheint eine kurze destructive Inline-Meldung am Block – kein Toast, denn der Nutzer muss den Fall adressieren – und die Ansicht lädt anschließend ihren Stand neu.
- Kein Live-Timer als Pflicht: Überschreitet eine offene Ansicht die Frist, korrigiert sich der Zustand spätestens beim nächsten Neuladen oder Datumswechsel. Für die Umsetzung relevant: `TimeGridBooking` führt heute nur `id`, `start`, `end`, `status` – Urheber- und Check-in-Information müssen durch die Spur-Daten gereicht werden, sobald die Tickets das bauen; die API liefert `createdBy` bereits zurück.

**Nach Ablauf der Frist ohne Check-in:**

- Der Freigabe-Lauf setzt den Status `nicht erschienen` und gibt den Zeitraum fachlich frei (die Verfügbarkeitsprüfung zählt ihn fortan nicht mehr als belegt – Backend-Arbeit, hier nur der Randhinweis).
- **Darstellung im Raster:** Der Block bleibt als Eintrag des Tages sichtbar – erkennbar bleiben soll ja, warum der Raum jetzt wieder frei ist – wechselt aber vom Beleg-Stil in den freien Stil (Muted-Fläche mit gestricheltem Rand wie ein `FreeSlot`) und zeigt das Badge „Nicht erschienen" im neutralen Muted-Stil. Damit ist „erscheint nicht mehr als belegt" (Anforderung 2) auch farblich erfüllt: keine Primary-Tönung mehr, kein Check-in-Button mehr. Dieselbe Darstellung gilt später je Zeile in „Meine Buchungen".

## Leerzustand

„Noch nichts angelegt" und „Filter liefert keinen Treffer" sind zwei Zustände mit eigenem Text und eigener Aktion (beide in `RoomList.tsx`). Gemeinsame Form: zentrierte shadcn/ui-**Card** (`px-6 py-14 text-center`) mit lucide-Icon (`h-8 w-8 text-muted-foreground`, `aria-hidden`), Kernaussage in `text-base font-medium`, Erläuterung in `text-sm text-muted-foreground`, Aktionen darunter:

- **Noch nichts angelegt** (`RoomsEmpty`, Icon `Inbox`): benennt den Ist-Zustand („Noch keine Räume angelegt.") und führt weiter mit dem Anlegen-CTA als echtem Router-Link im Button-Look (`asChild`, „Raum anlegen") plus sekundärer „Liste neu laden"-Aktion (`variant="outline"`).
- **Filter ohne Treffer** (`NoMatchesEmpty`, Icon `SearchX`): Es existieren Räume, aber keiner erfüllt die gewählte Merkmalskombination – die Aktion ist daher ausschließlich „Filter zurücksetzen" (`variant="outline"`), nicht das Anlegen eines Raums.

Beide Varianten kombinieren Card und Button aus dem shadcn-Bestand, ohne eigene UI-Primitive. Wo Leere fachlich korrekt ist (Tagesansicht ohne Termine: freie Fenster sind Ergebnis, kein Fehler), gilt das Hinweisband-Muster aus „Zustände", kein Empty State über dem Gitter. Buchungsformular, Raumkalender und Tagesansicht übernehmen diese Trennung unverändert statt eigene Varianten zu erfinden.

## Freie-Räume-Suche

Die Umsetzungs-Ansicht zu Anforderung 1 („Freie Räume für einen Wunschzeitraum ermitteln"), kombiniert mit dem Merkmalsfilter nach Anforderung 2: Mitarbeitende geben Datum, Start- und Endzeit sowie gewünschte Ausstattung an und sehen nur die Räume, die in genau diesem Zeitraum buchbar sind – und legen daraus direkt ihre Buchung an. Datenquelle ist die fertige Verfügbarkeits-API `GET /api/rooms/available?from=&to=` (halboffenes Intervall, Back-to-back kollidiert nicht, ausstehende Buchungen blockieren ebenfalls); sie antwortet in derselben Raumform wie `GET /api/rooms`. Dieses Kapitel legt die Ansicht verbindlich fest, sodass das Sprint-Ticket ohne Neuentscheidungen bauen kann.

**Einstieg und Route:** Eigene Route `/free`, registriert in `App.tsx` neben den bestehenden Seitenrouten; Sidebar-Menüpunkt „Freie Räume" in der Gruppe **Buchen** zwischen „Räume" und „Tagesansicht", NavLink wie die übrigen Punkte ohne `end`-Flag (aktive Markierung inkl. etwaiger Unterseiten, Konzept „Navigation"). Seitenkopf nach dem einheitlichen Muster: Titel „Freie Räume", Untertitel „Räume ohne Buchung im gewählten Zeitraum" – keine Primäraktion im Seitenkopf, denn die Aktion dieser Ansicht steht pro Treffer („Buchen").

**Filterbereich:** Eine Card oberhalb der Ergebnisliste (Aufbau wie `AmenityFilter.tsx`: CardHeader mit Titel und Reset-Button, CardContent mit den Eingaben):

- **Zeitraum:** Datum (natives `<input type="date">`), Startzeit und Endzeit (natives `<input type="time" step={900}>` – 15-Minuten-Raster passend zum TimeGrid), gemeinsam im Dreispalter `grid grid-cols-1 sm:grid-cols-3 gap-3` laut Formular-Raster; einheitlicher Eingaben-Stil wie in Raumkalender und BookingForm, Zeiten mit `tabular-nums`. Popover+Calendar bleibt Zielbild der Komponenten-Liste, bis es gebaut ist – bis dahin native Felder wie im restlichen Projekt, keine Doppelumsetzung.
- **Defaults:** heutiges Tag (UTC-„YYYY-MM-DD" nach dem `heuteIso()`-Muster aus `RoomCalendar.tsx`), Start 08:00, Ende 18:00 – der ganze Arbeitstag als neutrale Ausgangsanzeige, aus der heraus verengt wird; die verbindliche Buchungszeit entsteht ohnehin erst im Bestätigungsschritt (siehe „Buchungseinstieg").
- **Validierung:** Fehlendes Datum oder fehlende Zeiten blockiert die Suche mit Feldfehlern klein und rot unter dem jeweiligen Feld; `Ende <= Start` erhält den Wortlaut aus dem BookingForm („Die Endzeit muss nach der Startzeit liegen."). Ein serverseitig abgelehnter Zeitraum (400 mit Backend-Meldung, etwa aus einer manipulierten URL) erscheint im Fehlerzustand der Ergebnisliste mit dem Backend-Wortlaut – nicht als Feldfehler.
- **Merkmale:** Dieselbe Checkbox-Gruppe mit AND-Logik wie der Raumlisten-Filter, Optionen aus dem festen Katalog (Beschluss 21.8.) via `GET /api/amenities`; Lade- und Fehlerzustand des Katalogs bleiben inline innerhalb der Filter-Card (vier Checkbox-Paar-Skelette bzw. dezente Meldung mit `outline`-„Erneut versuchen"), die Zeitsuche bleibt dabei nutzbar. „Filter zurücksetzen" stellt die Defaults wieder her und leert die Merkmalsauswahl.
- **Reload-Verhalten:** EIN Effekt lädt neu, und alle Trigger liegen im selben Abhängigkeitssatz – Mount, jeder committete Filterwechsel, ein `reloadTick` für „Erneut versuchen". Jeder Lauf bricht den vorherigen Request über einen gemeinsamen `AbortController` ab, sodass kein überholter Treffer eine neuere Suche überschreibt (Falle aus der Tagesansicht: nie zwei Effekte mit überlappenden Dep-Sätzen). Kontrollierte Felder feuern erst bei übernommenem Wert, ein Debounce ist deshalb nicht nötig.
- **URL-Sync:** Filterzustand wird als Query-Parameter gespiegelt (`?date=…&from=…&to=…&amenities=…`, Merkmale kommasepariert) – ein Suchergebnis ist damit verlinkbar; fehlende oder unlesbare Parameter führen sauber zu den Defaults. Umsetzung über `useSearchParams`.

**Ergebnisliste:** Nur freie Räume (Anforderung 1) – die Liste kennt keinen „belegt"-Zustand, weshalb es dafür auch kein Badge gibt:

- Abruf über eine neue Funktion `listAvailableRooms(fromIso, toIso)` in `frontend/src/api/rooms.ts` (gleiche `Room`-Form wie `listRooms`, ISO-Zeiten mit `Z`-Suffix wie im BookingForm – eindeutig UTC). Die Merkmalsfilterung läuft CLIENTSEITIG gegen die Trefferliste mit derselben AND-Logik wie in der Raumliste: Die API hält ihren Vertrag ohne Merkmalsparameter (Ticket-Grenze), die Räumenzahl macht den Unterschied nicht spürbar, und ein späterer `amenities`-Parameter wäre eine reine Erweiterung, wenn die Menge es erfordert.
- Raster und Karte wie die Raumliste (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, Card mit Name, MapPin-Standort, Users-Kapazität, Merkmals-Badges) – Bausteine aus `RoomList.tsx` wiederverwenden, nicht kopieren.
- **Verfügbarkeitsstatus:** Ein Badge der Variante `success` mit Label „Frei" (Fachliches Status-Mapping: frei ist der positive Fall) sowie eine Zeile mit dem gesuchten Zeitraum, z. B. „14:00–15:30 Uhr" – Zeiten ausschließlich über `formatTime` aus `lib/format`, mit `tabular-nums`.
- **Buchungseinstieg:** Primäraktion je Treffer: Button „Buchen" (`default`, `CalendarPlus`-Icon, auf schmalen Breiten mindestens `h-11`) öffnet den bestehenden `BookingForm`-Dialog direkt über der Suchseite – mit vorbelegtem Raum und exakt dem gesuchten Zeitraum; der Nutzer ergänzt seinen Urheber und bestätigt. Nach erfolgreichem Speichern schließt der Dialog und die Suche läuft automatisch neu, sodass der gebuchte Raum sofort aus den Treffern fällt. Sekundär führt ein Link „Kalender" auf `/rooms/:id` (Raumkontext prüfen, bevor man bucht).
  - Bekannte Lücke als Arbeitsanweisung für das Sprint-Ticket: `BookingForm` nimmt heute `raumId` und `kalenderDatum` entgegen, aber noch keine Zeiten. Ergänzt werden optionale Props `startZeit`/`endZeit` („HH:mm"), die beim Öffnen in die Zeitfelder schreiben – reine Erweiterung der bestehenden Schnittstelle, keine Verhaltensänderung für den Raumkalender. Bis dahin gilt der Zwischenstand: Dialog mit korrektem Raum und Datum, Zeiten trägt der Nutzer ein.
- Keine Sortier- oder Gruppenlogik über die API-Reihenfolge hinaus (Raumname aufsteigend, wie `GET /api/rooms/available` liefert).

**Zustände:** Alle drei gemäß etabliertem Muster, Referenz-Umsetzung bleibt `RoomList.tsx`:

- **Lädt:** Skeleton-Raster aus sechs Karten-Skeletons in der Form der Ergebnisliste (Bausteine wie `RoomsSkeleton`), `aria-busy="true"`; jedes erneute Suchen zeigt das Skeleton erneut statt alten Inhalt einzufrieren.
- **Leer „keine Räume frei":** zentrierte EmptyState-Card nach dem Muster aus „Leerzustand" (Icon `CalendarSearch`, `h-8 w-8 text-muted-foreground`): Kernaussage „Keine Räume im gewünschten Zeitraum frei.", Erläuterung „Probiere ein anderes Datum, kürzere Zeiten oder weniger Merkmalsfilter." – Aktion ausschließlich „Filter zurücksetzen" (`variant="outline"`): Defaults wiederherstellen, Merkmale leeren. Bewusst KEINE Unterscheidung „noch keine Räume angelegt" vs. „keiner passt zum Filter": Beides mündet hier in denselben Zustand mit derselben einzigen sinnvollen Aktion; der Anlegen-Einstieg lebt in der Raumliste, nicht in der Suche. Auch ein System ohne jegliche Räume zeigt diese Card, nicht eine Sondermeldung.
- **Fehler:** destructives Alert wie `RoomsError` – Titel „Suche fehlgeschlagen", Beschreibung mit Backend-Meldung, soweit vorhanden (ApiError), sonst dem üblichen Hinweis; Button „Erneut versuchen" (`destructive size="sm"`) stößt denselben Abruf erneut an und setzt die Liste zuvor in den Ladezustand. Der Merkmals-Katalog als sekundäre Quelle meldet weiterhin nur inline in der Filter-Card (siehe oben).

**Responsive-Verhalten:** Ergebnisliste stapelt mobile-first (`grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3` → `xl:grid-cols-4`). Der Filterbereich folgt der Regel „Desktop inline, mobil Sheet": ab `md` steht er inline über der Liste, darunter hinter einem „Filter"-Button in einem `Sheet` (Bestandskomponente der Kernkomponenten-Liste), der die Anzahl aktiver Filter am Button zeigt und sich bei Navigation schließt. Touch-Ziele („Buchen", Filter-Reset) auf kleinen Breiten mindestens `h-11`.

## Formularmuster: Dialog vs. Route

Jedes Formular der Anwendung läuft in genau einem der beiden Muster – die Wahl folgt dem fachlichen Kontext, nicht der Feldanzahl:

- **Dialog im Seitenkontext** (Referenz-Umsetzung: `frontend/src/pages/BookingForm.tsx`, im Raumkalender über den Primärbutton im Seitenkopf geöffnet): Das Formular bezieht seinen Kontext vollständig aus der Ansicht, auf der es liegt, und kehrt mit Erfolg in genau diese Ansicht zurück – der Nutzer bleibt dort, wo er war. Es ist die richtige Form für schnelle, kontextuelle Aktionen mit wenigen Feldern: eine Buchung aus dem Raumkalender oder aus einem Suchtreffer der Freie-Räume-Suche heraus, Bestätigungsfragen (etwa Serienbearbeitung). Der Rahmen ist der shadcn/ui-Dialog mit Overlay und Fokus-Falle; der Seitenkopf der Ansicht bleibt sichtbar und zeigt weiter, worauf sich die Eingabe bezieht.
- **Eigene Route** (Referenz-Umsetzung: `frontend/src/pages/RoomForm.tsx` unter `/rooms/new` und `/rooms/:id/edit`): Das Formular ist ein eigener Arbeitsschritt mit eigener URL – verlinkbar, mit Browser-Zurück-Navigation und eigener Lade-/Fehlerkette für die Vorausfüllung. Es ist die richtige Form, wenn das Formular ein eigenes Objekt einführt oder dauerhaft ändert und ohne den Kontext der Herkunftsseite auskommt: Entitäten anlegen und bearbeiten (Raum, künftig Standort und Nutzer) sowie mehrstufige oder seltene Aktionen. Erfolg endet mit einer Navigation (hier: zurück zur Raumliste), nicht mit einem Schließen.

**Entscheidungsregel:** Liegt der fachliche Kontext (Raum, gewählter Tag, Suchergebnis) bereits auf der offenen Ansicht und kehrt das Formular nach Erfolg dorthin zurück, läuft es als Dialog. Führt das Formular ein eigenes Objekt ein oder ändert es eines dauerhaft und verdient damit eine eigene, teilbare URL, läuft es als Route. Ein Formular wird nicht parallel in beiden Formen gebaut; braucht eine spätere Ansicht dasselbe Formular in der anderen Form, wird die Form-Logik extrahiert statt kopiert.

**Gemeinsame Pflichten in beiden Formen** (Referenz-Umsetzungen `BookingForm.tsx` und `RoomForm.tsx`): einheitlicher Eingaben-Stil über dieselbe `inputClass` (Tokens, kein Hex-Wert), Feldvalidierungsfehler klein und rot unter dem jeweiligen Feld, Submit-Button beim Speichern deaktiviert mit Inline-Spinner, Server-Fehler als destructives Alert („Speichern fehlgeschlagen“ + konkrete Meldung des Backends), das mit dem nächsten Absenden sofort entfernt wird, und alle Eingaben bleiben beim Fehler erhalten. Der Unterschied liegt ausschließlich im Rahmen (Overlay mit Schließen vs. Route mit Navigation), nie im Zustandsverhalten.

## Responsive-Verhalten

Mobile-first; maßgebliche Schwellen: `sm` 640, `md` 768, `lg` 1024 (Sidebar-Schwelle), `xl` 1280.

- **Sidebar:** < `lg` Off-Canvas (siehe Navigation), ≥ `lg` fixiert.
- **Raumliste:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- **Tagesansicht:** ≥ `md` Zeitleiste je Raum nebeneinander (horizontal scrollbar bei vielen Räumen, Raumspalte sticky); < `md` automatisch gestapelte Kartenliste – ein Raum-Card mit kompakter Terminliste statt Zeitgitter, kein erzwungenes Horizontalscrollen.
- **Tabellen:** ≥ `md` vollständige Tabelle; < `md` Kartenstapel mit den wichtigsten Feldern, restliche Details über Dialog (DropdownMenu-Aktionen bleiben erreichbar).
- **Filter:** Desktop inline über der Liste; mobil hinter „Filter"-Button in einem `Sheet`.
- **Touch-Ziele:** auf kleinen Breiten Buttons/Zeilenaktionen mindestens `h-11` (~44 px).
- **Formulare:** einspaltig auf Mobil, ab `sm` gruppierte Felder nebeneinander (Datum/Start/Ende), Buttons unten rechtsbündig, Primäraktion zuletzt.
