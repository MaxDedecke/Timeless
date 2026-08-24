# Sprint 7

**Ziel:** Der Kunde kann freie Räume über eine eigene Suchseite finden und daraus direkt buchen; laufende Buchungen lassen sich per Check-in bestätigen.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Freie-Räume-Suche: Seite gemäß Design-Konzept umsetzen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Neue Route (z. B. /search) mit Filterbereich (Datum, Start-/Endzeit mit Defaults heute 08:00–18:00 via lib/format), Merkmalsfilter als UND-Kombination aus dem festen Katalog, Ergebnisliste ausschließlich freier Räume mit success-Badge „Frei“ und Zeiten aus der bestehenden API /api/rooms/available (Sprint 5). Leerzustand „keine Räume frei“ mit Filter-Reset sowie Lade-/Fehlerzustand exakt nach den dokumentierten Zustands-Mustern (Referenz RoomList.tsx). Responsive-Verhalten wie im Kapitel zu TimeGrid/Tagesansicht: Filterbereich auf schmalen Breiten bedienbar halten.

### BookingForm-Dialog kontextunabhängig machen und aus dem Suchtreffer vorbelegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

BookingForm.tsx so umbauen, dass der Dialog außerhalb des Raumkalenders funktioniert (Raum und Zeitraum als Props statt Kontextannahmen), und ihn aus einem Suchtreffer der Freie-Räume-Suche öffnen: Raum vorbelegt, Datum/Start-/Endzeit aus dem aktiven Suchfilter übernommen. Nach erfolgreichem Anlegen Rückkehr in die Suchergebnisliste mit aktualisierter Verfügbarkeit. Server-Fehler (z. B. Konflikt) weiterhin als destructives Alert gemäß Formularmuster.

### Sidebar: Menüpunkt für die Freie-Räume-Suche ergänzen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

NAV_ITEMS in der Sidebar-Komponente um einen Eintrag für die Suchroute erweitern (sinnvolles Icon, Position vor/nach „Räume“ nach Konzeptlogik). Aktive Markierung inkl. Unterseiten wie beim bestehenden „Räume“-NavLink ohne end-Flag umsetzen, damit die Markierung konsistent bleibt. Auf schmalen Breiten über das vorhandene Einklapp-/Off-Canvas-Verhalten laufen lassen.

### Freie-Räume-Suche: Seite gemäß Design-Konzept umsetzen

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Neue Route /search gemäß dem in Sprint 6 festgelegten Design-Konzept umsetzen: Filterbereich mit Datum und Start-/Endzeit (Defaults heute 08:00–18:00 via lib/format), Merkmalsfilter als UND-Kombination aus dem festen Katalog, Ergebnisliste ausschließlich freier Räume mit success-Badge „Frei“ und Zeiten aus der bestehenden API /api/rooms/available. Lade-, Fehler- und Leerzustand nach den verbindlichen Zustands-Mustern aus docs/design-konzept.md.

## Akzeptanzkriterien
- Unter /search lassen sich Datum, Start-/Endzeit und Merkmale setzen; die Ergebnisliste zeigt ausschließlich Räume ohne überschneidende Buchung im gewählten Zeitraum
- Bei mehreren gewählten Merkmalen werden nur Räume angezeigt, die alle besitzen (UND-Kombination)
- Lade-, Fehler- und Leerzustand sind gemäß Design-Konzept umgesetzt
- Responsive auf Mobile- wie Desktop-Breite nutzbar

## Voraussichtliche Dateien
- frontend/src/pages/RoomSearch.tsx
- frontend/src/App.tsx
- frontend/src/api/rooms.ts
- frontend/test/RoomSearch.test.tsx

### BookingForm-Dialog kontextunabhängig machen und aus dem Suchtreffer vorbelegen

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

BookingForm.tsx so umbauen, dass der Dialog außerhalb des Raumkalenders funktioniert (Raum und Zeitraum als Props statt Kontextannahmen), und ihn aus einem Suchtreffer der Freie-Räume-Suche öffnen: Raum vorbelegt, Datum/Start-/Endzeit aus dem aktiven Suchfilter übernommen. Nach erfolgreichem Anlegen Rückmeldung und Aktualisierung der Suchergebnisse.

## Akzeptanzkriterien
- Aus einem Suchtreffer lässt sich der Buchungsdialog öffnen; Raum, Datum und Zeiten sind aus dem Treffer bzw. Filter vorbelegt
- Eine über die Suche angelegte Buchung erscheint anschließend im Raumkalender des Raums
- Der bestehende Buchungsfluss aus dem Raumkalender funktioniert unverändert weiter

## Voraussichtliche Dateien
- frontend/src/pages/BookingForm.tsx
- frontend/src/pages/RoomSearch.tsx
- frontend/test/BookingForm.test.tsx

## Abhängigkeiten
- Freie-Räume-Suche: Seite gemäß Design-Konzept umsetzen
