# Automatische Prüfung: InMemoryDb-Klasse mit pg-mem als Test-Naht

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 1
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (2054 Zeichen gekürzt)
s 001 und 002
  ---
  duration_ms: 18.161371
  type: 'test'
  ...
# Subtest: Jede Instanz erhält ein frisches Schema; Instanzen beeinflussen sich nicht gegenseitig
ok 10 - Jede Instanz erhält ein frisches Schema; Instanzen beeinflussen sich nicht gegenseitig
  ---
  duration_ms: 15.715327
  type: 'test'
  ...
# Subtest: Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
ok 11 - Nicht unterstütztes SQL bricht mit klarer, lokalisierbarer Fehlermeldung ab
  ---
  duration_ms: 4.330534
  type: 'test'
  ...
# Subtest: InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
ok 12 - InMemoryDb: Service-Muster – Fehler nach BEGIN macht den Schreibversuch rückgängig
  ---
  duration_ms: 3.266825
  type: 'test'
  ...
# Subtest: POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
ok 13 - POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 38.43118
  type: 'test'
  ...
# Subtest: PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
ok 14 - PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 3.133912
  type: 'test'
  ...
# Subtest: PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
ok 15 - PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 2.383046
  type: 'test'
  ...
# Subtest: Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
ok 16 - Standort anlegen: createLocation schreibt den Namen und der Standort ist anschließend abrufbar
  ---
  duration_ms: 1.395375
  type: 'test'
  ...
# Subtest: Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 17 - Standort ohne Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.686227
  type: 'test'
  ...
# Subtest: Migration 001 existiert und enthält locations (id, name)
ok 18 - Migration 001 existiert und enthält locations (id, name)
  ---
  duration_ms: 9.011871
  type: 'test'
  ...
# Subtest: Migration 001 enthält rooms (id, name, location_id, capacity)
ok 19 - Migration 001 enthält rooms (id, name, location_id, capacity)
  ---
  duration_ms: 1.802006
  type: 'test'
  ...
# Subtest: rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
ok 20 - rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
  ---
  duration_ms: 0.747131
  type: 'test'
  ...
# Subtest: DB-Integrationsteil übersprungen (keine Postgres erreichbar)
ok 21 - DB-Integrationsteil übersprungen (keine Postgres erreichbar)
  ---
  duration_ms: 0.198313
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 22 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 46.957659
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 23 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.228253
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 24 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 6.390645
  type: 'test'
  ...
# Error: getaddrinfo ENOTFOUND postgres
#     at /workspaces/backend/node_modules/pg-pool/index.js:45:11
#     at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
#     at async updateRoom (/workspaces/backend/src/services/rooms.ts:243:30)
#     at async patch (/workspaces/backend/src/routes/rooms.ts:64:14)
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 25 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 3.132461
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 26 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 27.1865
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 27 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 2.466102
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 28 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.613486
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
not ok 29 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 4.492426
  type: 'test'
  location: '/workspaces/backend/test/rooms.test.ts:1:6645'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:
    
    0 !== 1
    
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 1
  actual: 0
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (/workspaces/backend/test/rooms.test.ts:351:12)
    process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    async Test.run (node:internal/test_runner/test:1054:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 30 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 1.207766
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 31 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.847989
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 32 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.211091
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
not ok 33 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 1.795686
  type: 'test'
  location: '/workspaces/backend/test/rooms.test.ts:1:8628'
  failureType: 'testCodeFailure'
  error: 'Der Standort muss im UPDATE gesetzt werden'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected:
  actual: 'UPDATE rooms SET location_id = $1, capacity = $2 WHERE id = 3'
  operator: 'match'
  stack: |-
    FakePool.responder (/workspaces/backend/test/rooms.test.ts:439:16)
    FakePool.dispatch (/workspaces/backend/test/helpers/fake-pool.ts:92:25)
    FakePoolClient.query (/workspaces/backend/test/helpers/fake-pool.ts:63:22)
    updateRoom (/workspaces/backend/src/services/rooms.ts:284:20)
    process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    async TestContext.<anonymous> (/workspaces/backend/test/rooms.test.ts:471:21)
    async Test.run (node:internal/test_runner/test:1054:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
  ...
# Subtest: GET /api/health liefert Status ok
ok 34 - GET /api/health liefert Status ok
  ---
  duration_ms: 16.546023
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 35 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 7.417982
  type: 'test'
  ...
1..35
# tests 35
# suites 0
# pass 33
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2783.4239
__SCRUMY_CHECK__ test exit=1

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

 [32m✓[39m test/RoomList.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[33m 459[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 268[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 13[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 267[2mms[22m[39m

[2m Test Files [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m      Tests [22m [1m[32m23 passed[39m[22m[90m (23)[39m
[2m   Start at [22m 18:47:56
[2m   Duration [22m 3.78s[2m (transform 282ms, setup 0ms, collect 897ms, tests 1.01s, environment 734ms, prepare 425ms)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 1848 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:  0.28 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-_sb4qj-7.css  [39m[1m[2m 16.47 kB[22m[1m[22m[2m │ gzip:  4.26 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-HU36SrHu.js   [39m[1m[2m233.40 kB[22m[1m[22m[2m │ gzip: 74.41 kB[22m
[32m✓ built in 2.31s[39m
__SCRUMY_CHECK__ build exit=0

npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[90mstderr[2m | test/App.test.tsx[2m > [22m[2mApp-Shell[2m > [22m[2mrendert die Sidebar mit aktiven Menüpunkt auf der Startseite
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```
