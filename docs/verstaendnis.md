# Projektverständnis

Projekt **Timeless** – eigenes Raumbuchungssystem für die DesignFreak GmbH (Marketing).
Stand: erster Projekttag. Grundlage sind das freigegebene Konzept (v1) und die 23 freigegebenen Anforderungen. Dieses Dokument hält fest, wie das Team den Auftrag versteht; es ersetzt keine Anforderung.

## Was der Kunde erreichen will

Die DesignFreak GmbH ersetzt ihre kostenpflichtige Raumbuchungs-SaaS (Robin, Skedda, Envoy Rooms) durch eine eigene Webanwendung. Damit sollen vier bekannte Probleme gelöst werden:

- **Doppelbuchungen** durch parallele Outlook-Einträge → verlässliche Konfliktprüfung beim Speichern.
- **Keine Sicht auf Ausstattung** (Beamer, Videokonferenz, Whiteboard, Kapazität) → Räume nach Merkmalen findbar und filterbar.
- **No-Shows** (reservierte, aber nicht genutzte Räume) → Check-in mit automatischer Freigabe nach konfigurierbarer Frist.
- **Gäste-Hürde** (bisher Account nötig) → Mitarbeitende nehmen Gäste ohne Registrierung in Buchungen auf.

Zielgruppen: Mitarbeitende (finden und buchen Räume), Facility-Verantwortliche (pflegen Räume, sehen Auslastung), Admins (Verwaltung, Rollen).

## Umfang (was gehört dazu – und was ausdrücklich nicht)

**Dazu gehört** (Gruppierung entlang der freigegebenen Anforderungen):

