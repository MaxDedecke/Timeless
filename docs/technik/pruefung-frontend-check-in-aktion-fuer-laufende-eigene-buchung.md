# Automatische Prüfung: Frontend: Check-in-Aktion für laufende eigene Buchung

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (9948 Zeichen gekürzt)
 Fremdschlüssel abgelehnt
ok 44 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 9.913159
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 45 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 14.259336
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 46 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 20.98022
  type: 'test'
  ...
# Subtest: DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
ok 47 - DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
  ---
  duration_ms: 16.038191
  type: 'test'
  ...
# Subtest: DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
ok 48 - DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 8.020007
  type: 'test'
  ...
# Subtest: DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
ok 49 - DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
  ---
  duration_ms: 24.797108
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 50 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 53.975871
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 51 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.482114
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 52 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 11.931445
  type: 'test'
  ...
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 53 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 2.216078
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 54 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 17.225079
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 55 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 2.025074
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 56 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.395325
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 57 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 1.037993
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 58 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.867677
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 59 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.20359
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 60 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.063458
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 61 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 0.678436
  type: 'test'
  ...
# Subtest: POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
ok 62 - POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
  ---
  duration_ms: 37.465209
  type: 'test'
  ...
# Subtest: POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
ok 63 - POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
  ---
  duration_ms: 6.285924
  type: 'test'
  ...
# Subtest: PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
ok 64 - PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
  ---
  duration_ms: 25.521637
  type: 'test'
  ...
# Subtest: PATCH ändert nur die übergebenen Felder
ok 65 - PATCH ändert nur die übergebenen Felder
  ---
  duration_ms: 17.173007
  type: 'test'
  ...
# Subtest: PATCH mit leerem Körper lässt den Raum unverändert
ok 66 - PATCH mit leerem Körper lässt den Raum unverändert
  ---
  duration_ms: 9.271554
  type: 'test'
  ...
# Subtest: Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
ok 67 - Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
  ---
  duration_ms: 11.84847
  type: 'test'
  ...
# Subtest: PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
ok 68 - PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
  ---
  duration_ms: 5.069155
  type: 'test'
  ...
# Subtest: GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
ok 69 - GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
  ---
  duration_ms: 19.121997
  type: 'test'
  ...
# Subtest: Jede Form der Überschneidung schließt den Raum aus
ok 70 - Jede Form der Überschneidung schließt den Raum aus
  ---
  duration_ms: 53.371928
  type: 'test'
  ...
# Subtest: Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
ok 71 - Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
  ---
  duration_ms: 29.541655
  type: 'test'
  ...
# Subtest: Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
ok 72 - Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
  ---
  duration_ms: 30.961654
  type: 'test'
  ...
# Subtest: Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
ok 73 - Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
  ---
  duration_ms: 17.704941
  type: 'test'
  ...
# Subtest: Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
ok 74 - Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
  ---
  duration_ms: 2.684745
  type: 'test'
  ...
# Subtest: listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
ok 75 - listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
  ---
  duration_ms: 17.072939
  type: 'test'
  ...
# Subtest: listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
ok 76 - listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
  ---
  duration_ms: 0.679949
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 77 - GET /api/health liefert Status ok
  ---
  duration_ms: 28.905918
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 78 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 7.369639
  type: 'test'
  ...
1..78
# tests 78
# suites 0
# pass 78
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4563.604242
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
npm run lint: exit 2
npm run build: exit 2

Ausgabe:
```
… (613 Zeichen gekürzt)
rch.test.tsx [2m([22m[2m3 tests[22m[2m)[22m[33m 719[2mms[22m[39m
   [33m[2m✓[22m[39m Freie-Räume-Suche – Buchungseinstieg aus dem Treffer[2m > [22möffnet den Dialog mit Treffer-Raum und filterübernommenem Zeitraum, sendet genau diesen an POST /api/bookings und nimmt den Raum aus der aktualisierten Trefferliste [33m345[2mms[22m[39m
 [32m✓[39m test/RoomForm.test.tsx [2m([22m[2m4 tests[22m[2m)[22m[33m 681[2mms[22m[39m
 [32m✓[39m test/TimeGrid.test.tsx [2m([22m[2m12 tests[22m[2m)[22m[90m 175[2mms[22m[39m
 [32m✓[39m test/App.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[33m 375[2mms[22m[39m
 [32m✓[39m test/BookingStatusBadge.test.tsx [2m([22m[2m8 tests[22m[2m)[22m[90m 52[2mms[22m[39m
 [32m✓[39m test/format.test.ts [2m([22m[2m7 tests[22m[2m)[22m[90m 7[2mms[22m[39m
[90mstdout[2m | test/zz-sonner-probe.test.tsx[2m > [22m[2msonner probe[2m > [22m[2mrendert Toaster und zeigt einen Toast
[22m[39mbody: <div><section aria-label="Notifications alt+T" tabindex="-1" aria-live="polite" aria-relevant="additions text" aria-atomic="false" data-react-aria-top-layer="true"><ol dir="" tabindex="-1" data-sonner-toaster="true" data-sonner-theme="light" data-y-position="bottom" data-x-position="right" style="--

 [32m✓[39m test/zz-sonner-probe.test.tsx [2m([22m[2m1 test[22m[2m)[22m[90m 91[2mms[22m[39m
 [32m✓[39m test/api/rooms.test.ts [2m([22m[2m8 tests[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m test/api/bookings.test.ts [2m([22m[2m5 tests[22m[2m)[22m[90m 9[2mms[22m[39m
 [32m✓[39m test/no-service-name-literals.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 10[2mms[22m[39m
 [32m✓[39m test/proxy.test.ts [2m([22m[2m2 tests[22m[2m)[22m[90m 252[2mms[22m[39m

[2m Test Files [22m [1m[32m15 passed[39m[22m[90m (15)[39m
[2m      Tests [22m [1m[32m113 passed[39m[22m[90m (113)[39m
[2m   Start at [22m 11:06:51
[2m   Duration [22m 15.99s[2m (transform 413ms, setup 0ms, collect 3.37s, tests 5.72s, environment 3.94s, prepare 955ms)[22m

__SCRUMY_CHECK__ test exit=0

> timeless-frontend@0.1.0 lint
> tsc --noEmit

src/components/TimeGrid.tsx(4,3): error TS6133: 'Check' is declared but its value is never read.
src/components/TimeGrid.tsx(6,3): error TS6133: 'LoaderCircle' is declared but its value is never read.
__SCRUMY_CHECK__ lint exit=2

> timeless-frontend@0.1.0 build
> tsc --noEmit && vite build

src/components/TimeGrid.tsx(4,3): error TS6133: 'Check' is declared but its value is never read.
src/components/TimeGrid.tsx(6,3): error TS6133: 'LoaderCircle' is declared but its value is never read.
__SCRUMY_CHECK__ build exit=2

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
