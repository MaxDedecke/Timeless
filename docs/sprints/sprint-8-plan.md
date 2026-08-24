# Sprint 8

**Ziel:** Der Kunde kann eine laufende Buchung per Check-in bestätigen, und nicht eingecheckte Buchungen werden nach konfigurierbarer Frist automatisch als 'nicht erschienen' freigegeben.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Doppelt abgeschlossene Sprint-7-Tickets auf Code-Dubletten prüfen und vereinheitlichen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Hoch
- Schätzung: 1 Punkte

Die Tickets „Freie-Räume-Suche: Seite gemäß Design-Konzept umsetzen“ und „BookingForm-Dialog kontextunabhängig machen und aus dem Suchtreffer vorbelegen“ wurden je zweimal (Ben Ritter/Frida Lang) als fertig gemeldet, teils ohne Zusammenfassung. Prüfen, ob dadurch zwei Varianten oder ungenutzte Dubletten derselben Komponenten (z. B. SearchPage, BookingForm, zugehörige Testdateien) im Frontend liegen; eine Variante als verbindlich behalten, Dubletten samt toter Imports entfernen und Suite sowie Build grün halten.

### Gesamtdurchlauf Hauptfluss im Browser: Suche → Buchungsdialog → Raumkalender/Tagesansicht _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

Einen zusammenhängenden Browser-Durchlauf über Raumliste, Freie-Räume-Suche, geöffneten BookingForm-Dialog, Raumkalender (/rooms/:id) und Tagesansicht fahren und gezielt auf Querschnitts-Konsistenz achten: gleiche Lade-/Leer-/Fehlerzustände, durchgängige Nutzung von BookingStatusBadge, einheitliche Button-Muster, Spacing und tabular-nums bei Zeitangaben. Gefundene Abweichungen entweder direkt glattziehen oder als kleine Nachzugs-Chores ableiten.

### REST-API: Check-in für laufende Buchung

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Backend-Endpunkt POST /api/bookings/:id/check-in anlegen: Nur für die aktuell laufende Buchung (Start <= jetzt < Ende) und Status 'bestaetigt' zulässig; setzt Status auf 'eingecheckt'. Fehlerfälle (nicht laufend, bereits eingecheckt, unbekannte ID) mit klaren HTTP-Codes. Unit-Tests gegen InMemoryDb für Kernfall und wichtigste Fehlerbedingung.

## Akzeptanzkriterien
- Check-in einer laufenden Buchung setzt den Status auf 'eingecheckt' und liefert die aktualisierte Buchung.
- Check-in einer nicht laufenden Buchung wird mit verständlicher Fehlermeldung abgelehnt.
- Ein bereits eingecheckter Check-in wird idempotent bzw. mit klarer Meldung behandelt, ohne den Status zu verschlechtern.

## Voraussichtliche Dateien
- backend/src/routes/bookings.ts
- backend/src/services/bookings.ts
- backend/test/bookings.test.ts

### Frontend: Check-in-Aktion für laufende eigene Buchung

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Im Raumkalender und in der Tagesansicht erhält der Nutzer bei seiner aktuell laufenden Buchung einen sichtbaren Check-in-Button gemäß Design-Konzept (Zustands-Muster, BookingStatusBadge zeigt 'eingecheckt'). Nach erfolgreichem Check-in wird die Ansicht aktualisiert. Lade-, Fehler- und Leerzustände folgen den etablierten Mustern.

## Akzeptanzkriterien
- Für die aktuell laufende Buchung ist ein Check-in-Button sichtbar; nach dem Klick erscheint die Buchung als 'eingecheckt'.
- Nicht laufende oder fremde Buchungen zeigen keinen Check-in-Button.
- Fehler beim Check-in werden mit dem etablierten Fehlermuster angezeigt.

## Voraussichtliche Dateien
- frontend/src/pages/RoomCalendar.tsx
- frontend/src/pages/DayView.tsx
- frontend/src/api/bookings.ts

## Abhängigkeiten
- REST-API: Check-in für laufende Buchung

### No-Show-Freigabe: automatische Freigabe nach konfigurierbarer Frist

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Backend: Konfigurationswert für die No-Show-Frist (Minuten nach Beginn) ergänzen und eine Prüfung umsetzen, die überfällige, nicht eingecheckte Buchungen beim Lesen von Verfügbarkeits-/Kalenderdaten als Status 'nicht erschienen' markiert und den Zeitraum damit wieder freigibt (Beschluss vom 21.8.: Buchung bleibt erhalten). Eingecheckte Buchungen bleiben unberührt. Unit-Tests für Freigabe-Fall und rechtzeitig eingecheckten Fall.

## Akzeptanzkriterien
- Eine laufende Buchung ohne Check-in gilt nach Ablauf der Frist als 'nicht erschienen' und blockiert den Raum nicht mehr.
- Eine rechtzeitig eingecheckte Buchung bleibt unverändert bestehen.
- Die Frist ist über die Konfiguration änderbar und wirkt auf die Freigabe-Logik.

## Voraussichtliche Dateien
- backend/src/services/bookings.ts
- backend/src/services/config.ts
- backend/test/bookings.test.ts

## Abhängigkeiten
- REST-API: Check-in für laufende Buchung
