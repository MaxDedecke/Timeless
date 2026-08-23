# Automatische Prüfung: Design-Konzept: Etablierte Zustands-Muster aus RoomList und RoomForm als verbindliche Referenz dokumentieren

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (4293 Zeichen gekürzt)
tztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
ok 19 - Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
  ---
  duration_ms: 5.694901
  type: 'test'
  ...
# Subtest: InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
ok 20 - InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
  ---
  duration_ms: 2.069347
  type: 'test'
  ...
# Subtest: POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
ok 21 - POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 39.168212
  type: 'test'
  ...
# Subtest: PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
ok 22 - PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 2.615369
  type: 'test'
  ...
# Subtest: PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
ok 23 - PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 2.076406
  type: 'test'
  ...
# Subtest: Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
ok 24 - Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
  ---
  duration_ms: 1.262092
  type: 'test'
  ...
# Subtest: Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 25 - Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.563548
  type: 'test'
  ...
# Subtest: Migration 001 existiert und enthält locations (id, name)
ok 26 - Migration 001 existiert und enthält locations (id, name)
  ---
  duration_ms: 8.528813
  type: 'test'
  ...
# Subtest: Migration 001 enthält rooms (id, name, location_id, capacity)
ok 27 - Migration 001 enthält rooms (id, name, location_id, capacity)
  ---
  duration_ms: 1.002164
  type: 'test'
  ...
# Subtest: rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
ok 28 - rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
  ---
  duration_ms: 0.646502
  type: 'test'
  ...
# Subtest: Migration 003 existiert und enthält bookings mit allen Pflichtspalten
ok 29 - Migration 003 existiert und enthält bookings mit allen Pflichtspalten
  ---
  duration_ms: 0.991098
  type: 'test'
  ...
# Subtest: bookings.room_id ist NOT NULL, per FK an rooms gebunden und Löschverhalten ist definiert
ok 30 - bookings.room_id ist NOT NULL, per FK an rooms gebunden und Löschverhalten ist definiert
  ---
  duration_ms: 0.937124
  type: 'test'
  ...
# Subtest: DB: Migration läuft auf frischer In-Memory-Instanz an und erzeugt die Tabellen
ok 31 - DB: Migration läuft auf frischer In-Memory-Instanz an und erzeugt die Tabellen
  ---
  duration_ms: 70.933065
  type: 'test'
  ...
# Subtest: DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
ok 32 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 9.69374
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 33 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 17.93179
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 34 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 19.103158
  type: 'test'
  ...
# Subtest: DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
ok 35 - DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
  ---
  duration_ms: 15.996509
  type: 'test'
  ...
# Subtest: DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
ok 36 - DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 6.819161
  type: 'test'
  ...
# Subtest: DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
ok 37 - DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
  ---
  duration_ms: 22.686313
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 38 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 45.2245
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 39 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.287748
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 40 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 4.588314
  type: 'test'
  ...
# Error: getaddrinfo ENOTFOUND postgres
#     at /workspaces/backend/node_modules/pg-pool/index.js:45:11
#     at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
#     at async updateRoom (/workspaces/backend/src/services/rooms.ts:243:30)
#     at async patch (/workspaces/backend/src/routes/rooms.ts:64:14)
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 41 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 1.824247
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 42 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 16.899805
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 43 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 1.631812
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 44 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.428521
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 45 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 0.751818
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 46 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.743406
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 47 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.520829
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 48 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.096684
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 49 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 0.690362
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 50 - GET /api/health liefert Status ok
  ---
  duration_ms: 19.418582
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 51 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 5.076597
  type: 'test'
  ...
1..51
# tests 51
# suites 0
# pass 51
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3629.538617
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

 [32m✓[39m test/RoomList.test.tsx [2m([22m[2m17 tests[22m[2m)[22m[33m 749[2mms[22m[39m
 [32m✓[39m test/RoomForm.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[33m 648[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 222[2mms[22m[39m
 [32m✓[39m test/format.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 11[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 247[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m43 passed[39m[22m[90m (43)[39m
[2m   Start at [22m 10:33:24
[2m   Duration [22m 5.80s[2m (transform 225ms, setup 0ms, collect 1.15s, tests 1.89s, environment 1.36s, prepare 472ms)[22m

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
[2mdist/[22m[2massets/[22m[35mindex-BixMdytx.css  [39m[1m[2m 17.14 kB[22m[1m[22m[2m │ gzip:  4.41 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-B-M_fHTy.js   [39m[1m[2m242.54 kB[22m[1m[22m[2m │ gzip: 76.45 kB[22m
[32m✓ built in 2.08s[39m
__SCRUMY_CHECK__ build exit=0

npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[90mstderr[2m | test/RoomList.test.tsx[2m > [22m[2mRoomList – Zustände[2m > [22m[2mzeigt Skeleton beim Laden
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomForm.test.tsx[2m > [22m[2mRoomForm – Submit-Fehleranzeige (Reject-Case)[2m > [22m[2mzeigt einen Backend-400 als destructives Alert über dem Formular und aktiviert den Button danach wieder
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/App.test.tsx[2m > [22m[2mApp-Shell[2m > [22m[2mrendert die Sidebar mit aktiven Menüpunkt auf der Startseite
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```
