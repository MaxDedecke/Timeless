# Sprint 9 – Review

## Was geliefert wurde

**No-Show-Status in allen Kalenderansichten sichtbar** (Ben Ritter): Der Status „Nicht erschienen" wird im Raumkalender (`/rooms/:id`) und in der Tagesansicht (`/day/:id`) angezeigt – Badge im neutralen Muted-Stil gemäß Sprint-5-Konzept, no-show-freigegebene Slots im freien Stil (Muted-Fläche, gestrichelter Rand) und ohne Check-in-Button; bestätigt und eingecheckte Buchungen bleiben unverändert. Die Badge-Variante ist unit-getestet, ein veralteter App-Test wurde an den vierten Sidebar-Punkt „Genehmigungen" angleichen (Commit 8ebe6e52). Der bekannte Encoding-Tippfehler in TimeGrid/BookingStatusBadge ist behoben (Commit 3eeb99bf).

**Check-in-Fenster folgt der konfigurierbaren Frist** (Frida Lang): Das hartkodierte 15-Minuten-Fenster ist entfernt. Das Backend liest `NO_SHOW_AFTER_MINUTES` (Default 15) aus der Konfiguration und liefert `noShowAfterMinutes` mit jeder Buchungsantwort; das Frontend berechnet das Sichtbarkeitsfenster daraus, mit Default-Fallback. Unit-Tests decken eine abweichende Frist (10 Minuten) ab. Laut Ticketergebnis laufen 131 Frontend- und 78 Backend-Tests grün.

**Design-Konzept Genehmigungsworkflow-UI** (Ben Ritter): Verbindlich in `docs/design-konzept.md` dokumentiert – Sidebar-Punkt „Genehmigungen", Statusanzeige über BookingStatusBadge, Leer-/Lade-/Fehlerzustände, Bestätigungsdialog für Genehmigen/Ablehnen. Über das reine Konzept hinaus ist die Seite `/approvals` mit Route und API-Client umgesetzt und im Browser ohne JavaScript-Fehler erreichbar (Commit 405b2a62).

**Design-Konzept Gäste-Erfassung** (Frida Lang): Gäste ohne Account als Teilnehmer im Buchungsdialog festgelegt (Name/E-Mail, Inline-Validierung, Anzeige in Detailansicht und als Badge im Kalenderslot, Leerzustand ohne Gäste als Normalfall) – plus Vorarbeit Richtung Anforderung 17: `BookingInput.guests`, Migration 004 mit `booking_guests`-Tabelle.

**Qualitätssicherung:** Die automatischen Prüfungen zu allen Tickets waren erfolgreich (Quinn Adler), ebenso die Integrationsprüfung des vollen Stacks (Frontend erreichbar, Port 33151).

## Was offen blieb (und warum)

**Datenmodell für die Genehmigungspflicht je Raum fehlt.** Das war ausdrücklich Teil des Sprintziels („… dazu steht das Datenmodell für die Genehmigungspflicht je Raum bereit"), und Ihr Beschluss vom 25.8. sagte das Grundlagen-Ticket für Sprint 9 nachziehen. Weder ein solches Ticket noch eine Lieferung existieren. Das haben wir in der Sprintplanung versäumt – dieses Zielteil ist nicht erreicht, und Anforderung 13 kann ohne diese Datenbasis nicht starten.

**Genehmigungsworkflow ist nur als UI-Hülle funktionsfähig.** Die `/approvals`-Seite zeigt korrekte Zustände, aber die dahinterliegende API antwortet mit 404 – der Backend-Endpunkt für offene Anfragen sowie Genehmigen/Ablehnen fehlt. Laut Ticketergebnis als separates Backend-Ticket vorgesehen; es liegt noch nicht im Board.

**Antwortentwurf zu den Zulieferungsfragen weiterhin nicht erstellt.** Zwei Ihrer Beschlüsse dazu (24.8.: „jetzt im Sprint 8 erstellen"; 25.8.: „Ticket jetzt nachziehen und Entwurf erstellen") sind unerledigt geblieben. Der Entwurf zu Testdaten-statt-realere-Raumliste und SSO-vs.-E-Mail-Login ist damit überfällig.

## Wo der Auftraggeber gefragt ist

- **Duplikat-Klärung:** „No-Show-Status in Raumkalender und Tagesansicht sichtbar machen" existiert zweimal im Sprint, das zweite Exemplar ohne Ergebniszusammenfassung. Ist es ein versehentliches Duplikat, das wir nach kurzer Prüfung (inkl. Code-Dubletten-Prüfung) schließen dürfen? Unsere Einschätzung: Ja – gleiche Konstellation wie die bereits entschiedenen Dubletten aus Sprint 3 und 6/7, das erste Exemplar trägt die vollständige Dokumentation. Bis zu Ihrer Entscheidung fassen wir das zweite Exemplar nicht an.
- **Freigabe des Zulieferfragen-Entwurfs:** Die eigentlichen Fachentscheidungen (Testdaten statt realer Raumliste; einfacher E-Mail-Login statt SSO für den Test) bleiben laut Ihrem Beschluss vom 24.8. bei Ihnen. Sie warten darauf, dass wir den überfälligen Entwurf vorlegen (siehe oben).

## Empfehlung für den nächsten Sprint

1. **Sprint-9-Rest zuerst:** Grundlagen-Ticket „Datenmodell für die Genehmigungspflicht je Raum" (Anforderung 13) – Voraussetzung für den gesamten Genehmigungsworkflow.
2. **Backend für den Genehmigungsworkflow:** Endpunkte für offene Anfragen sowie Genehmigen/Ablehnen, damit `/approvals` über den aktuellen 404 hinaus funktioniert und Anforderungen 14/15 Ende-zu-Ende lauffähig werden.
3. **Gäste-Erfassung umsetzen:** Die Vorarbeit aus dem Konzept-Ticket (Migration 004, `booking_guests`) nutzen und Anforderung 17 im BookingForm fertigstellen.
4. **Zulieferfragen-Entwurf diesmal als explizites Sprint-Ticket durchziehen** und Ihnen zur Freigabe vorlegen – zwei Beschlüsse dazu sind bisher leer gelaufen.
5. **Board bereinigen:** Nach Ihrer Entscheidung zum Duplikat dieses schließen und dabei auf Code-Dubletten prüfen.

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 33151).
