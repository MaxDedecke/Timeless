# Sprint 9

**Ziel:** Der Kunde sieht den No-Show-Status in allen Kalenderansichten, das Check-in-Fenster folgt der konfigurierbaren Frist, und die UI-Muster für Genehmigungsworkflow und Gäste-Erfassung sind als verbindliches Design-Konzept festgelegt – dazu steht das Datenmodell für die Genehmigungspflicht je Raum bereit.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### No-Show-Status in Raumkalender und Tagesansicht sichtbar machen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Hoch
- Schätzung: 1 Punkte

BookingStatusBadge um eine Variante für 'nicht erschienen/freigegeben' gemäß der Festlegung aus dem Sprint-5-Design-Konzept (docs/design-konzept.md) erweitern. TimeGrid-Slots in der Raumkalender-Ansicht (/rooms/:id) und der Tagesansicht geben den Status einer no-show-freigegebenen Buchung über das Badge wieder, statt den Wechsel zu belegter/frei unbezeichnet zu lassen. Testdatei des Badges um die neue Variante ergänzen.

### Check-in-Sichtbarkeitsfenster an konfigurierbare No-Show-Frist koppeln _(zurückgestellt, wieder aufgenommen)_

- Typ: Bug
- Priorität: Mittel
- Schätzung: 1 Punkte

In der TimeGrid-Check-in-Logik (Komponente mit timegrid-checkin-<bookingId>) das hart kodierte 15-Minuten-Fenster ersetzen: Die No-Show-Frist aus der Backend-Konfiguration bzw. vom API-Objekt der Buchung beziehen und das Sichtbarkeitsfenster [Beginn, Beginn+Frist) daraus ableiten. Unit-Test ergänzen, der eine von 15 abweichende Frist abdeckt.

### Design-Konzept: Genehmigungsworkflow-UI festlegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

docs/design-konzept.md erweitern: Platzierung der Liste offener Genehmigungsanfragen in der Navigation (Sidebar-Menüpunkt), Entscheid-Aktionen genehmigen/ablehnen inkl. Bestätigungsmuster, Statusanzeige für den Antragsteller (ausstehend/genehmigt/abgelehnt) über BookingStatusBadge sowie Leer-, Lade- und Fehlerzustand der Anfrageliste. Vorbereitung für Anforderungen 13–14.

### Design-Konzept: Gäste-Erfassung im BookingForm festlegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

docs/design-konzept.md erweitern: Gästefelder im BookingForm-Dialog (Name/E-Mail, dynamisches Hinzufügen und Entfernen von Gästezeilen), Validierungs- und Fehlerdarstellung, Anzeige der erfassten Gäste in der Buchungsdetailansicht bzw. im Kalender-Slot sowie Leerzustand ohne Gäste. Vorbereitung für Anforderung 17.

### No-Show-Status in Raumkalender und Tagesansicht sichtbar machen

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

BookingStatusBadge um eine Variante für 'nicht erschienen/freigegeben' gemäß der Festlegung aus dem Sprint-5-Design-Konzept (docs/design-konzept.md) erweitern. TimeGrid-Slots in der Raumkalender-Ansicht (/rooms/:id) und der Tagesansicht geben den Status einer no-show-freigegebenen Buchung über das Badge wieder.

## Akzeptanzkriterien
- Eine no-show-freigegebene Buchung zeigt in Raumkalender und Tagesansicht das Badge 'nicht erschienen'.
- Die Badge-Variante ist im Unit-Test abgedeckt.
- Bestehende Status-Darstellungen (bestätigt, eingecheckt) bleiben unverändert.

## Voraussichtliche Dateien
- frontend/src/components/BookingStatusBadge.tsx
- frontend/src/components/TimeGrid.tsx
