# Sprint 11

**Ziel:** Sprint 11: Rückgestellte UI-Konsistenz-Tickets (Genehmigungsstatus, No-Show-Tooltip, Guest-Badge) abarbeiten und Backend-Endpoint sowie Frontend-Ansicht für Auslastungsbericht implementieren

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Genehmigungsstatus in allen Ansichten konsistent darstellen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Hoch
- Schätzung: 2 Punkte

Überprüfen und anpassen, dass der Status 'ausstehend' bei genehmigungspflichtigen Räumen in RoomKalender.tsx, DayView.tsx und TimeGrid-Slots exakt dieselbe Badge-Komponente (ui/badge.tsx) und dieselbe Farbdefinition nach design-konzept.md verwendet – derzeit gibt es Abweichungen zwischen den Ansichten.

### No-Show-Status in Kalenderslot visuell mit Frist koppeln _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 3 Punkte

BookingStatusBadge.tsx so anpassen, dass das 'nicht erschien'-Badge die konfigurierbare No-Show-Frist X als Tooltip-Text anzeigt, damit Nutzer die zeitliche Beziehung zur Check-in-Pflicht verstehen – unter Beibewahrung der bestehenden Tailwind-Klassen und der Badge-Komponente aus ui/badge.tsx.

### Guest-Badge-Platzierung in Buchungsdetails responsiv anpassen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 2 Punkte

Die Guest-Avatare/Names in Buchungszusammenfassungen so umbauen, dass sie auf schmalen Breiten (sm:) in einzeiliger Tooltip-Anzeige schrumpfen, während sie auf Desktop (lg:) nebeneinander stehen – unter Beibewahrung der permanenten Sidebar-Navigation und der etablierten shadcn/ui-Komponenten.

### Genehmigungsstatus in allen Ansichten konsistent darstellen

- Typ: Chore
- Priorität: Hoch
- Schätzung: 2 Punkte

Badges und Farbdefinitionen in RoomKalender.tsx, DayView.tsx und TimeGrid-Slots an die verbindliche Badge-Komponente (ui/badge.tsx) und design-konzept.md anpassen; Abweichungen bereinigen.

## Akzeptanzkriterien
- Alle Ansichten nutzen dieselbe Badge-Komponente ui/badge.tsx für Status 'ausstehend'
- Farbdefinition entspricht design-konzept.md (z.B. neutrales Muted-Stil)
- Keine unterschiedlichen Badge-Varianten mehr in den Kalenderansichten

## Voraussichtliche Dateien
- frontend/src/components/RoomKalender.tsx
- frontend/src/components/DayView.tsx
- frontend/src/components/TimeGrid.tsx
- frontend/src/components/ui/badge.tsx

### No-Show-Status in Kalenderslot visuell mit Frist koppeln

- Typ: Chore
- Priorität: Mittel
- Schätzung: 2 Punkte

BookingStatusBadge.tsx so anpassen, dass das 'nicht erschien'-Badge die konfigurierbare No-Show-Frist X als Tooltip-Text anzeigt, damit Nutzer die zeitliche Beziehung zur Check-in-Pflicht verstehen.

## Akzeptanzkriterien
- Badge zeigt Tooltip mit konfigurierbarer No-Show-Frist (z.B. 'Frei ab 10:00, Check-in bis 10:15')
- Bestehende Tailwind-Klassen und Badge-Komponente aus ui/badge.tsx beibehalten
- Tooltip erscheint bei Hover über das Badge im Kalenderslot

## Voraussichtliche Dateien
- frontend/src/components/BookingStatusBadge.tsx
- frontend/src/components/TimeGrid.tsx
