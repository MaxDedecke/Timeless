# Sprint 2

**Ziel:** Grundlage des Buchungswesens schaffen: Buchungen können gespeichert werden und Doppelbuchungen werden zuverlässig verhindert.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### RoomList: Lade-, Fehler- und Leerräume-Zustand ergänzen und testabsichern _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Hoch
- Schätzung: 1 Punkte

In RoomList.tsx (frontend/src) prüfen und fehlende Zustände ergänzen: (1) Ladezustand beim initialen Fetch (Skeleton oder Spinner statt leerem Card-Grid), (2) Fehlerzustand bei scheiterndem GET /api/rooms mit verständlicher Meldung und Wiederholen-Button, (3) Listen-Leerzustand („Noch keine Räume angelegt“) mit Anlegen-Call-to-action, getrennt vom bereits vorhandenen Filter-Leerzustand des AmenityFilters. Umsetzung mit bestehenden shadcn-Bausteinen, keine neuen Farbwerte; je Zustand ein Rendering-Test in RoomList.test.tsx ergänzen (Mock mit reject bzw. leerem Array bzw. verzögerter Auflösung).

### Querprüfung: Manuell gesetzte Typo-/Spacing-Stufen in Frontend-Komponenten auf Konzept-Stufen zurückführen _(zurückgestellt, wieder aufgenommen)_

- Typ: Chore
- Priorität: Mittel
- Schätzung: 1 Punkte

Analog zum AmenityFilter-Fall (`text-base font-semibold tracking-tight` statt Karten-Stufe) frontend/src/components und alle Seiten nach manuell kombinierten Textgrößen/-stärken und Pixel-Spacings durchsuchen (grep auf `text-[`, `px-[`, `py-[`, `font-semibold`, `font-bold`) und alles, was nicht Tailwind-Skala oder dokumentierte Stufe aus docs/design-konzept.md ist, auf die nächste Skalen- bzw. Konzept-Stufe umstellen. Rein visuelle Normalisierung, keine Funktionsänderung; bestehende vitest-Tests müssen unverändert grün bleiben.

### Raumformular: Submit-Ladezustand und Server-Fehleranzeige vereinheitlichen _(zurückgestellt, wieder aufgenommen)_

- Typ: Feature
- Priorität: Mittel
- Schätzung: 1 Punkte

In frontend/src (Raumformular-Komponente für /rooms/new und /rooms/:id/edit) sicherstellen, dass der Speichern-Button während des laufenden createRoom/updateRoom-Requests deaktiviert ist (shadcn-Button mit disabled + Spinner-Icon) und dass Fehler vom Backend (Pflichtfeld-Validierung laut Anforderung 1, Netzwerkfehler) inline in einer einheitlichen Darstellung (z.B. shadcn Alert, destructive-Variante) über dem Formular erscheinen statt gar nicht bzw. nur in der Browser-Konsole. Falls beides schon existiert, genügt die Absicherung durch je einen Rendering-Test (Reject-Case, Pending-Case) in der zugehörigen Testdatei.

### Migration: Tabelle für Buchungen

- Typ: Feature
- Priorität: Hoch
- Schätzung: 1 Punkte

Neue Migration 003_bookings.sql anlegen: Tabelle bookings mit id, room_id (FK auf rooms, NOT NULL), created_by (Urheber), starts_at/ends_at (TIMESTAMPTZ, NOT NULL), Status-Feld (z.B. 'bestaetigt') als Grundlage für spätere Genehmigungen/No-Show. In der In-Memory-Db läuft sie über den bestehenden Migrationsläufer; migrations.test.ts um einen Lauf gegen die neue Migration ergänzen.

## Akzeptanzkriterien
- Migration erzeugt Tabelle bookings mit room_id-FK, Urheber-Feld, Start-/Endzeit und Status.
- Ein Raum ohne zugehörige Buchungen kann referenziert werden; Löschverhalten ist definiert.
- migrations.test.ts läuft grün inklusive der neuen Migration in der In-Memory-DB.

## Voraussichtliche Dateien
- backend/src/db/migrations/003_bookings.sql
- backend/test/migrations.test.ts

### REST-API: Buchung anlegen mit Konfliktprüfung

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Service und Route POST /api/bookings umsetzen: Validierung von room_id, Datum, Start- und Endzeit (Ende nach Anfang), Speichern der Buchung mit Urheber und Status 'bestaetigt'. Beim Speichern prüft der Service auf überschneidende bestehende Buchungen desselben Raums und lehnt Kollisionen mit einer verständlichen Fehlermeldung ab; Back-to-back-Buchungen (Ende == Start) sind zulässig. Überschneidungsprüfung so formulieren, dass sie später für Serien wiederverwendbar ist. Unit-Tests gegen InMemoryDb: erfolgreiche Buchung erscheint, kollidierende wird abgelehnt, angrenzende ist zulässig.

## Akzeptanzkriterien
- POST /api/bookings speichert eine gültige Buchung und liefert sie mit Urheber und Status zurück.
- Eine überlappende Buchung desselben Raums wird mit verständlicher Fehlermeldung abgelehnt (HTTP 409).
- Direkt aneinander angrenzende Buchungen im selben Raum werden akzeptiert.
- Ungültige Eingaben (fehlende Felder, Ende vor Anfang) werden mit HTTP 400 abgelehnt.

## Voraussichtliche Dateien
- backend/src/services/bookings.ts
- backend/src/routes/bookings.ts
- backend/src/server.ts
- backend/test/bookings.test.ts

## Abhängigkeiten
- Migration: Tabelle für Buchungen
