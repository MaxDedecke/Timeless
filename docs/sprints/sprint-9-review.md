# Sprint 9 – Review

## Was geliefert wurde

**No-Show-Status in beiden Kalenderansichten sichtbar** (Ben Ritter)
Das TimeGrid rendert no-show-freigegebene Slots in Raumkalender (`/rooms/:id`) und Tagesansicht (`/day/:id`) im freien Stil (Muted-Fläche, gestrichelter Rand) inkl. Badge „Nicht erschienen" gemäß Sprint-5-Konzept – ohne Check-in-Button; bestätigt/eingecheckt bleiben unverändert. Die Badge-Variante ist unit-getestet, der Tippfehler in TimeGrid/BookingStatusBadge ist korrigiert (Commits `3eeb99bf`, `8ebe6e52`).

**Check-in-Fenster folgt der konfigurierbaren Frist** (Frida Lang)
Das hartkodierte 15-Minuten-Fenster ist ersetzt: Das Backend liest `NO_SHOW_AFTER_MINUTES` (Default 15) via config-Service und liefert `noShowAfterMinutes` in jeder Booking-Antwort; das Frontend berechnet das Sichtbarkeitsfenster daraus, mit Default-15-Fallback. Unit-Tests decken eine abweichende Frist (10 Minuten) ab. Laut Ticketergebnis laufen 131 Frontend- und 78 Backend-Tests grün.

**Design-Konzept Genehmigungsworkflow** (Ben Ritter)
In `docs/design-konzept.md` verbindlich festgelegt: Sidebar-Punkt „Genehmigungen", Statusanzeige über BookingStatusBadge, Leer-/Lade-/Fehlerzustände, Genehmigen/Ablehnen-Bestätigungsdialog. Darüber hinaus wurden die Seite `/approvals` samt API-Client und Route bereits gebaut und im Browser ohne JavaScript-Fehler verifiziert (Commit `405b2a62`) – die Seite hat aber noch kein Backend dahinter (siehe unten).

**Design-Konzept Gäste-Erfassung** (Frida Lang)
Gäste als Teilnehmer ohne Account im Buchungsdialog (Name/E-Mail, dynamisch hinzufügen/entfernen, Inline-Validierung), Anzeige in Detailansicht und als Badge im Kalenderslot, Leerzustand definiert. Dazu die Datenvorarbeit: `BookingInput.guests`, Migration 004 mit `booking_guests`-Tabelle – Basis für Anforderung 17.

Automatische Ticketprüfungen: erfolgreich. **Integrationsprüfung: bestanden**, voller Stack erreichbar (Frontend, Port 33149).

## Was offen blieb (und warum)

- **Datenmodell für die Genehmigungspflicht je Raum fehlt.** Das ist Teil des Sprintziels („… dazu steht das Datenmodell … bereit"), taucht aber in keinem Sprint-9-Ticket oder Commit auf. Es war schlicht nicht als Ticket eingeplant – das Ziel war diesbezüglich zu hoch gesteckt. Muss nachgeholt werden.
- **Genehmigungs-Backend existiert nicht.** Die neue `/approvals`-Seite erhält von der API aktuell einen 404; im Ticketergebnis ist das als separates Backend-Ticket benannt. Die Anforderungen 13 und 14 sind funktional damit noch nicht erfüllt.
- **Gäste-Erfassung ist nicht bedienbar.** Konzept und Datengrundlage stehen, die Umsetzung im BookingForm und an der API (Anforderung 17) folgt erst.
- **Antwortentwurf zu den Zulieferungsfragen liegt weiterhin nicht vor.** Laut Ihrem Beschluss vom 24.8. sollte er im Sprint 8 entstehen; weder Sprint 8 noch Sprint 9 zeigen ein entsprechendes Ticket oder einen Commit. Wir ziehen ihn nach – Ihr müsst danach nur noch freigeben.
- **Organisatorisch:** Das Ticket „No-Show-Status in Raumkalender und Tagesansicht sichtbar machen" ist doppelt im Board abgeschlossen (zweites Exemplar ohne Ergebnis-Zusammenfassung, Prüfung grün). Bekanntes Dubletten-Muster aus Sprint 6/7 – sollte wie dort bereinigt werden.

## Wo der Auftraggeber gefragt ist

1. **Freigabe des Antwortentwurfs zu den Zulieferungsfragen** (Testdaten statt realer Raumliste; einfacher E-Mail-Login vs. SSO): Wir erstellen den Entwurf im nächsten Sprint und legen ihn Ihnen vor. Bis zu Ihrer Freigabe bleiben Login/Rollen-Anbindung blockiert.
2. **Genehmigungspflicht:** Im Konzept steht die Zulieferfrage „grundsätzlich aktiv oder nur je Raum konfigurierbar?" weiterhin offen. Anforderung 13 beschreibt die Konfigurierbarkeit je Raum – bitte bestätigen Sie, dass damit die Entscheidung gefallen ist (keine separate Grundeinstellung nötig), bevor wir Datenmodell und Workflow bauen.

## Empfehlung für den nächsten Sprint

Zielvorschlag: **Die vorbereiteten Konzepte funktional machen.**

- Datenmodell für Genehmigungspflicht je Raum nachziehen (Status ausstehend/genehmigt/abgelehnt, Kennzeichen am Raum) – holt den verpassten Teil des Sprint-9-Ziels nach.
- Backend-API für den Genehmigungsworkflow (offene Anfragen listen, genehmigen/ablehnen), damit die fertige `/approvals`-Seite ihren 404 verliert.
- Gäste-Erfassung im BookingForm auf Basis von Migration 004 umsetzen (Anforderung 17, Hoch).
- Antwortentwurf zu den Zulieferfragen erstellen und zur Freigabe einreichen.
- Kleinkram nebenbei: Dubletten-Exemplar „No-Show-Status" schließen; `seed-showcase.sh` endlich ins Repo aufnehmen – es existiert bislang nicht versioniert, gehört aber zum Standard, damit ein Start über Scrumy nicht mit leerer Anwendung dasteht.

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 33149).
