# Automatische Prüfung: FakeDbSession entfernen und Gesamtsuite final prüfen

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (1240 Zeichen gekürzt)
Db: CREATE TABLE/INSERT/SELECT-Roundtrip mit Identity und Parameter-Binding
ok 6 - InMemoryDb: CREATE TABLE/INSERT/SELECT-Roundtrip mit Identity und Parameter-Binding
  ---
  duration_ms: 48.202663
  type: 'test'
  ...
# Subtest: InMemoryDb: Transaktionen über connect() – COMMIT hält, ROLLBACK macht rückgängig
ok 7 - InMemoryDb: Transaktionen über connect() – COMMIT hält, ROLLBACK macht rückgängig
  ---
  duration_ms: 6.005436
  type: 'test'
  ...
# Subtest: InMemoryDb: Abfrage gegen nicht existierende Tabelle führt zu einem verständlichen Fehler
ok 8 - InMemoryDb: Abfrage gegen nicht existierende Tabelle führt zu einem verständlichen Fehler
  ---
  duration_ms: 3.871072
  type: 'test'
  ...
# Subtest: applyMigrations erzeugt alle Tabellen aus 001 und 002
ok 9 - applyMigrations erzeugt alle Tabellen aus 001 und 002
  ---
  duration_ms: 19.677493
  type: 'test'
  ...
# Subtest: Jede Instanz erhält ein frisches Schema; Instanzen beeinflussen sich nicht gegenseitig
ok 10 - Jede Instanz erhält ein frisches Schema; Instanzen beeinflussen sich nicht gegenseitig
  ---
  duration_ms: 18.197561
  type: 'test'
  ...
# Subtest: Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
ok 11 - Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
  ---
  duration_ms: 3.930063
  type: 'test'
  ...
# Subtest: InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
ok 12 - InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
  ---
  duration_ms: 3.106457
  type: 'test'
  ...
# Subtest: POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
ok 13 - POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 37.118439
  type: 'test'
  ...
# Subtest: PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
ok 14 - PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 2.674731
  type: 'test'
  ...
# Subtest: PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
ok 15 - PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 1.853559
  type: 'test'
  ...
# Subtest: Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
ok 16 - Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
  ---
  duration_ms: 1.09482
  type: 'test'
  ...
# Subtest: Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 17 - Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.718601
  type: 'test'
  ...
# Subtest: Migration 001 existiert und enthält locations (id, name)
ok 18 - Migration 001 existiert und enthält locations (id, name)
  ---
  duration_ms: 7.446646
  type: 'test'
  ...
# Subtest: Migration 001 enthält rooms (id, name, location_id, capacity)
ok 19 - Migration 001 enthält rooms (id, name, location_id, capacity)
  ---
  duration_ms: 1.111002
  type: 'test'
  ...
# Subtest: rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
ok 20 - rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
  ---
  duration_ms: 0.678157
  type: 'test'
  ...
# Subtest: DB: Migration läuft auf frischer In-Memory-Instanz an und erzeugt die Tabellen
ok 21 - DB: Migration läuft auf frischer In-Memory-Instanz an und erzeugt die Tabellen
  ---
  duration_ms: 77.941509
  type: 'test'
  ...
# Subtest: DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
ok 22 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 8.197462
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 23 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 11.966513
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 24 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 20.211198
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 25 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 50.048912
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 26 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.918426
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 27 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 5.16716
  type: 'test'
  ...
# Error: getaddrinfo ENOTFOUND postgres
#     at /workspaces/backend/node_modules/pg-pool/index.js:45:11
#     at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
#     at async updateRoom (/workspaces/backend/src/services/rooms.ts:243:30)
#     at async patch (/workspaces/backend/src/routes/rooms.ts:64:14)
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 28 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 2.141415
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 29 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 17.07399
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 30 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 1.315154
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 31 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.305202
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 32 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 0.540455
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 33 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.985931
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 34 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.533936
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 35 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.139912
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 36 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 1.019797
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 37 - GET /api/health liefert Status ok
  ---
  duration_ms: 28.168429
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 38 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 5.663675
  type: 'test'
  ...
1..38
# tests 38
# suites 0
# pass 38
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3021.539961
__SCRUMY_CHECK__ test exit=0

> timeless-backend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-backend@0.1.0 build
> tsc -p tsconfig.build.json

__SCRUMY_CHECK__ build exit=0
```

### frontend
npm ci/install: exit 0
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
added 279 packages in 4s
__SCRUMY_CHECK__ install exit=0

> timeless-frontend@0.1.0 test
> vitest run


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90m/workspaces/frontend[39m

 [32m✓[39m test/RoomList.test.tsx [2m([22m[2m16 tests[22m[2m)[22m[33m 712[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 219[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 13[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 257[2mms[22m[39m

[2m Test Files [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m      Tests [22m [1m[32m31 passed[39m[22m[90m (31)[39m
[2m   Start at [22m 00:39:32
[2m   Duration [22m 3.76s[2m (transform 240ms, setup 0ms, collect 828ms, tests 1.21s, environment 656ms, prepare 394ms)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 1851 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:  0.28 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-R-CJwcnt.css  [39m[1m[2m 17.17 kB[22m[1m[22m[2m │ gzip:  4.41 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-DWqUqcyM.js   [39m[1m[2m242.23 kB[22m[1m[22m[2m │ gzip: 76.41 kB[22m
[32m✓ built in 2.11s[39m
__SCRUMY_CHECK__ build exit=0

npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[90mstderr[2m | test/RoomList.test.tsx[2m > [22m[2mRoomList – Zustände[2m > [22m[2mzeigt Skeleton beim Laden
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/App.test.tsx[2m > [22m[2mApp-Shell[2m > [22m[2mrendert die Sidebar mit aktiven Menüpunkt auf der Startseite
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```
