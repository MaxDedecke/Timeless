# Sprint 6

**Ziel:** Der Kunde kann in der Anwendung freie Räume für einen Wunschzeitraum (inkl. Ausstattungsfilter) finden und daraus direkt eine Buchung anlegen; Kalender- und Responsive-Verhalten sind als verbindliche Muster festgelegt.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Design-Konzept: Freie-Räume-Suche (Zeitraum + Merkmale) gestalten _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Hoch
- Schätzung: 2 Punkte

Kapitel in docs/design-konzept.md für die UI zur fertigen Verfügbarkeits-API festlegen: Filterbereich (Datum, Start-/Endzeit, Ausstattungsmerkmale), Ergebnisliste je Raum mit Verfügbarkeitsstatus, definierter Leerzustand „keine Räume frei“ gemäß Zustands-Muster sowie direkter Einstieg in die Buchung aus einem Treffer. Damit kann der nächste Sprint die Ansicht ohne Neuentscheidungen bauen.

### Design-Konzept: Formularmuster „Dialog vs. Route“ festlegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 2 Punkte

docs/design-konzept.md um ein Kapitel ergänzen, das verbindlich regelt, wann ein Formular als Dialog im Seitenkontext läuft (Referenz: BookingForm.tsx im Raumkalender) und wann als eigene Route (Referenz: RoomForm unter /rooms/new und /rooms/:id/edit). Dabei BookingForm gegen das dokumentierte Zustands-Muster aus RoomList/RoomForm spiegeln (Submit-Ladezustand, Server-Fehleranzeige als destructives Alert) und Abweichungen angleichen.

### Raumkalender: Leerzustand bei Tag ohne Buchungen verifizieren und testabsichern _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

Analog zur Tagesansicht in Sprint 5 prüfen, dass /rooms/:id an einem Tag ohne Buchungen den dokumentierten TimeGrid-Empty-Zustand zeigt statt eines stummen leeren Rasters; fehlt der Zustand, ergänzen. Den Fall anschließend per Vitest in RoomCalendar.test.tsx absichern.

### Design-Konzept: Responsive-Verhalten von TimeGrid und Tagesansicht festlegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

In docs/design-konzept.md festlegen, wie sich Raumkalender und Tagesansicht auf schmalen Breiten verhalten (z. B. horizontales Scrollen des Rasters bei fixer Raum-/Zeitspalte) und das Umgesetzte daran messen. Der Design-Standard verlangt Mobile-Funktion, für die Zeitraster existiert bislang keine Regel.

### Design-Konzept: Formularmuster „Dialog vs. Route“ festlegen

- Typ: Chore
- Priorität: Mittel
- Schätzung: 2 Punkte

docs/design-konzept.md um ein Kapitel ergänzen, das verbindlich regelt, wann ein Formular als Dialog im Seitenkontext läuft (Referenz: BookingForm.tsx im Raumkalender) und wann als eigene Route (Referenz: RoomForm unter /rooms/new und /rooms/:id/edit). Dabei BookingForm gegen das dokumentierte Zustands-Muster prüfen und Abweichungen beheben.

## Akzeptanzkriterien
- docs/design-konzept.md enthält ein verbindliches Kapitel „Dialog vs. Route“ mit beiden Referenzfällen
- BookingForm entspricht dem dokumentierten Dialog-Muster inkl. Lade-/Fehlerzustand
- Abweichungen im Code sind behoben oder bewusst als Ausnahme dokumentiert

## Voraussichtliche Dateien
- docs/design-konzept.md
- frontend/src/pages/BookingForm.tsx
