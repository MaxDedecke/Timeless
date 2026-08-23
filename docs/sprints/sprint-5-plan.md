# Sprint 5

**Ziel:** Der Kunde kann aus der Anwendung heraus eine Buchung anlegen (mit sichtbarer Konflikt-Rückmeldung) und freie Räume für einen Wunschzeitraum ermitteln.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### tabular-nums in Raumkalender-Kopf und TimeGrid-Beschriftung nachziehen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

Die im Design-Review für die Tagesansicht verbindlich gemachte tabular-nums-Konvention auf die parallelen Zeit-/Datumsangaben anwenden: Seitenkopf des Raumkalenders (/rooms/:id) und die formatTime-Beschriftungen in frontend/src/components/TimeGrid.tsx. Zuerst prüfen, wo die Klasse bereits greift, fehlende Stellen ergänzen und per Klassen-Assertion im jeweiligen Vitest absichern (Muster App.test.tsx bzw. TimeGrid-Tests).

### Tagesansicht: Leerzustand für Standort ohne Räume sicherstellen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Mittel
- Schätzung: 1 Punkte

Verifizieren, wie /day bzw. /day/:locationId sich bei einem gewählten Standort ohne Räume verhält, und den Fall auf das dokumentierte Zustands-Muster aus RoomList bringen (aussagekräftiger Leerzustand statt leerem Raster). Falls das Verhalten bereits korrekt ist, genügt der ergänzte Vitest-Nachweis; falls fehlend, das Muster übertragen.

### Design-Konzept: Check-in-Aktion und No-Show-Status festlegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

docs/design-konzept.md um die Darstellungsregeln für Check-in/No-Show ergänzen: Badge-Variante für den geplanten Status „nicht erschienen“ im bestehenden semantischen Badge-Inventar zuordnen sowie Sichtbarkeit und Platzierung des Check-in-Buttons an laufender eigener Buchung in Raumkalender und Tagesansicht definieren (inkl. Verhalten nach Ablauf der No-Show-Frist), damit die kommenden Sprint-Tickets einheitlich darauf aufbauen.

### REST-API: Freie Räume für einen Zeitraum ermitteln

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Neuen Endpunkt GET /api/rooms/available?from=&to= im Backend umsetzen: Er liefert alle Räume, die im halboffenen Zeitintervall [from, to) keine überschneidende Buchung haben (gleiche Überlappungssemantik wie die Konfliktprüfung in services/bookings.ts, Back-to-back gilt als frei). Ungültige/fehlende Parameter werden mit verständlichem 400 abgelehnt. Vertragstests gegen die InMemoryDb ergänzen (freier Raum, kollidierender Raum, Back-to-back, ungültiges from/to).

## Akzeptanzkriterien
- GET /api/rooms/available listet für einen gültigen Zeitraum ausschließlich Räume ohne überschneidende Buchung
- Ein Raum mit kollidierender Buchung im Zeitraum fehlt in der Antwort; direkt angrenzende Buchungen schließen ihn nicht aus
- Fehlende oder unlesbare from/to-Parameter führen zu HTTP 400 mit verständlicher Fehlermeldung
- Vertragstests in backend/test/ decken frei/kollidierend/back-to-back/Fehlerfall real gegen die InMemoryDb ab

## Voraussichtliche Dateien
- backend/src/routes/rooms.ts
- backend/src/services/rooms.ts
- backend/test/rooms.test.ts

### Buchungsformular im Raumkalender: Buchung aus der Anwendung anlegen

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Im Raumkalender (/rooms/:id) einen „Buchen“-Button ergänzen, der ein Formular (Datum, Startzeit, Endzeit, optionaler Urheber-Name) öffnet bzw. auf eine Formularansicht führt. Absenden ruft POST /api/bookings auf; bei Konflikt (HTTP 409) wird die verständliche Fehlermeldung des Backends im dokumentierten Fehlerzustand angezeigt, bei Erfolg zur Kalenderansicht zurück navigiert, wo die neue Buchung erscheint. Zustände (Lade-/Fehler-/Submit) folgen dem verbindlichen Muster aus docs/design-konzept.md. Vitest-Tests für Erfolgs- und Konfliktfall (gemocktes fetch, Muster RoomForm.test.tsx); API-Vertrag separat per run_integration_check gegen den laufenden Stack prüfen.

## Akzeptanzkriterien
- Aus dem Raumkalender lässt sich über das Formular eine Buchung mit Datum, Start- und Endzeit anlegen; sie erscheint anschließend in der Kalenderansicht
- Eine überschneidende Buchung wird mit der verständlichen Fehlermeldung des Backends angezeigt und nicht gespeichert
- Lade-, Fehler- und Submit-Zustände entsprechen dem dokumentierten Zustands-Muster
- Vitest deckt Erfolgs- und Konfliktfall ab; Integrationstest bestätigt den API-Vertrag am laufenden Stack

## Voraussichtliche Dateien
- frontend/src/pages/RoomCalendar.tsx
- frontend/src/pages/BookingForm.tsx
- frontend/src/api/bookings.ts
- frontend/test/BookingForm.test.tsx
