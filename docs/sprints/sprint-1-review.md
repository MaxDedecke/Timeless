# Sprint 1 – Review

Sprint-Ziel: „Funktionsfähige Grundanwendung mit Docker-Setup, Raumverwaltung inkl. Ausstattung und gefilterter Raumliste.“ Das Ziel wurde erreicht; die automatische Integrationsprüfung (voller Stack) ist bestanden, die Anwendung läuft als Compose-Umgebung mit Frontend-, Backend- und Postgres-Container.

## Was geliefert wurde
- **Lauffähige Grundanwendung:** Docker-Compose mit eigenen Containern für Frontend, Backend/API und Postgres. Zwei Startblocker wurden behoben (Dockerfile kopierte proxy.mjs nicht in die Build-Stufe; der Proxy setzte einen ungültigen Host-Header und schoss den Frontend-Container beim ersten /api-Aufruf ab) – letzteres mit Regressionstest abgesichert. Die abschließende Integrationsprüfung bestätigt den vollen Stack als erreichbar.
- **Datenbasis:** Migrationen für Standorte und Räume (Fremdschlüssel rooms.location_id NOT NULL, Index für die spätere Tagesansicht) sowie für Ausstattungsmerkmale. Umgesetzt gemäß Ihrer Beschlüsse vom 21.8.: Standorte als verwaltete Objekte, Merkmale als fester Katalog mit vorbereiteter Erweiterbarkeit.
- **API:** Standorte anlegen/lesen/ändern; Räume anlegen (POST), als Liste lesen (mit eingebettetem Standort und Merkmalsarray), einzeln lesen und ändern (PUT/PATCH). Pflichtfeld-Validierung im Service mit verständlichen 400-Meldungen, 404 für unbekannte Räume/Standorte, alles in Transaktionen.
- **Frontend:** Design-System-Grundlage mit Tailwind/shadcn; Sidebar als Hauptnavigation (aktiver Menüpunkt markiert, mobil Off-Canvas); Raumliste mit Name, Standort, Kapazität und Ausstattungs-Badges inkl. Lade-, Leere- und Fehlerzuständen; Ausstattungsfilter mit AND-Logik, Reset und eigenen Leerzuständen; Formular-Routen /rooms/new und /rooms/:id/edit mit Zugängen aus der Liste und Refetch nach Rückkehr.
- **Tests:** Eine In-Memory-Postgres-Testnaht (pg-mem) mit echtem Migrationsschema und Isolation je Instanz wurde aufgebaut; alle Backend-Suites wurden dagegen umgestellt, Skip-Platzhalter sind entfallen. Backend-Suite 35 Tests grün, Frontend-Suite grün, lint beider Container grün. Die Umstellung deckte einen echten Produktionsbug auf: In updateRoom fehlte ein $-Platzhalter – jede Raumänderung mit Feldänderung wäre gegen echte Postgres mit 500 fehlgeschlagen. Behoben und per Test gesichert.

Damit sind die Anforderungen 1 (Räume verwalten), 2 (Ausstattung pflegen) und 3 (nach Ausstattung filtern) abgedeckt.

## Was offen blieb (und warum)
Gegenüber dem Sprint-Ziel ist nichts offen. Drei ehrliche Randnotizen:
- Das Ticket „TS2307-Importfehler in fake-pool.ts“ endete mit einem roten Prüf-Lauf. Die betroffene Hilfsdatei wurde anschließend zusammen mit der alten Fake-DB-Testnaht komplett entfernt, die finale Gesamtsuite läuft grün. Entsprechend Ihrem Beschluss vom 23.8. haben wir das Ticket obsolet geschlossen, statt es erneut anzulaufen – der fragliche Code existiert nicht mehr.
- Das Ticket „Raumformular zum Anlegen und Bearbeiten“ hinterließ in seiner Runde keine Änderungen (Zeit während der Kontextanalyse abgelaufen); die Lieferung kam über die Folgetickets (Routen, Zugänge, Tests). Ein dokumentierter Ende-zu-Ende-Nachweis „Raum im Browser gegen den laufenden Stack speichern“ liegt nicht vor – die Rendering-Tests decken Vorausfüllung und Fehlerzustand ab. Falls gewünscht, holen wir den Nachweis als kleines Ticket nach.
- Mehrere Tickets brauchten mehrere Anläufe (u. a. Sidebar-Umsetzung, diverse Testtickets). Die Ursachen – rote Backend-Lint-Läufe, jsdom-Stolpersteine, veraltete Ist-Stands-Annahmen der Ticketausgaben – sind behoben bzw. dokumentiert; der Endstand ist stabil.

Planmäßig offen (nicht Teil dieses Sprint-Ziels): Buchungskern inkl. Konfliktprüfung, freie-Raum-Suche, Kalender-/Tagesansicht, Check-in/No-Show, Genehmigungswesen, Rollen, E-Mail/iCal, Display-Schnittstelle, Auslastungsbericht.

## Wo der Auftraggeber gefragt ist
1. **Kunden-Zulieferungen (Konzept-Blocker):** Sie hatten am 23.8. entschieden, beide offenen Fragen direkt zu beantworten. Wir brauchen: (a) konkrete Testdaten statt der realen Raum-/Ausstattungsliste – entweder Sie benennen Beispiel-Standorte/-Räume oder geben uns frei, passende Testdaten selbst festzulegen; (b) die Login-Entscheidung (einfacher E-Mail-Login für den Test vs. SSO). Solange sie fehlen, planen wir die betroffenen Module nicht ein.
2. **Offene Fachfrage aus Ihrem Beschluss vom 21.8.:** Sollen Admins Ausstattungsmerkmale künftig selbst verwalten dürfen? Aktuell gilt weiter der feste Katalog; die Entscheidung kann jederzeit als Zusatz-Ticket nachkommen, ohne Umbau.
3. **Priorisierung für Sprint 2:** Wir schlagen den Buchungskern vor (siehe unten) – bitte Ziel freigeben oder anders gewichten.

## Empfehlung für den nächsten Sprint
Sprint 2 als **Buchungskern**: Räume für Zeiträume buchen (Anf. 7), Konfliktprüfung gegen Doppelbuchungen inkl. gleichzeitig abgesendeter Requests (Anf. 8, als einziges „Dringend“-Ticket das Kernstück), freie Räume für einen Wunschzeitraum (Anf. 4), Kalenderansicht je Raum (Anf. 5) und Tagesansicht je Standort (Anf. 6). Die in diesem Sprint gebaute In-Memory-DB-Naht erlaubt dafür realistische Datenbanktests (Überlappungen, Race Conditions) ohne Container – genau dafür wurde sie errichtet. Wiederkehrende Buchungen (Anf. 9/10) schlagen wir für den Sprint danach vor. Parallel sollten die Antworten zu Testdaten und Login eingezogen werden, damit Folge module nicht warten müssen.

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 32961).
