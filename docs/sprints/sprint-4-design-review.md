# Design-Rückblick auf Sprint 4

**Was gut zusammenspielt:** Raumkalender (`/rooms/:id`) und Tagesansicht (`/day`) fahren beide über das gemeinsame TimeGrid, und die Muster aus Sprint 2/3 (Datenzustände, `lib/format`, Badge-Inventar, aktive Nav-Markierung inkl. Unterseiten) werden konsequent wiederverwendet – die Anwendung wirkt bereits wie ein Produkt, nicht wie zusammengeklickte Einzelteile.

**Was uneinheitlich ist:** Einzelkonventionen werden aktuell erst nachgezogen, wenn ein Review sie erwischt – die `tabular-nums`-Regel galt bis zur Nacharbeit nur für die Tagesansicht, obwohl dieselben Zeit-/Datumsangaben auch im Raumkalender-Kopf und in den TimeGrid-Beschriftungen stehen, ohne dass dort die Einhaltung belegt ist. Ebenso ist für die Tagesansicht nicht dokumentiert, wie sich ein Standort ohne Räume verhält; ein durchdachter Leerzustand ist Konzept-Pflicht für jede Datenansicht.

**Für den nächsten Sprint:** Check-in und No-Show bringen neue Statuswerte (u. a. „nicht erschienen“) und eine neue Inline-Aktion an laufenden Buchungen. Damit nicht wieder pro Ticket improvisiert wird, sollten Badge-Zuordnung und Platzierung des Check-in-Buttons vorab im Design-Konzept festgelegt werden – so wie es die Zustands-Muster-Referenz für Lade/Fehler/Leer schon tut.
