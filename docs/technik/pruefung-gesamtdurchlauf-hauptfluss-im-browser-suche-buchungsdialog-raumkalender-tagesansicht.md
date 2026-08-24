# Gesamtdurchlauf Hauptfluss im Browser: Suche → Buchungsdialog → Raumkalender/Tagesansicht

Zusammenhängender Browser-Durchlauf über Raumliste (`/rooms`), Freie-Räume-Suche (`/free`), geöffneten `BookingForm`-Dialog, Raumkalender (`/rooms/:id`) und Tagesansicht (`/day/:locationId`) gegen den echten Compose-Stack (Frontend + Backend + Postgres), mit Querschnitts-Prüfung auf Konsistenz. Maßstab: `docs/design-konzept.md` (Zustände, Buchungsstatus-Badge, Button-/Spacing-Stufen, `tabular-nums`-Pflicht, Formularmuster „Dialog vs. Route") sowie die bisherige Querprüfung (`pruefung-querpruefung-typo-spacing-stufen.md`).

## Vorbereitung

Der Stack läuft bei `check_in_browser` ohne `seed-showcase.sh`, die Datenbank war leer. Stammdaten daher vorab per SQL idempotent angelegt (Name-JOIN, `WHERE NOT EXISTS`): Standorte „DesignFreak HQ" und „Studio Altona"; Räume Brainstorm-Bunker (6, Beamer+Whiteboard), Focus-Oase (4, Whiteboard), Konferenz Nordsee (12, Beamer+Videokonferenz+Whiteboard), Fotostudio Ost (20, alle drei); dazu Bestandsbuchungen am Testtag 24.08.2026 (Konferenz Nordsee 17–18 Uhr, Brainstorm-Bunker 15–16 Uhr). Raum-IDs: Focus-Oase = 1, Brainstorm-Bunker = 2, Konferenz Nordsee = 3, Fotostudio Ost = 4.

## Durchlaufprotokoll

**Durchlauf 1 (Datenstand: 4 Räume, 2 Bestandsbuchungen)**

1. `/rooms`: HTTP 200, vier Raumkarten mit Standort, Kapazität, Merkmals-Badges, Filter-Card und „Raum anlegen"-Primäraktion. Keine Konsolen-/JS-/Netzwerkfehler.
2. `/free?date=2026-08-24&from=17:00&to=18:00` (Deep-Link, überschneidet die Bestandsbuchung von Konferenz Nordsee): Treffer genau Brainstorm-Bunker und Fotostudio Ost – Konferenz Nordsee fällt korrekt heraus; je Karte „Frei"-Badge (`success`) und gesuchter Zeitraum „17:00 – 18:00 Uhr".
3. Klick auf „Buchen" des ersten Treffers (`search-book-1` = **Focus-Oase**, ID-basiert, nicht listenpositionsbasiert): Dialog öffnet mit Raumkontext und **vorbelegten Zeiten 17:00/18:00** aus dem Suchfilter (Props `startZeit`/`endZeit`); nur der Urheber wurde ergänzt, dann Speichern.
   - Ergebnis: Dialog schließt, die Trefferliste lädt still nach – **Focus-Oase fehlt sofort**, nur noch zwei Treffer. Kein Skeleton-Einfrieren, kein Fehler.
   - Schreibweg per `SELECT` verifiziert: Zeile in `bookings` (Focus-Oase, 17:00–18:00 UTC, Status `bestaetigt`, Urheber exakt aus dem Formularfeld) – der Dialog speichert über dieselbe Anlegen-API inklusive Konfliktprüfung wie der Raumkalender.
4. `/rooms/1`: Die neue Buchung steht unmittelbar im Zeitgitter („17:00 – 18:00 belegt", Badge „Bestätigt"); freie Fenster (08–17, 18–20) klar unterscheidbar; Seitenkopf mit Standort, Kapazität, Merkmalen, „Raum buchen"-Primärbutton, Datumswechslerserie inkl. formatiertem Datum „Mo., 24.08.2026" über `lib/format`.
5. `/day/1`: Alle drei HQ-Räume gegenübergestellt, jede neue Buchung am richtigen Raum im Raster; Studio Altona erscheint nicht als Spalte, sondern als Standortwechsel-Link (Anforderung 2). Hinweisband-Muster für freie Fenster.

**Durchlauf 2 (nach Suite-/Lint-Lauf, erweiterter Datenstand)**

1. `/free?date=2026-08-24&from=15:00&to=16:00`: Treffer Focus-Oase und Fotostudio Ost (Brainstorm-Bunker durch Bestandsbuchung korrekt ausgeschlossen).
2. „Buchen" auf Konferenz Nordsee (`search-book-3`), Dialog mit vorbelegten 15:00/16:00, Urheber ergänzt, gespeichert → Trefferliste ohne Konferenz Nordsee.
3. `/rooms/3`: beide Buchungen des Raums sichtbar (15–16 belegt, 16–17 frei, 17–18 belegt) – Reihenfolge und Fensterbildung korrekt.
4. `/day/1`: drei Räume mit insgesamt vier Belegungen, allesamt als „belegt" + Badge „Bestätigt"; keine Abweichung zum Kalender-Einzelbild.

**Ergänzende Zustandsprüfungen**

- **Leerzustand der Suche:** Nach vollständigem Beleg aller vier Räume für 15:00–16:00 zeigt `/free?…from=15:00&to=16:00` die EmptyState-Card „Keine Räume im gewünschten Zeitraum frei." mit Erläuterung und einziger Aktion „Filter zurücksetzen" (`outline`) – gemäß Konzept bewusst ohne Unterscheidung „leeres System" vs. „nichts passt".
- **Mobil (Viewport mobile), `/free`:** Liste stapelt einspaltig, Filterbereich steht hinter dem „Filter"-Button (Sheet) statt inline; keine Layoutbrüche, keine Fehler.

In **jedem** der sieben Browser-Aufrufe: HTTP 200, keine unbehandelten JavaScript-Fehler, keine Konsolenfehler, keine fehlgeschlagenen Requests.

## Querschnitts-Kriterien (statisch verifiziert)

- **Statusanzeige:** Grep nach rohen Statuswerten außerhalb `BookingStatusBadge.tsx`: keine Treffer in `pages/` und eigenen Komponenten – Raumkalender und Tagesansicht rendern den Badge ausschließlich über die gemeinsame Komponente (Zuordnung laut Konzeptstabelle, „Bestätigt" = `success` auch im Raster sichtbar).
- **Zeitformatierung:** Kein `toLocaleString`/`toLocaleTimeString`/`toLocaleDateString` in Ansichten oder Komponenten; alle Zeit-/Datumsangaben laufen über `lib/format` (inkl. Slot-Beschriftungen im TimeGrid).
- **Arbitrary Values / Hex / Inline-Styles:** Keine in der Anwendungsschicht. Einziger berechtigter Restbefund: zwei berechnete Inline-Höhen in `components/TimeGrid.tsx` (`heightStyle(slot)` an Free-/Booked-Slot) – das ist die konzeptfeste Zeitachsen-Geometrie („feste Stundenhöhe h-12 (48 px) pro Stunde, 15-Minuten-Raster für Slot-Positionierung"), kein dekorativer Pixelwert; gleiche Kategorie wie der dokumentierte shadcn-Restbefund der Querprüfung.
- **tabular-nums:** Alle 7 nativen Datum-/Zeitfelder (Suche 3, BookingForm 3, Raumkalender-Datumswechsler 1) tragen `tabular-nums` – inklusive `room-calendar-date-input`, dessen Ergänzung Gegenstand des Code-Commits zu diesem Ticket war (Commit f477d6f3) und in `frontend/test/RoomCalendar.test.tsx` abgesichert ist. Auch Kapazitäts-, Slot- und Badge-Zeiten nutzen die Klasse.
- **Buttons/Spacing:** Primäraktion je Sicht im Seitenkopf bzw. je Treffer („Buchen"), sekundäre Aktionen `outline`, destruktive Fehleraktionen `destructive size="sm"`; einheitliche `inputClass` (Tokens) in allen drei formularführenden Stellen; Spacing durchgehend Tailwind-Skala; Dialog-Muster ausschließlich für kontextuelle Formulare (BookingForm), Route für Entitäten (RoomForm) – konsistent mit „Formularmuster".

## Befunde und Glättungen

| # | Befund | Entscheidung |
|---|---|---|
| 1 | Datumsfeld im DateSwitcher des Raumkalenders trug als einziger Zeit-Eingabewert kein `tabular-nums` | Bereits geglättet (Commit f477d6f3, Klasse ergänzt) und durch Test-Assertion in `RoomCalendar.test.tsx` abgesichert; im Durchlauf als konsistent verifiziert |
| 2 | Zwei berechnete Inline-Höhen im TimeGrid | Keine Abweichung – konzeptfeste Zeitachsen-Geometrie (48 px/Stunde), dokumentierter Restbefund wie shadcn-Primitive |
| 3 | Keine weiteren Abweichungen bei Zuständen, Badge-Nutzung, Buttons, Spacing, Formatierung | –

**Nachzugs-Chores: keine abgeleitet.**

## Verifikation

### frontend
npm run lint: exit 0 (tsc --noEmit)
npm test: exit 0 — **129 Tests in 14 Dateien**

### Browser-Checks (check_in_browser gegen den Compose-Stack)
Sieben Aufrufe (siehe Durchlaufprotokoll): `/rooms`, `/free` × 4 (Desktop/Mobil, Treffer- und Leerzustand), `/rooms/1`, `/rooms/3`, `/day/1` × 2 – jeweils HTTP 200, ohne JavaScript-, Konsolen- und Netzwerkfehler. Buchungen wurden real über den Dialog angelegt und anschließend per SQL-`SELECT` in `bookings` gegengeprüft (Raum, Zeiten, Urheber, Status).
