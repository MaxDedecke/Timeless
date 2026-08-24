# Automatische Prüfung: Doppelt abgeschlossene Sprint-7-Tickets auf Code-Dubletten prüfen und vereinheitlichen

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (8290 Zeichen gekürzt)
om Fremdschlüssel abgelehnt
ok 37 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 8.213798
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 38 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 13.450672
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 39 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 18.12534
  type: 'test'
  ...
# Subtest: DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
ok 40 - DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
  ---
  duration_ms: 14.961445
  type: 'test'
  ...
# Subtest: DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
ok 41 - DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 6.733297
  type: 'test'
  ...
# Subtest: DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
ok 42 - DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
  ---
  duration_ms: 16.757912
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 43 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 47.353311
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 44 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.03813
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 45 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 9.581855
  type: 'test'
  ...
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 46 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 1.665166
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 47 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 15.977006
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 48 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 1.740461
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 49 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.350463
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 50 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 0.843413
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 51 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.739972
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 52 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.244847
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 53 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.063498
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 54 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 0.616139
  type: 'test'
  ...
# Subtest: POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
ok 55 - POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
  ---
  duration_ms: 29.436139
  type: 'test'
  ...
# Subtest: POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
ok 56 - POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
  ---
  duration_ms: 5.318625
  type: 'test'
  ...
# Subtest: PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
ok 57 - PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
  ---
  duration_ms: 16.691311
  type: 'test'
  ...
# Subtest: PATCH ändert nur die übergebenen Felder
ok 58 - PATCH ändert nur die übergebenen Felder
  ---
  duration_ms: 13.871281
  type: 'test'
  ...
# Subtest: PATCH mit leerem Körper lässt den Raum unverändert
ok 59 - PATCH mit leerem Körper lässt den Raum unverändert
  ---
  duration_ms: 8.880418
  type: 'test'
  ...
# Subtest: Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
ok 60 - Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
  ---
  duration_ms: 11.787198
  type: 'test'
  ...
# Subtest: PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
ok 61 - PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
  ---
  duration_ms: 5.102638
  type: 'test'
  ...
# Subtest: GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
ok 62 - GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
  ---
  duration_ms: 18.111059
  type: 'test'
  ...
# Subtest: Jede Form der Überschneidung schließt den Raum aus
ok 63 - Jede Form der Überschneidung schließt den Raum aus
  ---
  duration_ms: 52.391809
  type: 'test'
  ...
# Subtest: Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
ok 64 - Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
  ---
  duration_ms: 28.270892
  type: 'test'
  ...
# Subtest: Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
ok 65 - Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
  ---
  duration_ms: 28.59691
  type: 'test'
  ...
# Subtest: Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
ok 66 - Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
  ---
  duration_ms: 11.280539
  type: 'test'
  ...
# Subtest: Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
ok 67 - Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
  ---
  duration_ms: 2.415711
  type: 'test'
  ...
# Subtest: listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
ok 68 - listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
  ---
  duration_ms: 14.012486
  type: 'test'
  ...
# Subtest: listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
ok 69 - listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
  ---
  duration_ms: 0.764674
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 70 - GET /api/health liefert Status ok
  ---
  duration_ms: 20.06924
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 71 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 5.270629
  type: 'test'
  ...
1..71
# tests 71
# suites 0
# pass 71
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4309.406329
__SCRUMY_CHECK__ test exit=0

> timeless-backend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-backend@0.1.0 build
> tsc -p tsconfig.build.json

__SCRUMY_CHECK__ build exit=0
```

### frontend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (415 Zeichen gekürzt)
test.tsx [2m([22m[2m13 tests[22m[2m)[22m[33m 818[2mms[22m[39m
 [32m✓[39m test/BookingForm.test.tsx [2m([22m[2m5 tests[22m[2m)[22m[33m 844[2mms[22m[39m
   [33m[2m✓[22m[39m BookingForm – Erfolgsfall[2m > [22msendet Raum, Datum, Start/Ende als UTC-ISO und Urheber an POST /api/bookings, schließt den Dialog und zeigt die neue Buchung im Kalender [33m320[2mms[22m[39m
 [32m✓[39m test/RoomSearch.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[33m 676[2mms[22m[39m
   [33m[2m✓[22m[39m Freie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22möffnet den Dialog mit Treffer-Raum und filterübernommenem Zeitraum, sendet genau diesen an POST /api/bookings und nimmt den Raum aus der aktualisierten Trefferliste [33m343[2mms[22m[39m
 [32m✓[39m test/RoomForm.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[33m 580[2mms[22m[39m
 [32m✓[39m test/TimeGrid.test.tsx [2m([22m[2m12 tests[22m[2m)[22m[90m 168[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[33m 348[2mms[22m[39m
 [32m✓[39m test/BookingStatusBadge.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 43[2mms[22m[39m
 [32m✓[39m test/format.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 12[2mms[22m[39m
 [32m✓[39m test/api/bookings.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 13[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 11[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 268[2mms[22m[39m

[2m Test Files [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m      Tests [22m [1m[32m112 passed[39m[22m[90m (112)[39m
[2m   Start at [22m 09:48:51
[2m   Duration [22m 14.84s[2m (transform 397ms, setup 0ms, collect 3.16s, tests 5.22s, environment 3.56s, prepare 916ms)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 1905 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:  0.28 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-DXsjemrT.css  [39m[1m[2m 20.39 kB[22m[1m[22m[2m │ gzip:  4.85 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-BsMSkQt3.js   [39m[1m[2m307.59 kB[22m[1m[22m[2m │ gzip: 94.09 kB[22m
[32m✓ built in 2.59s[39m
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

[90mstderr[2m | test/BookingForm.test.tsx[2m > [22m[2mBookingForm – Erfolgsfall[2m > [22m[2msendet Raum, Datum, Start/Ende als UTC-ISO und Urheber an POST /api/bookings, schließt den Dialog und zeigt die neue Buchung im Kalender
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomSearch.test.tsx[2m > [22m[2mFreie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22m[2möffnet den Dialog mit Treffer-Raum und filterübernommenem Zeitraum, sendet genau diesen an POST /api/bookings und nimmt den Raum aus der aktualisierten Trefferliste
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomForm.test.tsx[2m > [22m[2mRoomForm – Submit-Fehleranzeige (Reject-Case)[2m > [22m[2mzeigt einen Backend-400 als destructives Alert über dem Formular und aktiviert den Button danach wieder
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/App.test.tsx[2m > [22m[2mApp-Shell[2m > [22m[2mleitet die Wurzelroute „/“ auf die Raumliste (/rooms) weiter
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```
