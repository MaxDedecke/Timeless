# Sprint 1 – Review

**Sprint-Ziel:** Funktionsfähige Grundanwendung mit Docker-Setup, Raumverwaltung inkl. Ausstattung und gefilterter Raumliste. **Das Ziel wurde erreicht** – die automatische Integrationsprüfung lief mit vollem Stack erfolgreich (Dienst „frontend", Port 32962).

## Was geliefert wurde

**Betriebsgrundlage (Anforderung 1–3 teilweise vorbereitet):**
- Docker-Compose mit eigenen Containern für Frontend, Backend und Postgres. Drei Startblocker wurden behoben: fehlendes `COPY` der Proxy-Datei im Frontend-Dockerfile, ein abstürzender Host-Header im API-Proxy (mit Regressionstest gesichert) und hart verdrahtete Backend-Adressen im Frontend – das Proxy-Ziel kommt jetzt ausschließlich aus `BACKEND_ORIGIN`.

**Datenmodell und Backend:**
- Migrationen für Standorte und Räume (mit Fremdschlüssel und Index), Standorte sind gemäß Beschluss vom 21.8. verwaltete Objekte, nicht Freitext.
- REST-API: Standorte anlegen/lesen/ändern; Räume anlegen, lesen, ändern (PUT/PATCH) mit Pflichtfeld-Validierung (Name, Kapazität > 0, existierender Standort → sonst 400 mit verständlicher Meldung).
- Ausstattungsmerkmale sind an die Raum-API angebunden (anlegen, ersetzen, entfernen; fester Katalog lt. Beschluss vom 21.8.), die Raumliste liefert die Merkmale je Raum mit – Räume ohne Merkmale erhalten ein leeres Array statt null.

**Frontend (Tailwind/shadcn):**
- Sidebar-Navigation mit sichtbarer Aktivmarkierung, auf schmalen Breiten als Off-Canvas-Panel.
- Raumliste mit Name, Standort, Kapazität, Merkmals-Badges inkl. Leerzustand, sowie Lade- und Fehlerzuständen.
- Ausstattungsfilter mit UND-Logik über mehrere Merkmale (Anforderung 3).
- Formular-Routen `/rooms/new` und `/rooms/:id/edit`, Anlegen-Button und Bearbeiten-Links in der Liste, Refetch nach Rückkehr aus dem Formular (Anforderung 1).

**Test-Infrastruktur:**
- pg-mem-basierte In-Memory-Postgres als Testnaht; Migrationen laufen dort real, alle Backend-Suiten wurden umgestellt, die Fake-DB-Naht ist entfernt. Letzte dokumentierte Stände: Backend 35/35, Frontend 31/31 Tests grün; die abschließende automatische Prüfung meldete alle Prüf-Skripte erfolgreich.
- Die neue Naht hat einen echten Produktionsfehler aufgedeckt: Im `updateRoom` fehlte ein `$`-Platzhalter – jede Raum-Änderung gegen echte Postgres wäre mit 500 gescheitert. Behoben.

## Was offen blieb (und warum)

- **Vier Tickets wurden ohne Ergebnis-Zusammenfassung geschlossen** (amenities.test.ts, TS2307 in fake-pool.ts, Standort-/Raum-API-Tests umstellen, FakeDbSession entfernen). Drei davon mit grüner automatischer Prüfung. Beim TS2307-Ticket war der letzte Prüf-Lauf rot; gemäß Ihrem Beschluss vom 23.8. („kurz verifizieren, dann obsolet schließen") wurde es geschlossen, da die betroffene Testnaht inzwischen komplett entfernt ist und die finale Gesamtsuite grün lief. Restrisiko sehe ich als gering, benenne es aber der Vollständigkeit halber.
- **Die Test-Infrastruktur-Umstellung hat deutlich mehr Anläufe gekostet als geplant** (mehrere Tickets mit 6–9 Anläufen, zwei manuelle Abbrüche) – jeweils auf Ihre Beschlüsse hin erneut angelaufen und jetzt abgeschlossen. Für die Planung: Testnaht-Arbeit ist im Sprint 1 der Aufwandstreiber gewesen.
- **Ihre Zulieferungen stehen noch aus:** Der Beschluss vom 23.8. war, beide Fragen (Testdaten statt realer Raumliste, SSO/Login-Verfahren) direkt zu beantworten. Die konkreten Antworten sind im Sprint nicht dokumentiert. Ohne die Login-Antwort ist Sprint 2 nicht sauber planbar (Buchender als Urheber ist Akzeptanzkriterium der Buchungs-Anforderung).
- **Konzept-Klärungen ohne die die Folge-Module nicht startklar sind:** Anzahl Standorte/Räume zum Start; ob Ausstattungsgegenstände (Beamer, Kamera) später eigene buchbare Objekte werden; Betrieb (eigene Infrastruktur vs. gehostet, Backup-/Ausfallkonzept – vor Produktivbetrieb, nicht sprintkritisch).
- **Nicht im Sprint 1 enthalten (war nicht Ziel):** Buchungskern, Kalenderansichten, Konfliktprüfung, Check-in/No-Show, Genehmigungsworkflow, Rollen, E-Mail/iCal, Display-API, Auslastungsbericht.

## Wo der Auftraggeber gefragt ist

1. **Login-Verfahren und Testdaten:** Bitte die beiden Antworten vom 23.8. bestätigen bzw. nachliefern. Falls SSO nicht bis Sprint-Start entschieden ist: Reicht für die Testphase der im Konzept vorgesehene einfache E-Mail-Login, mit SSO als Nachzug? Das müssten Sie absegnen.
2. **Für die nächsten Sprints:** Wie viele Standorte/Räume zum Start (betrifft Testdaten und Tagesansicht)? Sollen Ausstattungsgegenstände irgendwann eigene buchbare Objekte sein? Diese Datenmodell-Frage ist jetzt günstig zu entscheiden, später teurer.
3. **Offene Fachfrage, drängt nicht:** Soll der Merkmalskatalog später von Admins selbst verwaltet werden (lt. Beschluss vom 21.8. als mögliches Zusatz-Ticket)? Bitte einfach mitentscheiden oder auf Eis lassen.

## Empfehlung für den nächsten Sprint

**Sprint 2 auf den Buchungskern legen.** Zielvorschlag: „Ein Mitarbeiter kann einen Raum für einen Zeitraum buchen; Doppelbuchungen sind technisch ausgeschlossen; der Raumkalender zeigt die Belegung."

- Tickets: Buchung anlegen (Anf. 7), **Konfliktprüfung (Anf. 8 – dringend, Priorität)**, freie Räume für Wunschzeitraum (Anf. 4), Kalenderansicht je Raum (Anf. 5); die Tagesansicht (Anf. 6) dazu, sofern die Kapazität reicht.
- Voraussetzung: die Login-Klärung aus Punkt 1 oben – ohne sie fehlt der Buchende.
- Danach in dieser Reihenfolge: Rollenmodell (Anf. 15/16), wiederkehrende Buchungen (Anf. 9/10), Check-in/No-Show (Anf. 11/12 – dort ist Ihr Beschluss umzusetzen, dass die Buchung als „nicht erschienen" erhalten bleibt), Genehmigungsworkflow (Anf. 13/14, Anforderung 13 ist als Ihre Entscheidung bestätigt).

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 32962).
