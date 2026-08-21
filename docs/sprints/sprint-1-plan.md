# Sprint 1

**Ziel:** Funktionsfähige Grundanwendung mit Docker-Setup, Raumverwaltung inkl. Ausstattung und gefilterter Raumliste – der Kunde kann Räume anlegen, bearbeiten und nach Ausstattung finden.

**Geplant von:** Pia Ostermann (Product Owner)

## Tickets

### Projektgrundgerüst: Docker-Compose mit Frontend-, Backend- und Postgres-Container

- Typ: Chore
- Priorität: Dringend
- Schätzung: 3 Punkte

Repo-Wurzel erhält eine ausführbare docker-compose.yml mit drei Services: frontend (eigener Container, Port veröffentlicht), backend/API (interner Servicename) und postgres. Code wird per COPY in die Images gebaut, keine Bind-Mounts. Backend und Frontend erhalten je ein echtes dev/start-Skript sowie ein test-Skript; Backend verbindet sich über den Servicenamen 'postgres' mit der Datenbank. Healthcheck/Startverifikation ohne lokales Docker: Konfiguration und Skripte werden inhaltlich geprüft.

## Akzeptanzkriterien
- docker-compose.yml liegt in der Repo-Wurzel und definiert die Services frontend, backend und postgres; nur frontend hat einen ports-Eintrag
- Backend erreicht die Datenbank ausschließlich über den Compose-Servicenamen (z.B. postgres:5432)
- Frontend-package.json enthält ein start/dev-Skript, das einen echten Server startet, plus test- und lint/build-Skript
- Dockerfiles kopieren den Code per COPY statt Bind-Mount

## Voraussichtliche Dateien
- docker-compose.yml
- backend/Dockerfile
- backend/package.json
- frontend/package.json

### Datenmodell und API für Räume (Name, Standort, Kapazität)

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Postgres-Migration legt die Tabellen rooms an (id, name, location, capacity). Backend bietet REST-Endpunkte zum Anlegen, Lesen und Ändern von Räumen mit Validierung: Name, Standort und Kapazität sind Pflichtfelder. Unit-Tests für Validierung und Erfolgsfall.

## Akzeptanzkriterien
- POST /api/rooms legt einen Raum mit Name, Standort und Kapazität an
- Ein Raum ohne Name, Standort oder Kapazität wird mit Fehlermeldung abgelehnt
- PATCH/PUT ändert Standort und Kapazität eines bestehenden Raums
- Unit-Tests decken Anlegen, Pflichtfeld-Validierung und Änderung ab

## Voraussichtliche Dateien
- backend/src/db/migrations/001_rooms.sql
- backend/src/routes/rooms.ts
- backend/src/services/rooms.ts
- backend/test/rooms.test.ts

## Abhängigkeiten
- Projektgrundgerüst: Docker-Compose mit Frontend-, Backend- und Postgres-Container

### Ausstattungsmerkmale je Raum pflegen (Datenmodell + API)

- Typ: Feature
- Priorität: Hoch
- Schätzung: 2 Punkte

Migration legt Tabelle amenities und Zuordnungstabelle room_amenities an. API erweitert Raum-Anlegen/-Ändern um das Setzen und Entfernen von Ausstattungsmerkmalen; GET liefert die Merkmale je Raum mit. Tests für Zuordnen und Entfernen.

## Akzeptanzkriterien
- Beim Anlegen und Bearbeiten eines Raums lassen sich Ausstattungsmerkmale zuordnen
- GET /api/rooms bzw. Raumdetail liefert die zugeordneten Merkmale
- Ein zugeordnetes Merkmal lässt sich per API wieder entfernen
- Unit-Tests decken Zuordnen und Entfernen ab

## Voraussichtliche Dateien
- backend/src/db/migrations/002_amenities.sql
- backend/src/routes/rooms.ts
- backend/src/services/amenities.ts
- backend/test/amenities.test.ts

## Abhängigkeiten
- Datenmodell und API für Räume (Name, Standort, Kapazität)

### Frontend: Sidebar-Layout und Raumliste mit Tailwind/shadcn

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Frontend-Grundlayout mit dauerhafter Sidebar (aktiver Menüpunkt hervorgehoben, auf Mobil einklappbar) und einer Raumlisten-Seite im shadcn/ui-Stil. Die Liste lädt Räume vom Backend über relative Pfade (/api/rooms, ggf. via Proxy im Frontend-Container) und zeigt Name, Standort, Kapazität und Ausstattung. Zustände für Laden, leer und Fehler sind gestaltet.

## Akzeptanzkriterien
- Sidebar ist auf Desktop sichtbar, zeigt den aktiven Menüpunkt und klappt auf schmalen Breiten ein
- Raumliste zeigt alle Räume mit Name, Standort, Kapazität und Ausstattungsmerkmalen
- Lade-, Leer- und Fehlerzustand der Liste sind erkennbar gestaltet
- Client-Fetches verwenden nur relative /api-Pfade, keine Compose-Servicenamen

## Voraussichtliche Dateien
- frontend/src/App.tsx
- frontend/src/components/Sidebar.tsx
- frontend/src/pages/RoomList.tsx
- frontend/vite.config.ts

## Abhängigkeiten
- Ausstattungsmerkmale je Raum pflegen (Datenmodell + API)

### Frontend: Raum anlegen/bearbeiten und Filter nach Ausstattung

- Typ: Feature
- Priorität: Hoch
- Schätzung: 3 Punkte

Formular (shadcn/ui) zum Anlegen und Bearbeiten von Räumen mit Pflichtfeld-Prüfung für Name, Standort, Kapazität und Mehrfachauswahl der Ausstattung. Über der Raumliste ein Filterpanel mit Merkmal-Checkboxen; kombinierte Filterung zeigt nur Räume mit allen gewählten Merkmalen, ohne Filter alle Räume.

## Akzeptanzkriterien
- Neuer Raum lässt sich mit Name, Standort, Kapazität und Ausstattung anlegen und erscheint in der Liste
- Bestehender Raum lässt sich bearbeiten; Pflichtfelder werden clientseitig geprüft
- Filter nach einem Merkmal zeigt nur Räume mit dieser Ausstattung
- Kombinierte Filterung zeigt nur Räume, die alle gewählten Merkmale besitzen; ohne Filter alle Räume

## Voraussichtliche Dateien
- frontend/src/pages/RoomList.tsx
- frontend/src/pages/RoomForm.tsx
- frontend/src/components/AmenityFilter.tsx
- frontend/src/api/rooms.ts

## Abhängigkeiten
- Frontend: Sidebar-Layout und Raumliste mit Tailwind/shadcn
