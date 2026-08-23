# Automatische Prüfung: Tagesansicht: Tests und Browser-Verifikation

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (5109 Zeichen gekürzt)
1 bis 003
  ---
  duration_ms: 24.913388
  type: 'test'
  ...
# Subtest: Jede Instanz erhält ein frisches Schema; Instanzen beeinflussen sich nicht gegenseitig
ok 23 - Jede Instanz erhält ein frisches Schema; Instanzen beeinflussen sich nicht gegenseitig
  ---
  duration_ms: 17.680258
  type: 'test'
  ...
# Subtest: Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
ok 24 - Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
  ---
  duration_ms: 4.744038
  type: 'test'
  ...
# Subtest: InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
ok 25 - InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
  ---
  duration_ms: 2.22729
  type: 'test'
  ...
# Subtest: POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
ok 26 - POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 51.350067
  type: 'test'
  ...
# Subtest: PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
ok 27 - PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 3.183869
  type: 'test'
  ...
# Subtest: PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
ok 28 - PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 2.157094
  type: 'test'
  ...
# Subtest: Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
ok 29 - Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
  ---
  duration_ms: 1.325587
  type: 'test'
  ...
# Subtest: Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 30 - Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.713042
  type: 'test'
  ...
# Subtest: Migration 001 existiert und enthält locations (id, name)
ok 31 - Migration 001 existiert und enthält locations (id, name)
  ---
  duration_ms: 8.232918
  type: 'test'
  ...
# Subtest: Migration 001 enthält rooms (id, name, location_id, capacity)
ok 32 - Migration 001 enthält rooms (id, name, location_id, capacity)
  ---
  duration_ms: 0.985538
  type: 'test'
  ...
# Subtest: rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
ok 33 - rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
  ---
  duration_ms: 0.687247
  type: 'test'
  ...
# Subtest: Migration 003 existiert und enthält bookings mit allen Pflichtspalten
ok 34 - Migration 003 existiert und enthält bookings mit allen Pflichtspalten
  ---
  duration_ms: 0.807623
  type: 'test'
  ...
# Subtest: bookings.room_id ist NOT NULL, per FK an rooms gebunden und Löschverhalten ist definiert
ok 35 - bookings.room_id ist NOT NULL, per FK an rooms gebunden und Löschverhalten ist definiert
  ---
  duration_ms: 0.538011
  type: 'test'
  ...
# Subtest: DB: Migration läuft auf frischer In-Memory-Instanz an und erzeugt die Tabellen
ok 36 - DB: Migration läuft auf frischer In-Memory-Instanz an und erzeugt die Tabellen
  ---
  duration_ms: 82.582766
  type: 'test'
  ...
# Subtest: DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
ok 37 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 10.249898
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 38 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 14.400789
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 39 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 18.257144
  type: 'test'
  ...
# Subtest: DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
ok 40 - DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
  ---
  duration_ms: 17.285455
  type: 'test'
  ...
# Subtest: DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
ok 41 - DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 8.397045
  type: 'test'
  ...
# Subtest: DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
ok 42 - DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
  ---
  duration_ms: 19.556064
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 43 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 51.851208
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 44 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.547898
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 45 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 4.930306
  type: 'test'
  ...
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 46 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 2.013346
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 47 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 16.976168
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 48 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 1.349319
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 49 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.341952
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 50 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 0.689169
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 51 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.676923
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 52 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.462087
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 53 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.108299
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 54 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 0.647012
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 55 - GET /api/health liefert Status ok
  ---
  duration_ms: 24.861206
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 56 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 5.588904
  type: 'test'
  ...
1..56
# tests 56
# suites 0
# pass 56
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3940.072783
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

 [32m✓[39m test/RoomList.test.tsx [2m([22m[2m19 tests[22m[2m)[22m[33m 793[2mms[22m[39m
 [32m✓[39m test/DayView.test.tsx [2m([22m[2m17 tests[22m[2m)[22m[33m 569[2mms[22m[39m
 [32m✓[39m test/RoomCalendar.test.tsx [2m([22m[2m11 tests[22m[2m)[22m[33m 653[2mms[22m[39m
 [32m✓[39m test/RoomForm.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[33m 667[2mms[22m[39m
 [32m✓[39m test/TimeGrid.test.tsx [2m([22m[2m12 tests[22m[2m)[22m[90m 147[2mms[22m[39m
 [32m✓[39m test/BookingStatusBadge.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 38[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 218[2mms[22m[39m
 [32m✓[39m test/format.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m test/api/bookings.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 254[2mms[22m[39m

[2m Test Files [22m [1m[32m12 passed[39m[22m[90m (12)[39m
[2m      Tests [22m [1m[32m98 passed[39m[22m[90m (98)[39m
[2m   Start at [22m 15:56:27
[2m   Duration [22m 10.50s[2m (transform 354ms, setup 0ms, collect 2.24s, tests 3.37s, environment 2.59s, prepare 753ms)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 1857 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:  0.28 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-BKtQo6Cw.css  [39m[1m[2m 18.15 kB[22m[1m[22m[2m │ gzip:  4.56 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-C1DdAy4J.js   [39m[1m[2m265.30 kB[22m[1m[22m[2m │ gzip: 81.61 kB[22m
[32m✓ built in 2.32s[39m
__SCRUMY_CHECK__ build exit=0

npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[90mstderr[2m | test/RoomList.test.tsx[2m > [22m[2mRoomList – Zustände[2m > [22m[2mzeigt Skeleton beim Laden
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/DayView.test.tsx[2m > [22m[2mTagesansicht – Standortfilterung per URL[2m > [22m[2mlistet unter /day/:locationId nur die Räume dieses Standorts
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomCalendar.test.tsx[2m > [22m[2mRoomCalendar – Belegfall[2m > [22m[2mzeigt die Buchungen des Raums zeitlich geordnet mit Start-/Endzeit und Status-Badge
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomForm.test.tsx[2m > [22m[2mRoomForm – Submit-Fehleranzeige (Reject-Case)[2m > [22m[2mzeigt einen Backend-400 als destructives Alert über dem Formular und aktiviert den Button danach wieder
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/App.test.tsx[2m > [22m[2mApp-Shell[2m > [22m[2mrendert die Sidebar mit aktiven Menüpunkt auf der Startseite
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```
