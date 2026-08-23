# Sprint 3

**Ziel:** Buchungen werden sichtbar: Der Kunde sieht pro Raum einen Kalender mit seinen Buchungen, und die Zustands- sowie Formatierungs-Muster aus Sprint 2 sind als verbindliche Referenz etabliert.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Design-Konzept: Etablierte Zustands-Muster aus RoomList und RoomForm als verbindliche Referenz dokumentieren _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

docs/design-konzept.md um Abschnitte „Ladezustand“, „Fehleranzeige“ und „Leerzustand“ ergänzen, die die bereits umgesetzten Muster als verbindlich für alle künftigen Ansichten festlegen: Skeleton-Raster und destructives Alert mit „Erneut versuchen“ sowie getrennte Filter-/Listen-Leerzustände wie in RoomList.tsx, deaktivierter Speichern-Button mit Inline-Spinner und Reset des Alerts beim nächsten Submit wie in RoomForm.tsx – jeweils mit Verweis auf die verwendete shadcn-Komponente, damit Buchungsformular, Raumkalender und Tagesansicht daraus übernehmen statt Varianten zu erfinden.

### Gemeinsamen Zeit-/Datumsformatierer im Frontend etablieren _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

Im bestehenden lib-Verzeichnis des Frontends einen kleinen Formatierer anlegen (formatTime als HH:mm, formatDate de-DE etwa als „Mo., 23.08.2026“ – konkrete Ausgabe bei Umsetzung kurz im Design-Konzept notieren) plus Vitest-Tests dafür. Dokumentieren, dass Kalender-, Buchungs- und Tagesansichten ausschließlich diesen Helfer nutzen statt verteilter toLocale*-Aufrufe. Bewusst vor den Kalender-Tickets, damit nicht jede neue Ansicht ihr eigenes Format einführt.

### BookingStatusBadge: Badge-Varianten für Buchungsstatus festlegen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Niedrig
- Schätzung: 1 Punkte

Die Buchungstabelle existiert, und mit Genehmigungsworkflow und No-Show-Logik werden Statuswerte (bestätigt, ausstehend, abgelehnt, nicht erschienen) bald in mehreren Ansichten sichtbar. Im Komponentenverzeichnis des Frontends eine kleine BookingStatusBadge-Komponente anlegen, die jeden Status auf eine feste shadcn-Badge-Variante mappt (Vorschlag: bestätigt=default, ausstehend=secondary, abgelehnt/nicht erschienen=destructive bzw. outline – finale Zuordnung im Design-Konzept dokumentieren), mit einem jsdom-Rendering-Test je Status, damit Raumkalender und Tagesansicht ab dem ersten Ticket denselben Status-Stil zeigen.

### Design-Konzept: Etablierte Zustands-Muster aus RoomList und RoomForm als verbindliche Referenz dokumentieren

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

docs/design-konzept.md um Abschnitte „Ladezustand“, „Fehleranzeige“ und „Leerzustand“ ergänzen, die die bereits umgesetzten Muster als verbindlich für alle künftigen Ansichten festlegen: Skeleton-Raster und destructives Alert mit „Erneut versuchen“ sowie getrennte Filter-/Listen-Leerzustände wie in RoomList umgesetzt.

## Akzeptanzkriterien
- docs/design-konzept.md enthält Abschnitte zu Ladezustand, Fehleranzeige und Leerzustand
- Die Abschnitte beschreiben die in RoomList/RoomForm umgesetzten Muster konkret (Skeleton, destructives Alert mit Retry, getrennte Filter-/Listen-Leerzustände)
- Die Muster sind als verbindlich für künftige Ansichten gekennzeichnet

## Voraussichtliche Dateien
- docs/design-konzept.md

### Gemeinsamen Zeit-/Datumsformatierer im Frontend etablieren

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

Im bestehenden lib-Verzeichnis des Frontends einen kleinen Formatierer anlegen (formatTime als HH:mm, formatDate de-DE etwa als „Mo., 23.08.2026“ – konkrete Ausgabe bei Umsetzung kurz im Design-Konzept notieren) plus Vitest-Tests dafür. Dokumentieren, dass Kalender-, Buchungs- und Tagesansichten ausnahmslos diesen Formatierer nutzen statt verstreuter toLocaleString-Aufrufe.

## Akzeptanzkriterien
- frontend/src/lib enthält einen Formatierer mit formatTime (HH:mm) und formatDate (de-DE)
- Vitest-Tests decken beide Funktionen ab
- Die konkrete Ausgabe ist im Design-Konzept notiert

## Voraussichtliche Dateien
- frontend/src/lib/format.ts
- frontend/test/lib/format.test.ts
- docs/design-konzept.md
