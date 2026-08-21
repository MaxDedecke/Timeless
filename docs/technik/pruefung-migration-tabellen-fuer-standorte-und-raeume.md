# Automatische Prüfung: Migration: Tabellen für Standorte und Räume

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit 0
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
added 132 packages in 1s
__SCRUMY_CHECK__ install exit=0

> timeless-backend@0.1.0 test
> node --import tsx --test test/*.test.ts

TAP version 13
# Subtest: DB-Konfiguration: Default-Host ist der Compose-Servicename postgres:5432
ok 1 - DB-Konfiguration: Default-Host ist der Compose-Servicename postgres:5432
  ---
  duration_ms: 1.036862
  type: 'test'
  ...
# Subtest: DB-Konfiguration: Env-Variablen überschreiben die Defaults
ok 2 - DB-Konfiguration: Env-Variablen überschreiben die Defaults
  ---
  duration_ms: 0.128157
  type: 'test'
  ...
# Subtest: Migration 001 existiert und enthält locations (id, name)
ok 3 - Migration 001 existiert und enthält locations (id, name)
  ---
  duration_ms: 9.029081
  type: 'test'
  ...
# Subtest: Migration 001 enthält rooms (id, name, location_id, capacity)
ok 4 - Migration 001 enthält rooms (id, name, location_id, capacity)
  ---
  duration_ms: 2.2179
  type: 'test'
  ...
# Subtest: rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
ok 5 - rooms.location_id ist per NOT NULL + Fremdschlüssel an locations gebunden
  ---
  duration_ms: 1.197472
  type: 'test'
  ...
# Subtest: DB-Integrationsteil übersprungen (keine Postgres erreichbar)
ok 6 - DB-Integrationsteil übersprungen (keine Postgres erreichbar)
  ---
  duration_ms: 0.37709
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 7 - GET /api/health liefert Status ok
  ---
  duration_ms: 21.31785
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 8 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 12.929354
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 914.460593
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
added 234 packages in 3s
__SCRUMY_CHECK__ install exit=0

> timeless-frontend@0.1.0 test
> vitest run


[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90m/workspaces/frontend[39m

 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 258[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 69[2mms[22m[39m

[2m Test Files [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m   Start at [22m 15:22:13
[2m   Duration [22m 1.29s[2m (transform 57ms, setup 0ms, collect 152ms, tests 327ms, environment 351ms, prepare 190ms)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 31 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:  0.28 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-CodyCg_F.css  [39m[1m[2m  7.38 kB[22m[1m[22m[2m │ gzip:  2.14 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-CdFlEV96.js   [39m[1m[2m144.68 kB[22m[1m[22m[2m │ gzip: 46.63 kB[22m
[32m✓ built in 956ms[39m
__SCRUMY_CHECK__ build exit=0

npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
```