- *Raumstammdaten:* Räume mit Name, Standort, Kapazität anlegen/ändern (1); Ausstattungsmerkmale je Raum pflegen (2); Raumliste danach filtern (3).
- *Verfügbarkeit & Kalender:* freie Räume für einen Wunschzeitraum ermitteln (4); Kalenderansicht je Raum (5); Tagesansicht über alle Räume eines Standorts (6).
- *Buchungen:* Buchungsformular mit Raum, Datum, Start/Ende und erkennbarem Urheber (7); Konfliktprüfung gegen Doppelbuchungen – Back-to-back zulässig, parallel abgesendete Buchungen führen zu genau einer erfolgreichen (8, „dringend"); wiederkehrende Buchungen täglich/wöchentlich (9) mit Serienbearbeitung Einzeltermin/Gesamtserie (10).
- *Check-in / No-Show:* Check-in für die laufende eigene Buchung (11); automatische Freigabe nach konfigurierbarer Frist X ohne Check-in (12).
- *Genehmigung:* Genehmigungspflicht je Raum ein-/ausschaltbar – ohne Pflicht sofort bestätigt, mit Pflicht Status „ausstehend" und blockierter Zeitraum (13); Workflow zum Genehmigen/Ablehnen mit sichtbarem Status für den Antragsteller (14).
- *Rollen & Nutzer:* Admin / Facility-Manager / Mitarbeiter mit abgestuften Rechten (15); Admin weist Rollen zu (16); Gäste als Teilnehmer ohne Account (17).
- *Benachrichtigungen & Integration:* E-Mail bei Buchung, Änderung, Stornierung (18); Erinnerung vor Beginn (19); Einladungs-Mail mit .ics-Anhang inkl. Aktualisierung/Storno (20); iCal-Abo-URL je Raum für Outlook/Google Calendar (21); REST-Schnittstelle (JSON) für das Türdisplay – aktueller/nächster Termin oder „frei" (22).
- *Reporting:* Auslastungsbericht je Raum/Standort/Zeitraum auf Basis der Buchungsdaten (23).

**Ausdrücklich nicht im Umfang:**

- Anbindung an Schließanlage/Zutrittskontrolle.
- Zahlungsabwicklung, Catering-Bestellung.
- IoT-Sensor-basiertes Belegungstracking (Stufe 1 läuft rein auf Buchungsdaten).
- Arbeitsplatz-/Desk-Booking – nur Räume.
- Reale Raum-/Ausstattungsdaten: laut Konzept durch Testdaten ersetzt.

**Keine normalen Stories, sondern blockierte Zulieferungen** (laut Konzept: erst Klärung stellen, danach die eigentliche Anforderung generieren): Testdaten statt realer Raumliste, Entscheidung zur Genehmigungspflicht (grundsätzlich aktiv vs. je Raum konfigurierbar), SSO/Login-Verfahren bzw. einfacher E-Mail-Login für den Test.

## Fachliche Kernbegriffe

- **Raum:** Name, Standort, Kapazität, Ausstattungsmerkmale, optional Genehmigungspflicht.
- **Standort:** Gliederungseinheit; Tagesansicht (6) und Berichte (23) filtern darüber.
- **Ausstattungsmerkmal:** Eigenschaft eines Raums (Beamer, Videokonferenz, Whiteboard …), Filterkriterium in der Raumsuche (3).
- **Buchung:** Raum + Zeitraum (Datum, Start, Ende) + Urheber; optional Gäste als Teilnehmer; Status je nach Genehmigungspflicht (bestätigt / ausstehend / genehmigt / abgelehnt) und Check-in.
- **Konfliktprüfung:** Überschneidende Buchungen desselben Raums werden abgelehnt; direkt angrenzende (Back-to-back) sind zulässig.
- **Serie:** tägliche/wöchentliche Buchungskette bis zu einem Enddatum; bearbeitbar als Einzeltermin oder gesamte (zukünftige) Serie.
- **Check-in:** Bestätigung der laufenden Buchung durch den Buchenden.
- **No-Show:** ausgebliebener Check-in innerhalb der Frist X nach Beginn → automatische Freigabe des Raums.
- **Genehmigungsworkflow:** raumweise Genehmigungspflicht; Statusfluss ausstehend → genehmigt/abgelehnt.
- **Gast:** Teilnehmer einer Buchung ohne eigenen Account/Login.
- **iCal-Abo / .ics:** abonnierbare Kalender-URL je Raum bzw. Kalenderdatei als E-Mail-Anhang.
- **Auslastung:** belegte Zeit im Verhältnis zur verfügbaren Zeit, je Raum/Standort/Zeitraum.

## Technischer Rahmen

Wir folgen dem Standard-Zuschnitt aus den Grundregeln; **keine der drei Ausnahmen greift** (Konzept/Anforderungen verlangen nichts anderes, das Projekt hat ein Frontend, es wird kein bestehender Code importiert):

- **docker-compose.yml** in der Repo-Wurzel, ein Container je Dienst:
  - `frontend` – React + TypeScript (Vite) mit Tailwind CSS und shadcn/ui, dauerhafte Sidebar-Navigation; liegt in `frontend/` mit echten `dev`-, `build`-, `test`- und `lint`-Skripten. Einzig veröffentlichter Port. Der Frontend-Container dient zugleich als Reverse-Proxy, der `/api/...` und die iCal-Feeds intern an das Backend weiterreicht – so erreichen Browser, Türdisplay und externe Kalenderabos alles über den einen veröffentlichten Ursprung, und im Client-JavaScript taucht nie ein Compose-Servicename auf.
  - `backend` – REST-API (Node.js/TypeScript, schlankes Framework wie Fastify; endgültige Wahl im ersten Sprint) mit der gesamten Fachlogik inkl. transaktionaler Konfliktprüfung; nur intern über den Servicenamen adressiert.
  - `worker` – zeitgesteuerte Jobs: No-Show-Freigabe (12) und Erinnerungs-Mails (19). Eigener Container, weil diese Aufgaben unabhängig von HTTP-Anfragen laufen müssen.
  - `db` – PostgreSQL. Buchungsdaten sind relational (Raum–Buchung–Teilnehmer–Status), die Konfliktprüfung (8) braucht Transaktionen/Constraints, die Berichte (23) sind SQL-Fälle – eine Datenhaltung ist hier zwingend, kein Ausnahmefall.
  - `mailpit` (nur Testbetrieb) – lokaler SMTP-Catcher, damit die Mail-Anforderungen (18–20) ohne echten Mailserver prüfbar sind.
- Code wird beim Build in die Images kopiert (COPY), keine Bind-Mounts zur Laufzeit.
- Tests: Backend erhält ein echtes `test`-Skript; jedes Ticket mit Fachlogik bringt mindestens einen Kernfall-Test mit – besonders kritisch bei Konfliktprüfung unter Parallelität, Serienlogik und No-Show-Frist.

## Annahmen

Was der Auftrag nicht hergibt, arbeiten wir bis zur Klärung unter folgenden Annahmen:

1. **Login:** einfacher E-Mail-Login genügt für den Test (als Option im Konzept genannt), bis der Kunde SSO oder etwas anderes entscheidet.
2. **Ausstattungsmerkmale** sind reine Eigenschaften/Filtermerkmale am Raum, keine eigenständig buchbaren Objekte (so behandeln es die Anforderungen 2 und 3; die Klärungsfrage bleibt offen).
3. **Gäste** werden im Buchungsformular mit ihren Angaben erfasst und haben keinerlei Zugang zum System (Anforderung 17).
4. **Stornieren** ist möglich (die AK zu 18 und 20 setzen es voraus), obwohl es keine eigene Anforderung gibt; wer außer dem Urheber ändern/stornieren darf, ist offen.
5. **Zeitzone:** alle Zeiten in einer Zeitzone (Annahme: Europe/Berlin); Serien müssen den Sommerzeitwechsel korrekt folgen.
6. **Oberflächensprache** ist Deutsch.
7. **Testdaten** (mehrere Standorte mit Räumen unterschiedlicher Kapazität/Ausstattung) legt das Team an, bis der Kunde echte Daten liefert.
8. **E-Mail-Versand** läuft im Test über den lokalen Mail-Catcher; SMTP-Zugangsdaten für den Echtbetrieb liefert der Kunde.
9. **Serienende** ist ein Datum („bis zum gewählten Serienende").

## Risiken

- **Konfliktprüfung unter Parallelität (8):** Zwei gleichzeitige Requests dürfen nur eine Buchung erzeugen – nur mit DB-Transaktion/Locking sicher lösbar. Hohes Regressionsrisiko, deshalb Tests ab dem ersten Ticket.
- **Hintergrund-Jobs:** Fällt der Worker aus, bleiben No-Shows gebucht und Erinnerungen unversendet – Ausführungsüberwachung/Wiederholungslogik einplanen.
- **Kundenzulieferungen blockieren:** Login-Verfahren, Genehmigungsentscheidung und Testdaten bremsen Rollenmodell (15/16), Genehmigung (13/14) bzw. realistische Tests – Klärungen früh stellen.
- **Externe Erreichbarkeit:** iCal-Abos (21) müssen aus Outlook/Google Calendar erreichbar sein; im späteren Betrieb (Hosting, Firewall) zu sichern – die Betriebsfrage ist ohnehin offen.
- **Sommerzeit/DST** bei täglichen/wöchentlichen Serien – klassische Fehlerquelle bei Terminberechnung.
- **Umfang:** 23 Anforderungen; die Priorisierung (Dringend/Hoch/Mittel/Niedrig) muss die Sprintplanung ernst nehmen.

## Offene Fragen an den Auftraggeber

Laut Konzept „vor der Freigabe zu klären":

1. Wie viele Standorte/Gebäude und Räume je Standort zum Start?
2. Sind Ausstattungsgegenstände nur Filtermerkmale oder eigenständig buchbare Objekte?
3. Buchen externe Gäste wirklich nur über Mitarbeitende (so Anforderung 17) oder ist ein Gastzugang gewünscht?
4. Welche Nutzerzahl sowie welcher Rollen-/Rechtebedarf zum Start?
5. Betrieb: eigene Infrastruktur oder gehostet? Backup- und Ausfallkonzept?

Blockiert auf Zulieferung (wir stellen die Klärung, danach generieren wir die Anforderungen):

6. Login-Verfahren: SSO oder genügt für den Test der einfache E-Mail-Login?
7. Genehmigungspflicht: genügt der je-Raum-Schalter nach Anforderung 13, oder soll zusätzlich ein grundsätzlicher Schalter gelten?

Neu aus den Anforderungen:

8. Was passiert, wenn einzelne Termine einer neu angelegten Serie kollidieren – ganze Serie ablehnen oder Teilanlage mit Meldung?
9. Wer darf Buchungen ändern/stornieren – nur der Urheber, oder auch Facility-Manager/Admin?
10. Welcher Default-Wert für die No-Show-Frist X (Minuten) und wann genau wird die Erinnerung (19) vor Beginn versendet?
