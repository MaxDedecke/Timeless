# Sprint 2 – Review

## Was geliefert wurde
Das Sprintziel „Grundlage des Buchungswesens: Buchungen können gespeichert werden, Doppelbuchungen werden zuverlässig verhindert“ ist erreicht. Alle fünf Sprint-Tickets sind fertig, die automatische Integrationsprüfung (voller Stack) ist bestanden.

- **Datenmodell:** Migration `003_bookings.sql` legt die Tabelle `bookings` an – Raum-Fremdschlüssel mit ON DELETE RESTRICT (ein Raum mit Buchungen ist nicht löschbar, die Historie bleibt geschützt), Zeitraum als TIMESTAMPTZ, Urheber als Textfeld, Status mit Default `bestaetigt` als Basis für den späteren Genehmigungsworkflow und die No-Show-Freigabe. Der Migrationsläufer nimmt die Datei automatisch auf; `migrations.test.ts` deckt sie statisch und per echter DB-Läufe in der In-Memory-Postgres ab.
- **API:** `POST /api/bookings` validiert Raum, Zeitraum und Urheber (HTTP 400 bei ungültigen Eingaben), prüft in einer Transaktion auf überschneidende Buchungen desselben Raums und lehnt Kollisionen mit verständlicher Meldung und HTTP 409 ab. Direkt angrenzende Buchungen (Back-to-back) sind dank halboffenem Intervall zulässig. Die Überschneidungsprüfung liegt als eigenständige Funktion `findOverlappingBookings` vor und ist für das kommende Serien-Ticket wiederverwendbar.
- **Frontend-Qualität:** Listen-Leerzustand der Raumliste („Noch keine Räume angelegt.“ mit direktem Anlegen-CTA) ergänzt und per Rendering-Tests abgesichert; Submit-Ladezustand und Server-Fehleranzeige des Raumformulars waren bereits vorhanden und sind jetzt testabgesichert. Die Querprüfung hat drei manuell kombinierte Typo-Stufen auf die Konzept-Skala zurückgeführt; Arbitrary-Pixelwerte gibt es im Frontend keine mehr.
- **Tests:** Frontend-Suite mit 32 vitest-Tests grün (laut Querprüfungs-Ticket), Backend-Suite inkl. erweiterter `migrations.test.ts` laut Ticketergebnis grün.

## Was offen blieb (und warum)
- **Gleichzeitigkeitsfall nicht belegt:** Das Ticketergebnis zu „Buchung anlegen“ bricht im Export mitten im Satz ab („Gegen gleichzeit …“). Ob der Fall „zwei gleichzeitig abgesendete Buchungen desselben Raums und Zeitraums führen zu genau einer erfolgreichen“ (drittes Akzeptanzkriterium von Anforderung 8, Dringend) implementiert und getestet ist, kann ich dem Material nicht entnehmen. Das braucht eine kurze Verifikation, notfalls ein kleines Nachzugs-Ticket.
- **Keine dedizierten Booking-Tests im Board:** Anders als bei Standorten, Räumen und Ausstattungsmerkmalen (alle gegen InMemoryDb umgestellt) taucht im Sprint kein Test-Ticket für die neue Booking-API auf. Bringt das Ticket selbst keine Tests mit, ist das der nächste Nachzug – die Konfliktprüfung ist der Kern des Sprintziels und sollte unit-getestet sein (Kollision → 409, Back-to-back → zulässig).
- **Urheber ist Freitext:** `created_by` ist ein Textfeld, weil die Users-Tabelle mangels ungeklärtem Login-Verfahren noch nicht existiert. Das ist ein bewusster Stand, kein Defekt – es hängt an der Auftraggeber-Klärung (siehe unten).
- **Buchung noch nicht im UI sichtbar:** Buchungsformular, Raumkalender und Tagesansicht (Anforderungen 4–7) waren nicht Gegenstand dieses Sprints; das Sprintziel umfasste ausdrücklich nur die Grundlage. Kein Fehlschlag, aber der nächste Sprint muss die Sichtbarkeit liefern, sonst bleibt die Funktion unsichtbar.

Die Integrationsprüfung ist bestanden – dazu gibt es nichts zu benennen.

## Wo der Auftraggeber gefragt ist
Der Beschluss vom 23.8. verlangt, beide offenen Kunden-Zulieferungen jetzt direkt zu beantworten:

1. **Testdaten statt realer Raumliste:** Bitte konkrete Testdaten liefern – wie viele Standorte, wie viele Räume je Standort, welche Kapazitäten und welche Ausstattungsmerkmale. Das beantwortet zugleich die offene Konzeptfrage „Wie viele Standorte/Gebäude zum Start“. Ohne Stammdaten bleiben Demo- und Prüfumgebung leer.
2. **Login-Verfahren:** Bitte zwischen echtem SSO und einfachem E-Mail-Login für den Test entscheiden. Davon hängen die Users-Tabelle, das Rollenmodell (Anforderungen 15/16), die Zuordnung von Check-ins und die Gästeverwaltung ab. Bis dahin bleibt der Buchende zwangsläufig ein Freitextfeld.
3. **Optional, nicht dringend:** Sollen Admins Ausstattungsmerkmale künftig selbst verwalten dürfen (Zusatz-Ticket ja/nein)? Laut Beschluss vom 21.8. jederzeit entscheidbar; aktuell gilt der feste Katalog im Code.

## Empfehlung für den nächsten Sprint
1. **Zuerst die Lücken schließen:** Gleichzeitigkeitsfall der Booking-API verifizieren und, falls nicht vorhanden, Unit-Tests gegen InMemoryDb ergänzen (Kollision → 409, Back-to-back → zulässig, Gleichzeitigkeit → genau eine Buchung). Kleines Ticket, sichert das erreichte Sprintziel ab.
2. **Buchung erlebbar machen:** Buchungsformular (Anforderung 7), Kalenderansicht je Raum (Anforderung 5) und Tagesansicht je Standort (Anforderung 6); die Suche nach freien Räumen für einen Zeitraum (Anforderung 4) baut direkt auf `findOverlappingBookings` auf. Damit wird das Buchungswesen erstmals im Browser nutzbar.
3. **Danach nach Priorität:** Check-in und No-Show-Freigabe (Anforderungen 11/12, beide Hoch) – das Statusfeld ist im Datenmodell bereits vorbereitet. Das Rollenmodell (15/16) erst nach Ihrer Login-Entscheidung anpacken, sonst bauen wir die Nutzerverwaltung doppelt um.

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 32978).
