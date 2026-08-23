# Sprint 4

**Ziel:** Der Kunde sieht nicht nur pro Raum und standortweit Kalender mit Belegungen, sondern kann auch direkt aus der Anwendung eine neue Buchung anlegen.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Gemeinsames Zeitraster (TimeGrid) für Kalenderansichten bauen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Neue wiederverwendbare Komponente (z.B. frontend/src/components/TimeGrid.tsx), die einen Tag als Zeitspalte darstellt: belegte Zeitfenster mit formatTime-Beschriftung, freie Fenster visuell abgesetzt über Muted-Token, Buchungsstatus über BookingStatusBadge. Responsiv (Mobile gestapelt, Desktop seitlich), Ladezustand als Skeleton im Rasterlayout, Ladefehler als destructives Alert mit 'Erneut versuchen', eigener Leerräume-Zustand – jeweils gemäß docs/design-konzept.md. Vitest-Test für die Slot-Darstellung.

### Raumkalender: Buchungen pro Raum unter /rooms/:id anzeigen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Neue Ansicht unterhalb der Raumliste auf Basis von TimeGrid: zeigt die Buchungen des gewählten Raums zeitlich geordnet mit Start- und Endzeit, freie Fenster klar unterscheidbar, Status via BookingStatusBadge, Datumsangaben über formatDate. Eine neu angelegte Buchung (Anlegen-API existiert bereits) erscheint per Refetch unmittelbar. Alle drei Datenzustände nach Konzept absichern; Vitest-Tests für belegte Darstellung und Leerfall.

### Tagesansicht: alle Räume eines Standorts mit Belegung gegenüberstellen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Ansicht (z.B. eigene Route je Standort) rendert für den gewählten Tag je Raum des Standorts eine TimeGrid-Zeile – Räume anderer Standorte dürfen nicht erscheinen. Frei/belegt je Raum erkennbar, Standortauswahl über das vorhandene Locations-API. Zustände Lade/Fehler/Leer (inkl. Standort ohne Räume) nach Konzept; Vitest-Test für die Standort-Filterung.

### Startseite '/' durch echten Einstieg ersetzen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Mittel
- Schätzung: 1 Punkte

Die Wurzelroute im Frontend zeigt aktuell nur den Platzhalter mit Systemstatus. '/' führt stattdessen direkt zur Raumliste (Redirect auf /rooms oder direktes Rendering der RoomList), der Systemstatus-Block wird entfernt. Tests in frontend/test entsprechend anpassen; Browser-Checks gegen /rooms bleiben unverändert gültig.

### Gemeinsames Zeitraster (TimeGrid) für Kalenderansichten bauen

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Wiederverwendbare Komponente frontend/src/components/TimeGrid.tsx, die einen Tag als Zeitspalte darstellt: belegte Zeitfenster mit formatTime-Beschriftung, freie Fenster visuell abgesetzt über Muted-Token, Buchungsstatus via BookingStatusBadge. Responsiv (Mobile gestapelt, Desktop seitlich). Zustands-Muster aus docs/design-konzept.md einhalten; Tests in vitest ergänzen.

## Akzeptanzkriterien
- TimeGrid rendert einen Tag mit belegten Fenstern inkl. Start-/Endzeit-Beschriftung
- Freie Fenster sind visuell von belegten unterscheidbar (Muted-Token)
- Buchungsstatus wird über BookingStatusBadge angezeigt
- Komponente ist per Unit-Test auf Rendering der Fenster geprüft

## Voraussichtliche Dateien
- frontend/src/components/TimeGrid.tsx
- frontend/test/TimeGrid.test.tsx
