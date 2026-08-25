# Sprint 10

**Ziel:** Der Kunde kann Räume als genehmigungspflichtig markieren, sieht ausstehende Anfragen mit Status in der Anwendung und kann Gäste ohne Account in eine Buchung aufnehmen.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Design-Konzept: Zusammenspiel von Status- und Gäste-Badge im Kalenderslot festlegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

docs/design-konzept.md ergänzen: Regeln, wie im TimeGrid-Kalenderslot BookingStatusBadge (bestätigt, eingecheckt, nicht erschienen) und der im Gäste-Konzept vorgesehene Gäste-Badge zusammen dargestellt werden – feste Reihenfolge, Kürzung bei vielen Gästen (z. B. „+2“), Verhalten auf schmalen Breiten gemäß Responsive-Standard. Ziel: Die kommende Gäste-Umsetzung und der bestehende No-Show-Slot lösen denselben Slot identisch, statt zwei Varianten zu erzeugen.

### Backend: Genehmigungspflicht-Flag je Raum (Migration + Raum-API)

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Migration ergänzt das Feld requires_approval (boolean, Default false) auf rooms; die Raum-API (anlegen, lesen, ändern) nimmt den Wert entgegen und liefert ihn zurück. Unit-Tests gegen InMemoryDb.

## Akzeptanzkriterien
- Ein neuer Raum kann mit requires_approval=true/false angelegt werden.
- requires_approval lässt sich über die Raum-API nachträglich ändern.
- Räume ohne Angabe erhalten Default false.
- Unit-Tests decken Anlegen, Ändern und Default ab.

## Voraussichtliche Dateien
- backend/src/db/migrations/004_room_approval.sql
- backend/src/services/rooms.ts
- backend/test/rooms.test.ts

### Backend: Buchung mit Status „ausstehend“ bei genehmigungspflichtigem Raum

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

createBooking setzt den Status einer neuen Buchung auf „ausstehend“, wenn der Raum requires_approval=true hat, sonst „bestätigt“. Ausstehende Buchungen blockieren den Zeitraum (Konfliktprüfung zählt sie mit). Unit-Tests gegen InMemoryDb.

## Akzeptanzkriterien
- Buchung im genehmigungspflichtigen Raum erhält Status „ausstehend“ und blockiert den Zeitraum.
- Buchung im nicht-pflichtigen Raum erhält wie bisher „bestätigt“.
- Konfliktprüfung lehnt Überschneidungen mit ausstehenden Buchungen ab.

## Voraussichtliche Dateien
- backend/src/services/bookings.ts
- backend/test/bookings.test.ts

## Abhängigkeiten
- Backend: Genehmigungspflicht-Flag je Raum (Migration + Raum-API)

### Frontend: Genehmigungspflicht-Schalter im Raumformular

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Das RoomForm erhält einen Umschalter für die Genehmigungspflicht gemäß dem verbindlichen Formular-/Zustandsmuster; der Wert wird beim Anlegen/Bearbeiten gesendet und in der Raumliste angezeigt.

## Akzeptanzkriterien
- Im Raumformular lässt sich die Genehmigungspflicht ein- und ausschalten und wird gespeichert.
- Die Raumliste zeigt an, ob ein Raum genehmigungspflichtig ist.
- Server-Fehler beim Speichern werden im etablierten Fehlerzustand angezeigt.

## Voraussichtliche Dateien
- frontend/src/components/RoomForm.tsx
- frontend/src/api/rooms.ts
- frontend/src/pages/RoomList.tsx

## Abhängigkeiten
- Backend: Genehmigungspflicht-Flag je Raum (Migration + Raum-API)

### Frontend: Gäste-Erfassung im BookingForm gemäß Design-Konzept

- Typ: Feature
- Priorität: Mittel
- Schätzung: 2 Punkte

Das BookingForm erhält gemäß dem Sprint-9-Konzept ein Feld zur Erfassung von Gästen (Name/E-Mail, ohne Account); der Wert geht in den Buchungs-API-Aufruf ein und erscheint danach in der Buchungsdarstellung.

## Akzeptanzkriterien
- Im BookingForm lassen sich Gäste mit Angaben erfassen ohne Registrierung.
- Die gespeicherte Buchung enthält die erfassten Gäste.
- Leerer Gästefall bleibt möglich; Server-Fehlerpfad ist im etablierten Zustandsmuster abgesichert.

## Voraussichtliche Dateien
- frontend/src/components/BookingForm.tsx
- frontend/src/api/bookings.ts
