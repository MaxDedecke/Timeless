# Gesamtdurchlauf Hauptfluss im Browser: Suche → Buchungsdialog → Raumkalender/Tagesansicht

Zusammenhängender Browser-Durchlauf über Raumliste (`/rooms`), Freie-Räume-Suche (`/free`), geöffneten `BookingForm`-Dialog, Raumkalender (`/rooms/:id`) und Tagesansicht (`/day/:locationId`) gegen den echten Compose-Stack (Frontend + Backend + Postgres), mit Querschnitts-Prüfung auf Konsistenz. Maßstab: `docs/design-konzept.md` (Zustände, Buchungsstatus-Badge, Button-/Spacing-Stufen, `tabular-nums`-Pflicht, Formularmuster „Dialog vs. Route") sowie die bisherige Querprüfung (`pruefung-querpruefung-typo-spacing-stufen.md`).

*Hinweis zur Revision:* Diese Fassung ersetzt die erste, deren Trefferlisten und Auflistung der Browser-Aufrufe nicht zum tatsächlichen Datenstand passten. Alle Angaben unten stammen aus einem vollständig neu gefahrenen Durchlauf am 24.08.2026 (Stack-Kaltstart, leere Datenbank, Stammdaten frisch angelegt); jede Buchung wurde zusätzlich per SQL gegengeprüft.

## Vorbereitung

Der Stack lief bei `check_in_browser` ohne `seed-showcase.sh`, die Datenbank war leer (per `SELECT` verifiziert, bevor die Ansichten geprüft wurden). Stammdaten daher vorab per SQL idempotent angelegt (Name-JOIN, `WHERE NOT EXISTS`): Standorte „DesignFreak HQ" und „Studio Altona"; Räume Brainstorm-Bunker (6, Beamer+Whiteboard), Focus-Oase (4, Whiteboard), Konferenz Nordsee (12, Beamer+Videokonferenz+Whiteboard), Fotostudio Ost (20, alle drei); dazu zwei Bestandsbuchungen am Testtag 24.08.2026 (Brainstorm-Bunker 15–16 Uhr, Konferenz Nordsee 17–18 Uhr, Urheber „Facility-Team DesignFreak", Status `bestaetigt`).

Raum-IDs (Backend sortiert alphabetisch nach Name, daher von der Reihenfolge der Raumliste abweichend): **Fotostudio Ost = 1, Focus-Oase = 2, Brainstorm-Bunker = 3, Konferenz Nordsee = 4** – alle vier im Standort „DesignFreak HQ" (ID 1); „Studio Altona" hat keinen Raum.

Erwartbare Treffermengen aus diesem Datenstand (halboffenes Intervall, Back-to-back kollidiert nicht):

- Suche **17:00–18:00**: frei sind Brainstorm-Bunker, Focus-Oase, Fotostudio Ost; **nicht** Konferenz Nordsee (Bestandsbuchung 17–18).
- Suche **15:00–16:00**: frei sind Focus-Oase, Konferenz Nordsee, Fotostudio Ost; **nicht** Brainstorm-Bunker (Bestandsbuchung 15–16).

## Durchlaufprotokoll

**Durchlauf 1 (Datenstand: 4 Räume, 2 Bestandsbuchungen)**

1. `/rooms`: HTTP 200, vier Raumkarten mit Standort, Kapazität, Merkmals-Badges, Filter-Card und „Raum anlegen"-Primäraktion. Keine Konsolen-/JS-/Netzwerkfehler.
2. `/free?date=2026-08-24&from=17:00&to=18:00` (Deep-Link): **drei Treffer** – Brainstorm-Bunker, Focus-Oase, Fotostudio Ost (alphabetisch); Konferenz Nordsee fällt wegen ihrer Bestandsbuchung korrekt heraus; je Karte „Frei"-Badge (`success`) und gesuchter Zeitraum „17:00 – 18:00 Uhr".
3. Klick auf „Buchen" des ersten Treffers (`search-book-3` = **Brainstorm-Bunker**, ID-basiert, nicht listenpositionsbasiert): Dialog öffnet mit Raumkontext und **vorbelegten Zeiten 17:00/18:00** aus dem Suchfilter (Props `startZeit`/`endZeit`); nur der Urheber wurde ergänzt (`frida.lang@designfreak.de`), dann Speichern.
   - Ergebnis: Dialog schließt, die Trefferliste lädt still nach – **Brainstorm-Bunker fehlt sofort**, übrig bleiben genau zwei Treffer (Focus-Oase, Fotostudio Ost). Kein Skeleton-Einfrieren, kein Fehler.
   - Schreibweg per `SELECT` verifiziert: Zeile in `bookings` (Brainstorm-Bunker, exakt 17:00–18:00 UTC – also unverändert die vorbelegten Suchzeiten, die Zeitfelder wurden nicht angetastet –, Status `bestaetigt`, Urheber exakt aus dem Formularfeld) – der Dialog speichert über dieselbe Anlegen-API inklusive Konfliktprüfung wie der Raumkalender.
4. `/rooms/3`: Die neue Buchung steht unmittelbar im Zeitgitter – Fensterfolge „08:00 – 15:00 frei · 15:00 – 16:00 belegt (Badge „Bestätigt") · 16:00 – 17:00 frei · 17:00 – 18:00 belegt (Badge „Bestätigt") · 18:00 – 20:00 frei"; die angrenzende Bestandsbuchung erzeugt korrekt ein einstündiges freies Fenster dazwischen. Seitenkopf mit Standort, Kapazität, Merkmalen, „Raum buchen"-Primärbutton, Datumswechslerserie inkl. formatiertem Datum „Mo., 24.08.2026" über `lib/format`.
5. `/day/1`: Alle drei HQ-Räume gegenübergestellt mit derselben Fensterfolge wie im Kalender-Einzelbild; jede Buchung am richtigen Raum im Raster; Studio Altona erscheint nicht als Spalte, sondern als Standortwechsel-Link (Anforderung 2). Hinweisband-Muster für freie Fenster.

**Durchlauf 2 (erweiterter Datenstand: zusätzlich die Buchung aus Durchlauf 1)**

1. `/free?date=2026-08-24&from=15:00&to=16:00`: **drei Treffer** – Focus-Oase, Fotostudio Ost, Konferenz Nordsee; Brainstorm-Bunker durch seine Bestandsbuchung 15–16 korrekt ausgeschlossen.
2. „Buchen" auf Konferenz Nordsee (`search-book-4`), Dialog mit vorbelegten 15:00/16:00, Urheber ergänzt (`lena.meyer@designfreak.de`), gespeichert → Trefferliste ohne Konferenz Nordsee (noch zwei Treffer). SQL-Gegenprüfung: Zeile mit exakt 15:00–16:00 UTC und Formular-Urheber.
3. `/rooms/4`: beide Buchungen des Raums sichtbar – „08:00 – 15:00 frei · 15:00 – 16:00 belegt · 16:00 – 17:00 frei · 17:00 – 18:00 belegt · 18:00 – 20:00 frei" – Reihenfolge und Fensterbildung korrekt.
4. `/day/1`: drei Räume mit insgesamt vier Belegungen, allesamt als „belegt" + Badge „Bestätigt"; keine Abweichung zum Kalender-Einzelbild.

**Ergänzende Zustandsprüfungen**

- **Leerzustand der Suche:** Nachträglich Focus-Oase (`search-book-2`, Urheber `tim.becker@designfreak.de`) und Fotostudio Ost (`search-book-1`, Urheber `sara.klein@designfreak.de`) über den Dialog für denselben Zeitraum gebucht – nach jeder Buchung fiel der Raum sofort aus der Trefferliste. Mit vollständig belegten vier Räumen zeigt `/free?date=2026-08-24&from=15:00&to=16:00` die EmptyState-Card „Keine Räume im gewünschten Zeitraum frei." mit Erläuterung und einziger Aktion „Filter zurücksetzen" (`outline`) – gemäß Konzept bewusst ohne Unterscheidung „leeres System" vs. „nichts passt".
- **Mobil (Viewport mobile), `/free?date=2026-08-24&from=17:00&to=18:00`:** Liste stapelt einspaltig, Filterbereich steht hinter dem „Filter"-Button (Sheet) statt inline; keine Layoutbrüche, keine Fehler. Treffer korrekt nur noch Focus-Oase und Fotostudio Ost (der Raum aus Durchlauf 1 bleibt gebucht).

In **jedem** der zwölf Browser-Aufrufe: HTTP 200, keine unbehandelten JavaScript-Fehler, keine Konsolenfehler, keine fehlgeschlagenen Requests.

## Querschnitts-Kriterien (statisch verifiziert)

- **Statusanzeige:** Grep nach rohen Statuswerten außerhalb `BookingStatusBadge.tsx`: einzige Treffer sind ein HTTP-Status im Fetch-Helper (`pages/RoomList.tsx`: ``throw new Error(`HTTP ${res.status}`)``) und die korrekte Badge-Weitergabe in `components/TimeGrid.tsx` – keine Ansicht rendert einen rohen Statuswert; Raumkalender und Tagesansicht zeigen den Badge ausschließlich über die gemeinsame Komponente (Zuordnung laut Konzeptstabelle, „Bestätigt" = `success` auch im Raster sichtbar).
- **Zeitformatierung:** Kein `toLocaleString`/`toLocaleTimeString`/`toLocaleDateString` in Ansichten oder Komponenten (einziger Grep-Treffer ist ein Kommentar in `lib/format.ts`); alle Zeit-/Datumsangaben laufen über `lib/format` (inkl. Slot-Beschriftungen im TimeGrid).
- **Arbitrary Values / Hex / Inline-Styles:** Keine Hex-Farben und keine Tailwind-Arbitrary-Werte in der Anwendungsschicht. Einziger berechtigter Restbefund: zwei berechnete Inline-Höhen in `components/TimeGrid.tsx` (`style={{ height: heightStyle(slot) }}` an Free-/Booked-Slot) – das ist die konzeptfeste Zeitachsen-Geometrie („feste Stundenhöhe h-12 (48 px) pro Stunde, 15-Minuten-Raster für Slot-Positionierung"), kein dekorativer Pixelwert; gleiche Kategorie wie der dokumentierte shadcn-Restbefund der Querprüfung.
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
Zwölf Aufrufe, jeweils HTTP 200 ohne JavaScript-, Konsolen- und Netzwerkfehler:

1. `GET /rooms` – Raumliste (Durchlauf 1, Schritt 1)
2. `GET /free?date=2026-08-24&from=17:00&to=18:00` – Trefferliste (Durchlauf 1, Schritt 2)
3. derselbe Aufruf mit Bedienschritten – Dialog, Buchung Brainstorm-Bunker (Durchlauf 1, Schritt 3)
4. `GET /rooms/3` – Raumkalender Brainstorm-Bunker (Durchlauf 1, Schritt 4)
5. `GET /day/1` – Tagesansicht (Durchlauf 1, Schritt 5)
6. `GET /free?date=2026-08-24&from=15:00&to=16:00` – Trefferliste (Durchlauf 2, Schritt 1)
7. derselbe Aufruf mit Bedienschritten – Dialog, Buchung Konferenz Nordsee (Durchlauf 2, Schritt 2)
8. `GET /rooms/4` – Raumkalender Konferenz Nordsee (Durchlauf 2, Schritt 3)
9. `GET /day/1` – Tagesansicht (Durchlauf 2, Schritt 4)
10. `GET /free?date=2026-08-24&from=15:00&to=16:00` mit Bedienschritten – Buchung Focus-Oase (Leerzustand-Vorbereitung)
11. `GET /free?date=2026-08-24&from=15:00&to=16:00` mit Bedienschritten – Buchung Fotostudio Ost; danach Anzeige des Leerzustands
12. `GET /free?date=2026-08-24&from=17:00&to=18:00` (Viewport mobile) – Mobil-Sichtprüfung

Alle vier über den Dialog angelegten Buchungen wurden anschließend per SQL-`SELECT` in `bookings` gegengeprüft (Raum, exakte UTC-Zeiten entsprechend dem vorbelegten Suchzeitraum, Urheber aus dem Formularfeld, Status `bestaetigt`); die beiden Bestandsbuchungen blieben unverändert.
