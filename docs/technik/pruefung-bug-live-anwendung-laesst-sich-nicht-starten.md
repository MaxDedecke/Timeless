# Automatische Prüfung: Bug: Live-Anwendung lässt sich nicht starten

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit 0
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
added 132 packages in 2s
__SCRUMY_CHECK__ install exit=0

> timeless-backend@0.1.0 test
> node --import tsx --test test/*.test.ts

TAP version 13
# Subtest: POST /api/rooms mit nicht als Liste übergebenen Merkmalen wird mit 400 abgelehnt
ok 1 - POST /api/rooms mit nicht als Liste übergebenen Merkmalen wird mit 400 abgelehnt
  ---
  duration_ms: 53.955513
  type: 'test'
  ...
# Subtest: PUT/PATCH /api/rooms/:id mit nicht als Liste übergebenen Merkmalen wird mit 400 abgelehnt
ok 2 - PUT/PATCH /api/rooms/:id mit nicht als Liste übergebenen Merkmalen wird mit 400 abgelehnt
  ---
  duration_ms: 7.574423
  type: 'test'
  ...
# Subtest: API-Integrationsteil übersprungen (keine Postgres erreichbar)
ok 3 - API-Integrationsteil übersprungen (keine Postgres erreichbar)
  ---
  duration_ms: 0.280177
  type: 'test'
  ...
# Subtest: DB-Konfiguration: Default-Host ist der Compose-Servicename postgres:5432
ok 4 - DB-Konfiguration: Default-Host ist der Compose-Servicename postgres:5432
  ---
  duration_ms: 1.736907
  type: 'test'
  ...
# Subtest: DB-Konfiguration: Env-Variablen überschreiben die Defaults
ok 5 - DB-Konfiguration: Env-Variablen überschreiben die Defaults
  ---
  duration_ms: 0.185336
  type: 'test'
  ...
# Subtest: POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
ok 6 - POST /api/locations ohne Namen wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 55.212687
  type: 'test'
  ...
# Subtest: PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
ok 7 - PUT /api/locations/:id mit leerem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 2.984208
  type: 'test'
  ...
# Subtest: PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
ok 8 - PATCH /api/locations/:id mit fehlendem Namen wird mit 400 abgelehnt
  ---
  duration_ms: 2.520748
  type: 'test'
  ...
# Subtest: API-Integrationsteil übersprungen (keine Postgres erreichbar)
ok 9 - API-Integrationsteil übersprungen (keine Postgres erreichbar)
  ---
  duration_ms: 0.28281
  type: 'test'
  ...
# Subtest: Migration 001 existiert und enthält locations (id, name)
ok 10 - Migration 001 existiert und enthält locations (id, name)
  ---
  duration_ms: 8.957871
  type: 'test'
  ...
# Subtest: Migration 001 enthält rooms (id, name, location_id, capacity)
ok 11 - Migration 001 enthält rooms (id, name, location_id, capacity)
  ---
  duration_ms: 2.561985
  type: 'test'
  ...
# Subtest: rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
ok 12 - rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
  ---
  duration_ms: 0.831798
  type: 'test'
  ...
# Subtest: DB-Integrationsteil übersprungen (keine Postgres erreichbar)
ok 13 - DB-Integrationsteil übersprungen (keine Postgres erreichbar)
  ---
  duration_ms: 0.221335
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 14 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 68.013131
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 15 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 5.302708
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 16 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 6.18199
  type: 'test'
  ...
# Error: getaddrinfo ENOTFOUND postgres
#     at /workspaces/backend/node_modules/pg-pool/index.js:45:11
#     at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
#     at async updateRoom (/workspaces/backend/src/services/rooms.ts:243:30)
#     at async patch (/workspaces/backend/src/routes/rooms.ts:64:14)
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 17 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 2.914993
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 18 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 19.303837
  type: 'test'
  ...
# Subtest: API-Integrationsteil übersprungen (keine Postgres erreichbar)
ok 19 - API-Integrationsteil übersprungen (keine Postgres erreichbar)
  ---
  duration_ms: 0.28247
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 20 - GET /api/health liefert Status ok
  ---
  duration_ms: 29.597783
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 21 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 15.741862
  type: 'test'
  ...
1..21
# tests 21
# suites 0
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2635.480726
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
added 277 packages in 4s
__SCRUMY_CHECK__ install exit=0

> timeless-frontend@0.1.0 test
> vitest run


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90m/workspaces/frontend[39m

 [32m✓[39m test/RoomList.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[90m 158[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[90m 190[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 262[2mms[22m[39m

[2m Test Files [22m [1m[32m4 passed[39m[22m[90m (4)[39m
[2m      Tests [22m [1m[32m11 passed[39m[22m[90m (11)[39m
[2m   Start at [22m 20:10:11
[2m   Duration [22m 2.88s[2m (transform 183ms, setup 0ms, collect 709ms, tests 618ms, environment 703ms, prepare 310ms)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 1834 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:  0.28 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-D219zErm.css  [39m[1m[2m 15.70 kB[22m[1m[22m[2m │ gzip:  4.09 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-B_7hioi7.js   [39m[1m[2m216.00 kB[22m[1m[22m[2m │ gzip: 68.93 kB[22m
[32m✓ built in 2.14s[39m
__SCRUMY_CHECK__ build exit=0

npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[90mstderr[2m | test/App.test.tsx[2m > [22m[2mApp-Shell[2m > [22m[2mrendert die Sidebar mit aktiven Menüpunkt auf der Startseite
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```
