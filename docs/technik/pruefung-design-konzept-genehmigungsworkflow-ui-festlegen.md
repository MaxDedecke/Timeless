# Automatische Prüfung: Design-Konzept: Genehmigungsworkflow-UI festlegen

Von Scrumy automatisch ausgeführt, kein Modellurteil: `npm ci` (oder `npm install` ohne Lockfile), danach `npm test`/`npm run lint`/`npm run build`, je nachdem was das jeweilige package.json anbietet.

### backend
npm ci/install: exit ?
npm run test: exit 0
npm run lint: exit 0
npm run build: exit 0

Ausgabe:
```
… (9950 Zeichen gekürzt)
m Fremdschlüssel abgelehnt
ok 44 - DB: Raum ohne gültigen Standort wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 11.64573
  type: 'test'
  ...
# Subtest: DB: gültiger Standort + Raum lässt sich anlegen
ok 45 - DB: gültiger Standort + Raum lässt sich anlegen
  ---
  duration_ms: 15.918585
  type: 'test'
  ...
# Subtest: DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
ok 46 - DB: wiederholtes Migration-Setup auf derselben Instanz bleibt erfolgreich und ändert nichts mehr
  ---
  duration_ms: 18.422461
  type: 'test'
  ...
# Subtest: DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
ok 47 - DB: Buchung auf gültigen Raum anlegen – Zeile lesbar und Status-Default 'bestaetigt' gesetzt
  ---
  duration_ms: 14.016701
  type: 'test'
  ...
# Subtest: DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
ok 48 - DB: Buchung mit unbekannter room_id wird vom Fremdschlüssel abgelehnt
  ---
  duration_ms: 7.611352
  type: 'test'
  ...
# Subtest: DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
ok 49 - DB: Löschen eines Raums mit Buchung wird durch ON DELETE RESTRICT verweigert
  ---
  duration_ms: 22.66958
  type: 'test'
  ...
# Subtest: PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 50 - PUT /api/rooms/:id ohne vollständige Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 45.280599
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
ok 51 - PATCH /api/rooms/:id mit explizit geleertem Pflichtfeld wird mit 400 abgelehnt
  ---
  duration_ms: 4.54416
  type: 'test'
  ...
# Subtest: PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
ok 52 - PATCH /api/rooms/:id mit leerem Körper ändert nichts (keine Validierungsfehler)
  ---
  duration_ms: 10.847538
  type: 'test'
  ...
# Subtest: GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
ok 53 - GET /api/rooms/:id mit nicht-numerischer ID liefert 404 ohne Datenbankzugriff
  ---
  duration_ms: 2.047355
  type: 'test'
  ...
# Subtest: POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
ok 54 - POST /api/rooms ohne Pflichtfelder wird mit 400 und Fehlermeldung abgelehnt
  ---
  duration_ms: 18.667969
  type: 'test'
  ...
# Subtest: listRooms liefert je Raum die zugeordneten Merkmale mit
ok 55 - listRooms liefert je Raum die zugeordneten Merkmale mit
  ---
  duration_ms: 1.868909
  type: 'test'
  ...
# Subtest: listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
ok 56 - listRooms setzt genau eine Listenabfrage ab und ordnet die Zeilen unverändert zu
  ---
  duration_ms: 0.378553
  type: 'test'
  ...
# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 57 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
  ---
  duration_ms: 1.006528
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 58 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.907823
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 59 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.314895
  type: 'test'
  ...
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 60 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
  ---
  duration_ms: 0.088151
  type: 'test'
  ...
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 61 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
  ---
  duration_ms: 0.745319
  type: 'test'
  ...
# Subtest: POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
ok 62 - POST /api/rooms legt einen Raum an; er erscheint in GET /api/rooms inklusive Standort
  ---
  duration_ms: 36.634159
  type: 'test'
  ...
# Subtest: POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
ok 63 - POST /api/rooms mit nicht existierendem Standort wird mit 400 abgelehnt
  ---
  duration_ms: 4.491808
  type: 'test'
  ...
# Subtest: PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
ok 64 - PUT ändert Name, Standort und Kapazität; die Änderung ist über GET sichtbar
  ---
  duration_ms: 22.818595
  type: 'test'
  ...
# Subtest: PATCH ändert nur die übergebenen Felder
ok 65 - PATCH ändert nur die übergebenen Felder
  ---
  duration_ms: 15.545651
  type: 'test'
  ...
# Subtest: PATCH mit leerem Körper lässt den Raum unverändert
ok 66 - PATCH mit leerem Körper lässt den Raum unverändert
  ---
  duration_ms: 8.388475
  type: 'test'
  ...
# Subtest: Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
ok 67 - Änderung auf einen nicht existierenden Standort wird mit 400 abgelehnt
  ---
  duration_ms: 12.510923
  type: 'test'
  ...
# Subtest: PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
ok 68 - PUT/PATCH auf unbekannte Raum-ID liefert 404 mit Fehlermeldung
  ---
  duration_ms: 4.962398
  type: 'test'
  ...
# Subtest: GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
ok 69 - GET /api/rooms/available listet ausschließlich Räume ohne überschneidende Buchung
  ---
  duration_ms: 18.41527
  type: 'test'
  ...
# Subtest: Jede Form der Überschneidung schließt den Raum aus
ok 70 - Jede Form der Überschneidung schließt den Raum aus
  ---
  duration_ms: 45.67927
  type: 'test'
  ...
# Subtest: Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
ok 71 - Direkt angrenzende Buchungen (Back-to-back) schließen den Raum nicht aus
  ---
  duration_ms: 31.984284
  type: 'test'
  ...
# Subtest: Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
ok 72 - Nach erfolgreicher Buchung gilt der Raum für denselben Zeitraum nicht mehr als frei
  ---
  duration_ms: 26.823361
  type: 'test'
  ...
# Subtest: Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
ok 73 - Fehlende oder unlesbare Zeitangaben führen zu 400 mit verständlicher Meldung
  ---
  duration_ms: 10.876496
  type: 'test'
  ...
# Subtest: Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
ok 74 - Ein leeres oder invertiertes Intervall (to <= from) wird mit 400 abgelehnt
  ---
  duration_ms: 2.445233
  type: 'test'
  ...
# Subtest: listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
ok 75 - listAvailableRooms liefert die Merkmale je freiem Raum, leere Zuordnung als leere Liste
  ---
  duration_ms: 13.535376
  type: 'test'
  ...
# Subtest: listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
ok 76 - listAvailableRooms wirft bei ungültigen Zeitangaben einen ValidationError
  ---
  duration_ms: 0.567222
  type: 'test'
  ...
# Subtest: GET /api/health liefert Status ok
ok 77 - GET /api/health liefert Status ok
  ---
  duration_ms: 26.578715
  type: 'test'
  ...
# Subtest: GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
ok 78 - GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist
  ---
  duration_ms: 5.738999
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
# duration_ms 4731.911261
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
npm run test: exit (nicht erreicht)
npm run lint: exit (nicht erreicht)
npm run build: exit (nicht erreicht)

Ausgabe:
```
… (100052 Zeichen gekürzt)
shrink-0"[39m
              [33mfill[39m=[32m"none"[39m
              [33mheight[39m=[32m"24"[39m
              [33mstroke[39m=[32m"currentColor"[39m
              [33mstroke-linecap[39m=[32m"round"...

Ignored nodes: comments, script, style
[36m<body[39m
  [33mstyle[39m=[32m""[39m
[36m>[39m
  [36m<div>[39m
    [36m<div[39m
      [33mclass[39m=[32m"min-h-screen bg-background text-foreground"[39m
    [36m>[39m
      [36m<aside[39m
        [33mclass[39m=[32m"fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/20 bg-sidebar text-sidebar-foreground lg:flex"[39m
      [36m>[39m
        [36m<div[39m
          [33mclass[39m=[32m"flex items-center gap-2 px-4 pb-6 pt-5"[39m
        [36m>[39m
          [36m<svg[39m
            [33maria-hidden[39m=[32m"true"[39m
            [33mclass[39m=[32m"lucide lucide-calendar-check h-5 w-5 text-primary-tint"[39m
            [33mfill[39m=[32m"none"[39m
            [33mheight[39m=[32m"24"[39m
            [33mstroke[39m=[32m"currentColor"[39m
            [33mstroke-linecap[39m=[32m"round"[39m
            [33mstroke-linejoin[39m=[32m"round"[39m
            [33mstroke-width[39m=[32m"2"[39m
            [33mviewBox[39m=[32m"0 0 24 24"[39m
            [33mwidth[39m=[32m"24"[39m
            [33mxmlns[39m=[32m"http://www.w3.org/2000/svg"[39m
          [36m>[39m
            [36m<path[39m
              [33md[39m=[32m"M8 2v3"[39m
            [36m/>[39m
            [36m<path[39m
              [33md[39m=[32m"M16 2v3"[39m
            [36m/>[39m
            [36m<rect[39m
              [33mheight[39m=[32m"18"[39m
              [33mrx[39m=[32m"2"[39m
              [33mwidth[39m=[32m"18"[39m
              [33mx[39m=[32m"3"[39m
              [33my[39m=[32m"3"[39m
            [36m/>[39m
            [36m<path[39m
              [33md[39m=[32m"M3 9h18"[39m
            [36m/>[39m
            [36m<path[39m
              [33md[39m=[32m"m9 15 2 2 4-4"[39m
            [36m/>[39m
          [36m</svg>[39m
          [36m<span[39m
            [33mclass[39m=[32m"text-lg font-semibold text-sidebar-foreground"[39m
          [36m>[39m
            [0mTimeless[0m
          [36m</span>[39m
          [36m<span[39m
            [33mclass[39m=[32m"sr-only"[39m
          [36m>[39m
            [0mRaumbuchung der DesignFreak GmbH[0m
          [36m</span>[39m
        [36m</div>[39m
        [36m<nav[39m
          [33maria-label[39m=[32m"Hauptnavigation"[39m
          [33mclass[39m=[32m"flex flex-col gap-1 px-3"[39m
        [36m>[39m
          [36m<p[39m
            [33mclass[39m=[32m"px-3 pb-1 pt-2 text-xs uppercase tracking-wide text-sidebar-foreground/50"[39m
          [36m>[39m
            [0mBuchen[0m
          [36m</p>[39m
          [36m<a[39m
            [33maria-current[39m=[32m"page"[39m
            [33mclass[39m=[32m"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground"[39m
            [33mhref[39m=[32m"/rooms"[39m
          [36m>[39m
            [36m<svg[39m
              [33maria-hidden[39m=[32m"true"[39m
              [33mclass[39m=[32m"lucide lucide-door-open h-4 w-4 shrink-0"[39m
              [33mfill[39m=[32m"none"[39m
              [33mheight[39m=[32m"24"[39m
              [33mstroke[39m=[32m"currentColor"[39m
              [33mstroke-linecap[39m=[32m"round"[39m
              [33mstroke-linejoin[39m=[32m"round"[39m
              [33mstroke-width[39m=[32m"2"[39m
              [33mviewBox[39m=[32m"0 0 24 24"[39m
              [33mwidth[39m=[32m"24"[39m
              [33mxmlns[39m=[32m"http://www.w3.org/2000/svg"[39m
            [36m>[39m
              [36m<path[39m
                [33md[39m=[32m"M11 20H2"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"M11 4H8a2 2 0 0 0-2 2v14"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"M14 12h.01"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"M22 20h-3"[39m
              [36m/>[39m
            [36m</svg>[39m
            [0mRäume[0m
          [36m</a>[39m
          [36m<a[39m
            [33mclass[39m=[32m"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"[39m
            [33mhref[39m=[32m"/free"[39m
          [36m>[39m
            [36m<svg[39m
              [33maria-hidden[39m=[32m"true"[39m
              [33mclass[39m=[32m"lucide lucide-calendar-search h-4 w-4 shrink-0"[39m
              [33mfill[39m=[32m"none"[39m
              [33mheight[39m=[32m"24"[39m
              [33mstroke[39m=[32m"currentColor"[39m
              [33mstroke-linecap[39m=[32m"round"[39m
              [33mstroke-linejoin[39m=[32m"round"[39m
              [33mstroke-width[39m=[32m"2"[39m
              [33mviewBox[39m=[32m"0 0 24 24"[39m
              [33mwidth[39m=[32m"24"[39m
              [33mxmlns[39m=[32m"http://www.w3.org/2000/svg"[39m
            [36m>[39m
              [36m<path[39m
                [33md[39m=[32m"M16 2v3"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"M21 10.69V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h7.25"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"m22 21-1.875-1.875"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"M3 9h18"[39m
              [36m/>[39m
              [36m<path[39m
                [33md[39m=[32m"M8 2v3"[39m
              [36m/>[39m
              [36m<circle[39m
                [33mcx[39m=[32m"18"[39m
                [33mcy[39m=[32m"17"[39m
                [33mr[39m=[32m"3"[39m
              [36m/>[39m
            [36m</svg>[39m
            [0mFreie Räume[0m
          [36m</a>[39m
          [36m<a[39m
            [33mclass[39m=[32m"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"[39m
            [33mhref[39m=[32m"/day"[39m
          [36m>[39m
            [36m<svg[39m
              [33maria-hidden[39m=[32m"true"[39m
              [33mclass[39m=[32m"lucide lucide-calendar-days h-4 w-4 shrink-0"[39m
              [33mfill[39m=[32m"none"[39m
              [33mheight[39m=[32m"24"[39m
              [33mstroke[39m=[32m"currentColor"[39m
              [33mstroke-linecap[39m=[32m"round"...
[90m [2m❯[22m waitForWrapper node_modules/@testing-library/dom/dist/wait-for.js:[2m163:27[22m[39m
[90m [2m❯[22m node_modules/@testing-library/dom/dist/query-helpers.js:[2m86:33[22m[39m
[36m [2m❯[22m test/RoomCalendar.test.tsx:[2m708:33[22m[39m
    [90m706| [39m    [34mrenderAt[39m([32m"/rooms/1"[39m)[33m;[39m
    [90m707| [39m
    [90m708| [39m    [35mconst[39m button [33m=[39m [35mawait[39m screen[33m.[39m[34mfindByTestId[39m([32m"timegrid-checkin-113"[39m)[33m;[39m
    [90m   | [39m                                [31m^[39m
    [90m709| [39m    [35mawait[39m user[33m.[39m[34mclick[39m(button)[33m;[39m
    [90m710| [39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯[22m[39m
```
