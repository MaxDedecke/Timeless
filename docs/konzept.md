# Konzept (freigegeben, Version 1)

# Raumbuchungssystem statt Robin/Skedda

## Ausgangslage
Heute im Einsatz: klassische Raumbuchungs-SaaS wie Robin, Skedda oder Envoy Rooms.
Preisrahmen des Originals: ca. 3–6 $/Raum/Monat bzw. 5–15 $/Nutzer/Monat, je nach Anbieter und Ausbaustufe.
Doppelbuchungen durch parallele Outlook-Einträge, keine Übersicht über Ausstattung (Beamer, Videokonferenz, Kapazität), Meetingräume werden reserviert und dann nicht genutzt (No-Shows), Gäste müssen für eine Buchung erst einen Account bekommen.

## Ziel
Eine eigene Webanwendung, mit der Mitarbeitende Räume nach Ausstattung und Verfügbarkeit finden und buchen können, Facility-Verantwortliche die Auslastung sehen und No-Shows automatisch wieder freigegeben werden.

## Kernmodule
- Raum- und Ausstattungsverwaltung (Standort, Kapazität, Ausstattung wie Beamer/Video/Whiteboard)
- Kalenderansicht je Raum und Tagesansicht über alle Räume eines Standorts
- Buchungsformular mit automatischer Konfliktprüfung (keine Doppelbuchung)
- Wiederkehrende Buchungen (täglich/wöchentlich, mit Serienbearbeitung)
- Check-in-Funktion mit automatischer Freigabe bei No-Show nach X Minuten
- Genehmigungsworkflow für große Räume/Externe-Buchungen (optional je Raum)
- Rollen: Admin, Facility-Manager, Mitarbeiter, Buchung für Gäste durch Mitarbeitende
- Benachrichtigungen per E-Mail bei Buchung, Änderung, Stornierung, Erinnerung
- Auslastungsbericht je Raum/Standort/Zeitraum

## Bewusst nicht im Umfang
- Keine Anbindung an elektronische Schließanlagen/Zutrittskontrolle
- Keine Zahlungsabwicklung oder Catering-Bestellung
- Kein IoT-Sensor-basiertes Belegungstracking (Stufe 1 läuft rein auf Buchungsdaten)
- Kein Desk-Booking/Arbeitsplatzbuchung – nur Räume

## Schnittstellen
- iCal-Export/Abo je Raum, damit Outlook/Google Calendar den Raumkalender spiegeln können
- E-Mail-Versand von Einladungen inkl. .ics-Anhang
- Einfache REST-Schnittstelle für ein Anzeige-Display (Tablet-Modus) vor der Raumtür

## Blockiert auf Zulieferung durch den Kunden
Das sind keine Anforderungen für das Team, sondern Voraussetzungen, ohne die die betroffenen Module nicht startklar sind. Nicht als normale Sprint-Story einplanen – erst als Klärung stellen, danach die eigentliche Anforderung generieren.
- Da Testprojekt: reale Raum-/Ausstattungsliste durch Testdaten ersetzen (z. B. 3 Standohe Kapazitäten/Ausstattung)
- Entscheidung, ob Genehmigungspflicht grundsätzlich aktiv ist oder nur je Raum konfigurierbar sein muss
- SSO/Login-Verfahren (oder für den Test: einfacher E-Mail-Login ausreichend)

## Vor der Freigabe zu klären
- Wie viele Standorte/Gebäude zum Start, wie viele Räume je Standort?
- Sind Ausstattungsgegenstände (Beamer, Kamera) eigene buchbare Objekte oder nur Filtera
- Dürfen externe Gäste ohne eigenen Account buchen (nur über Mitarbeitende) oder brauchen sie einen Gastzugang?
- Nutzerzahl, Rollen und Rechte zum Start
- Betrieb: eigene Infrastruktur oder gehostet, Backup- und Ausfallkonzept	
