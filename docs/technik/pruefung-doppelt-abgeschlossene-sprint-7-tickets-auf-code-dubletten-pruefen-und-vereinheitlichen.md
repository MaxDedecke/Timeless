# Automatische Prüfung: Doppelt abgeschlossene Sprint-7-Tickets auf Code-Dubletten prüfen und vereinheitlichen

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 1
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (9133 Zeichen gekürzt)
m Fremdschlüssel abgelehnt
ok 38 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 7.354947
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 39 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 11.324579
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 40 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 16.472194
  type: 'test'
  ...
# Subtest: DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
ok 41 - DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
  ---
  duration_ms: 15.255747
  type: 'test'
  ...
# Subtest: DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
ok 42 - DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 6.076295
  type: 'test'
  ...
# Subtest: DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
ok 43 - DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
  ---
  duration_ms: 18.508041
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 44 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 47.889708
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 45 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.503748
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 46 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 10.146656
  type: 'test'
  ...
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 47 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 1.971607
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 48 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 17.059954
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 49 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 1.615517
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 50 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.327782
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 51 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 0.780625
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 52 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.78385
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 53 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.265367
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 54 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.06512
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 55 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 0.613285
  type: 'test'
  ...
# Subtest: POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
ok 56 - POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
  ---
  duration_ms: 42.454186
  type: 'test'
  ...
# Subtest: POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
ok 57 - POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
  ---
  duration_ms: 6.82692
  type: 'test'
  ...
# Subtest: PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
ok 58 - PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
  ---
  duration_ms: 21.512582
  type: 'test'
  ...
# Subtest: PATCH ändert nur die übergebenen Felder
ok 59 - PATCH ändert nur die übergebenen Felder
  ---
  duration_ms: 16.985251
  type: 'test'
  ...
# Subtest: PATCH mit leerem Körper lässt den Raum unverändert
ok 60 - PATCH mit leerem Körper lässt den Raum unverändert
  ---
  duration_ms: 9.560438
  type: 'test'
  ...
# Subtest: Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
ok 61 - Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
  ---
  duration_ms: 11.553084
  type: 'test'
  ...
# Subtest: PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
ok 62 - PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
  ---
  duration_ms: 4.837097
  type: 'test'
  ...
# Subtest: GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
ok 63 - GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
  ---
  duration_ms: 20.501659
  type: 'test'
  ...
# Subtest: Jede Form der Überschneidung schließt den Raum aus
ok 64 - Jede Form der Überschneidung schließt den Raum aus
  ---
  duration_ms: 60.89219
  type: 'test'
  ...
# Subtest: Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
ok 65 - Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
  ---
  duration_ms: 33.020062
  type: 'test'
  ...
# Subtest: Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
ok 66 - Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
  ---
  duration_ms: 32.193463
  type: 'test'
  ...
# Subtest: Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
ok 67 - Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
  ---
  duration_ms: 13.439424
  type: 'test'
  ...
# Subtest: Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
ok 68 - Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
  ---
  duration_ms: 2.629383
  type: 'test'
  ...
# Subtest: listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
ok 69 - listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
  ---
  duration_ms: 17.957943
  type: 'test'
  ...
# Subtest: listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
ok 70 - listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
  ---
  duration_ms: 0.912127
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 71 - GET /api/health liefert Status ok
  ---
  duration_ms: 28.608522
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 72 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 6.699244
  type: 'test'
  ...
1..72
# tests 72
# suites 0
# pass 71
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5989.287097
__SCRUMY_CHECK__ test exit=1

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
… (413 Zeichen gekürzt)
r.test.tsx [2m([22m[2m13 tests[22m[2m)[22m[33m 924[2mms[22m[39m
 [32m✓[39m test/BookingForm.test.tsx [2m([22m[2m5 tests[22m[2m)[22m[33m 925[2mms[22m[39m
   [33m[2m✓[22m[39m BookingForm – Erfolgsfall[2m > [22msendet Raum, Datum, Start/Ende als UTC-ISO und Urheber an POST /api/bookings, schließt den Dialog und zeigt die neue Buchung im Kalender [33m344[2mms[22m[39m
 [32m✓[39m test/RoomSearch.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[33m 717[2mms[22m[39m
   [33m[2m✓[22m[39m Freie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22möffnet den Dialog mit Treffer-Raum und filterübernommenem Zeitraum, sendet genau diesen an POST /api/bookings und nimmt den Raum aus der aktualisierten Trefferliste [33m360[2mms[22m[39m
 [32m✓[39m test/RoomForm.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[33m 674[2mms[22m[39m
 [32m✓[39m test/TimeGrid.test.tsx [2m([22m[2m12 tests[22m[2m)[22m[90m 161[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[33m 375[2mms[22m[39m
 [32m✓[39m test/BookingStatusBadge.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 45[2mms[22m[39m
 [32m✓[39m test/format.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 12[2mms[22m[39m
 [32m✓[39m test/api/bookings.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 5[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 257[2mms[22m[39m

[2m Test Files [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m      Tests [22m [1m[32m112 passed[39m[22m[90m (112)[39m
[2m   Start at [22m 09:34:56
[2m   Duration [22m 15.42s[2m (transform 376ms, setup 0ms, collect 3.25s, tests 5.61s, environment 3.67s, prepare 951ms)[22m

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
[32m✓ built in 2.41s[39m
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
