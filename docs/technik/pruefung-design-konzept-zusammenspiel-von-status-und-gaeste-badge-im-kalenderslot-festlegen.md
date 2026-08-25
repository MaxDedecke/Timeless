# Automatische Prüfung: Design-Konzept: Zusammenspiel von Status- und Gäste-Badge im Kalenderslot festlegen

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (10409 Zeichen gekürzt)
 Fremdschlüssel abgelehnt
ok 46 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 8.463327
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 47 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 13.794052
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 48 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 17.247187
  type: 'test'
  ...
# Subtest: DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
ok 49 - DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
  ---
  duration_ms: 13.666587
  type: 'test'
  ...
# Subtest: DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
ok 50 - DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 6.042467
  type: 'test'
  ...
# Subtest: DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
ok 51 - DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
  ---
  duration_ms: 19.793249
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 52 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 56.164812
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 53 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 5.409553
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 54 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 14.155121
  type: 'test'
  ...
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 55 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 2.751697
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 56 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 19.210094
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 57 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 2.228305
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 58 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.42023
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 59 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 0.992209
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 60 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.844174
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 61 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.249693
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 62 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.073712
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 63 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 0.685196
  type: 'test'
  ...
# Subtest: POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
ok 64 - POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
  ---
  duration_ms: 31.394336
  type: 'test'
  ...
# Subtest: POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
ok 65 - POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
  ---
  duration_ms: 4.98613
  type: 'test'
  ...
# Subtest: PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
ok 66 - PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
  ---
  duration_ms: 18.147308
  type: 'test'
  ...
# Subtest: PATCH ändert nur die übergebenen Felder
ok 67 - PATCH ändert nur die übergebenen Felder
  ---
  duration_ms: 14.809203
  type: 'test'
  ...
# Subtest: PATCH mit leerem Körper lässt den Raum unverändert
ok 68 - PATCH mit leerem Körper lässt den Raum unverändert
  ---
  duration_ms: 9.116459
  type: 'test'
  ...
# Subtest: Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
ok 69 - Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
  ---
  duration_ms: 12.924663
  type: 'test'
  ...
# Subtest: PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
ok 70 - PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
  ---
  duration_ms: 6.606585
  type: 'test'
  ...
# Subtest: GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
ok 71 - GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
  ---
  duration_ms: 24.336348
  type: 'test'
  ...
# Subtest: Jede Form der Überschneidung schließt den Raum aus
ok 72 - Jede Form der Überschneidung schließt den Raum aus
  ---
  duration_ms: 55.383466
  type: 'test'
  ...
# Subtest: Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
ok 73 - Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
  ---
  duration_ms: 30.49106
  type: 'test'
  ...
# Subtest: Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
ok 74 - Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
  ---
  duration_ms: 46.485478
  type: 'test'
  ...
# Subtest: Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
ok 75 - Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
  ---
  duration_ms: 12.721492
  type: 'test'
  ...
# Subtest: Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
ok 76 - Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
  ---
  duration_ms: 2.724989
  type: 'test'
  ...
# Subtest: listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
ok 77 - listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
  ---
  duration_ms: 15.940113
  type: 'test'
  ...
# Subtest: listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
ok 78 - listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
  ---
  duration_ms: 0.532183
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 79 - GET /api/health liefert Status ok
  ---
  duration_ms: 26.613779
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 80 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 5.875247
  type: 'test'
  ...
1..80
# tests 80
# suites 0
# pass 80
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4773.320355
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
… (1059 Zeichen gekürzt)
msendet Raum, Datum, Start/Ende als UTC-ISO und Urheber an POST /api/bookings, schließt den Dialog und zeigt die neue Buchung im Kalender [33m408[2mms[22m[39m
 [32m✓[39m test/RoomSearch.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[33m 1499[2mms[22m[39m
   [33m[2m✓[22m[39m Freie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22möffnet den Dialog mit Treffer-Raum und filterübernommenem Zeitraum, sendet genau diesen an POST /api/bookings und nimmt den Raum aus der aktualisierten Trefferliste [33m618[2mms[22m[39m
   [33m[2m✓[22m[39m Freie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22mbleibt beim Konflikt (409) im offenen Dialog mit verständlicher Meldung stehen und lässt die Trefferliste unangetastet [33m437[2mms[22m[39m
   [33m[2m✓[22m[39m Freie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22mzeigt die über die Suche angelegte Buchung anschließend im Raumkalender des Raums [33m443[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[33m 500[2mms[22m[39m
 [32m✓[39m test/BookingStatusBadge.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 48[2mms[22m[39m
 [32m✓[39m test/format.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 3[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m9 tests[22m[2m)[22m[90m 7[2mms[22m[39m
 [32m✓[39m test/api/bookings.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 6[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 8[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 262[2mms[22m[39m

[2m Test Files [22m [1m[32m14 passed[39m[22m[90m (14)[39m
[2m      Tests [22m [1m[32m139 passed[39m[22m[90m (139)[39m
[2m   Start at [22m 10:51:27
[2m   Duration [22m 22.33s[2m (transform 882ms, setup 1.47s, collect 4.05s, tests 8.54s, environment 4.77s, prepare 1.14s)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

__SCRUMY_CHECK__ lint exit=0

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 1910 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.41 kB[22m[1m[22m[2m │ gzip:   0.28 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-DsiKcsQo.css  [39m[1m[2m 22.63 kB[22m[1m[22m[2m │ gzip:   5.09 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-BgaP5GPI.js   [39m[1m[2m361.36 kB[22m[1m[22m[2m │ gzip: 106.94 kB[22m
[32m✓ built in 3.43s[39m
__SCRUMY_CHECK__ build exit=0

npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
[90mstderr[2m | test/DayView.test.tsx[2m > [22m[2mTagesansicht – Standortfilterung per URL[2m > [22m[2mlistet unter /day/:locationId nur die Räume dieses Standorts
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomList.test.tsx[2m > [22m[2mRoomList – Zustände[2m > [22m[2mzeigt Skeleton beim Laden
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomCalendar.test.tsx[2m > [22m[2mRoomCalendar – Belegfall[2m > [22m[2mzeigt die Buchungen des Raums zeitlich geordnet mit Start-/Endzeit und Status-Badge
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomForm.test.tsx[2m > [22m[2mRoomForm – Submit-Fehleranzeige (Reject-Case)[2m > [22m[2mzeigt einen Backend-400 als destructives Alert über dem Formular und aktiviert den Button danach wieder
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/BookingForm.test.tsx[2m > [22m[2mBookingForm – Erfolgsfall[2m > [22m[2msendet Raum, Datum, Start/Ende als UTC-ISO und Urheber an POST /api/bookings, schließt den Dialog und zeigt die neue Buchung im Kalender
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/RoomSearch.test.tsx[2m > [22m[2mFreie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22m[2möffnet den Dialog mit Treffer-Raum und filterübernommenem Zeitraum, sendet genau diesen an POST /api/bookings und nimmt den Raum aus der aktualisierten Trefferliste
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.

[90mstderr[2m | test/App.test.tsx[2m > [22m[2mApp-Shell[2m > [22m[2mleitet die Wurzelroute „/“ auf die Raumliste (/rooms) weiter
[22m[39m⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
```
