# Sprint 5 – Review

Sprint-Ziel: „Der Kunde kann aus der Anwendung heraus eine Buchung anlegen (mit sichtbarer Konflikt-Rückmeldung) und freie Räume für einen Wunschzeitraum ermitteln." Beide Hälften des Ziels sind umgesetzt; die automatische Integrationsprüfung lief bestanden (voller Stack erreichbar, Dienst „frontend", Port 33025).

## Was geliefert wurde

**Buchung aus der Anwendung anlegen (Anforderung 7, Konflikt-Rückmeldung aus Anforderung 8)**
- Im Raumkalender öffnet der Primärbutton „Raum buchen" einen Dialog (BookingForm): Datum mit Kalendertag vorausgefüllt, Start-/Endzeit, Urheber; Submit gegen POST /api/bookings mit deaktiviertem Button und Inline-Spinner während des Requests.
- Eine Doppelbuchung (HTTP 409) erscheint als deutliches Warn-Alert mit der Backend-Meldung im geöffneten Dialog, ohne zu speichern. Bei Erfolg schließt der Dialog, die Liste lädt neu, die Buchung erscheint unmittelbar im Zeitgitter.

**Freie Räume für einen Zeitraum (Anforderung 4, API-Ebene)**
- Neuer Endpunkt GET /api/rooms/available, inkl. Fix der Pool-Naht und pg-mem-tauglicher Raumform (Commits ac00ae09, 335f8590).
- Alle vier Akzeptanzkriterien durch Vertragstests gegen die InMemoryDb abgedeckt: freier Raum gelistet, kollidierender fehlt, Back-to-back beidseitig frei, fehlende/unlesbare Parameter abgewiesen.

**Stabilisierung und Tests**
- Letzter offener QA-Befund behoben (createRoom-Responder bedient jetzt auch das Merkmals-Nachladen); die Backend-Suite läuft damit erstmals vollständig grün: 71/71 Tests, lint und build durch.
- tabular-nums konsistent an allen parallelen Zeit-/Datumsstellen (TimeGrid, Raumkalender-Kopf), per Klassen-Assertion abgesichert; Frontend-Suite 104 Tests grün.
- Tagesansicht: Leerzustand für Standorte ohne Räume verifiziert (war bereits korrekt umgesetzt, kein Codebedarf) und durch einen neuen Testfall für den Rückfall „/day ohne Routensegment" abgesichert.
- Der Pflicht-Browser-Check deckte dabei einen Live-Bug auf, den die grüne Suite nicht zeigen konnte: withAmenities baute die Merkmals-IN-Liste als Literale statt Platzhalter – im echten Stack war die Raumansicht dadurch tot. Behoben (Commit 335f8590); bestätigt erneut, dass dynamische SQL-Teile nur per Live-Check gegen den echten Stack verifizierbar sind.

**Design-Vorarbeit für den nächsten Schritt**
- docs/design-konzept.md hat ein neues Kapitel „Check-in & No-Show": Badge-Zuordnung („eingecheckt" primary, „nicht erschienen" bewusst neutral statt destructive), Sichtbarkeitsregeln und Platzierung des Check-in-Buttons am Buchungsblock im gemeinsamen TimeGrid, Verhalten nach erfolgreichem Check-in. Damit ist die Umsetzung der Anforderungen 11 und 12 vorbereitet.

## Was offen blieb (und warum)

- **Freie-Räume-Ermittlung ohne Oberfläche:** Es gibt nur die REST-API. Eine Ansicht, in der ein Mitarbeiter einen Zeitraum wählt und die freien Räume sieht, existiert noch nicht – das Ticket war bewusst auf die API geschnitten, das UI fehlt damit noch zur vollständigen Anforderung 4.
- **Check-in/No-Show nur konzipiert, nicht gebaut:** Anforderungen 11 und 12 sind offen; im Sprint lag das Festlegen des Design-Konzepts drin, nicht die Implementierung.
- **Kunden-Zulieferungen weiter offen:** Zu den beiden blockierenden Punkten „Testdaten statt realer Raum-/Ausstattungsliste" und „SSO/Login-Verfahren (oder einfacher E-Mail-Login)" liegt mir keine Antwort des Auftraggebers vor, obwohl der Beschluss vom 23.8. die direkte Beantwortung vorsieht. Ohne Antwort bleibt insbesondere das Rollen-/Nutzerverwaltungsthema (Anforderungen 15, 16) ohne solides Fundament.
- Die Integrationsprüfung ist bestanden – daraus ergibt sich kein offener Punkt.

## Wo der Auftraggeber gefragt ist

1. **Die zwei offenen Zulieferungen bitte beantworten** (falls nicht inzwischen geschehen): Welche Test-Stammdaten sollen statt der realen Raumliste herhalten, und reicht für den Testbetrieb ein einfacher E-Mail-Login? Erstere entscheidet über den Umfang des Seedings, letztere über Rollenmodell und Nutzerzuweisung.
2. **Gestaltfrage zur Freie-Räume-Suche:** Soll die Zeitauswahl eine eigene Ansicht sein („Raumsuche für Zeitraum X") oder in die bestehende Raumliste als zusätzlicher Filter integriert werden? Das Konzept legt das nicht fest; wir können es auch selbst entscheiden, eine Vorgabe nimmt uns aber Nacharbeit.

## Empfehlung für den nächsten Sprint

- **Check-in und automatische No-Show-Freigabe umsetzen** (Anforderungen 11 und 12, beide Hoch): Das Design-Konzept liegt frisch und konkret vor, der Beschluss zur Wirkung steht (Buchung bleibt als „nicht erschienen" erhalten), und die konfigurierbare Frist ist Teil des Umfangs.
- **Freie-Räume-Suche im Frontend sichtbar machen**, damit Anforderung 4 über die API hinaus nutzbar wird – die Serverlogik ist getestet, es fehlt nur die Bedienoberfläche.
- **Rollenmodell und Nutzerzuweisung (15, 16) zurückstellen, solange die Login-Frage offen ist** – ohne geklärtes Anmeldeverfahren würden wir dort Insellösungen bauen. Als Puffer, falls der Sprint Luft hat: Serienbuchungen (Anforderungen 9, 10), die unabhängig davon umsetzbar sind.

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 33025).
