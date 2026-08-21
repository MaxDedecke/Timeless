# Anforderungen (freigegeben)

## Räume mit Standort und Kapazität verwalten

- Priorität: Hoch

Verantwortliche können Räume anlegen und bearbeiten. Jeder Raum hat einen Namen, einen Standort und eine Kapazität.

## Akzeptanzkriterien
- Ein neuer Raum lässt sich mit Name, Standort und Kapazität anlegen und erscheint danach in der Raumliste.
- Standort und Kapazität eines bestehenden Raums lassen sich nachträglich ändern.
- Ein Raum ohne Name, Standort oder Kapazität kann nicht gespeichert werden.

## Ausstattungsmerkmale je Raum pflegen

- Priorität: Hoch

Je Raum lassen sich Ausstattungsmerkmale wie Beamer, Videokonferenztechnik oder Whiteboard hinterlegen und später ändern.

## Akzeptanzkriterien
- Beim Anlegen und Bearbeiten eines Raums lassen sich Ausstattungsmerkmale zuordnen.
- Die zugeordneten Merkmale werden in der Raumliste bzw. Raumdetailansicht angezeigt.
- Ein zugeordnetes Merkmal lässt sich wieder vom Raum entfernen.

## Raumliste nach Ausstattung filtern

- Priorität: Hoch

Mitarbeitende können die Raumliste nach benötigten Ausstattungsmerkmalen filtern, um passende Räume zu finden.

## Akzeptanzkriterien
- Filtern nach einem Merkmal (z.B. Beamer) zeigt ausschließlich Räume mit dieser Ausstattung.
- Bei kombinierter Filterung nach mehreren Merkmalen werden nur Räume angezeigt, die alle gewählten Merkmale besitzen.
- Ohne gesetzten Filter werden alle Räume angezeigt.

## Freie Räume für einen Wunschzeitraum ermitteln

- Priorität: Hoch

Die Raumsuche berücksichtigt bestehende Buchungen und zeigt an, welche Räume im gewünschten Zeitraum verfügbar sind.

## Akzeptanzkriterien
- Für einen gewählten Zeitraum werden nur Räume als verfügbar gelistet, die keine überschneidende Buchung haben.
- Ein Raum mit kollidierender Buchung im Zeitraum wird nicht als frei angezeigt.
- Nach erfolgreicher Buchung gilt der Raum für diesen Zeitraum nicht mehr als frei.

## Kalenderansicht je Raum bereitstellen

- Priorität: Hoch

Pro Raum gibt es eine Kalenderansicht, die dessen Buchungen zeitlich geordnet zeigt.

## Akzeptanzkriterien
- Die Raumansicht zeigt vorhandene Buchungen mit Start- und Endzeit.
- Freie Zeitfenster sind von belegten unterscheidbar.
- Eine neu angelegte Buchung erscheint unmittelbar in der Kalenderansicht des Raums.

## Tagesansicht über alle Räume eines Standorts

- Priorität: Hoch

Es gibt eine Tagesansicht, die alle Räume eines ausgewählten Standorts mit deren Buchungen am jeweiligen Tag gegenüberstellt.

## Akzeptanzkriterien
- Die Ansicht listet alle Räume des gewählten Standorts mit ihren Buchungen des gewählten Tags.
- Räume anderer Standorte erscheinen nicht in der Ansicht.
- Belegte und freie Zeitfenster sind je Raum unterscheidbar.

## Buchung über Formular anlegen

- Priorität: Hoch

Mitarbeitende legen über ein Buchungsformular eine Buchung mit Raum, Datum sowie Start- und Endzeit an.

## Akzeptanzkriterien
- Eine Buchung mit Raum, Datum, Start- und Endzeit lässt sich abspeichern.
- Die gespeicherte Buchung erscheint anschließend im Raumkalender und in der Tagesansicht des Standorts.
- Der Buchende ist in der Buchung als Urheber erkennbar.

## Konfliktprüfung gegen Doppelbuchungen

- Priorität: Dringend

Beim Speichern prüft das System, ob im gewählten Raum bereits eine überschneidende Buchung existiert, und verhindert die Doppelbuchung.

## Akzeptanzkriterien
- Eine Buchung, die mit einer bestehenden Buchung desselben Raums überlappt, wird mit einer verständlichen Fehlermeldung abgelehnt.
- Direkt aneinander angrenzende Buchungen (Back-to-back) im selben Raum sind zulässig.
- Zwei gleichzeitig abgesendete Buchungen desselben Raums und Zeitraums führen zu genau einer erfolgreichen Buchung.

## Wiederkehrende Buchung täglich oder wöchentlich anlegen

- Priorität: Mittel

Beim Buchen kann eine Serie mit täglichem oder wöchentlichem Rhythmus angelegt werden, die mehrere Termine erzeugt.

## Akzeptanzkriterien
- Bei Wahl von „täglich“ entstehen Buchungen an allen aufeinanderfolgenden Tagen bis zum gewählten Serienende.
- Bei Wahl von „wöchentlich“ entsteht jeweils am gleichen Wochentag pro Woche ein Termin bis zum Serienende.
- Alle erzeugten Serientermine erscheinen im Raumkalender.

## Serienbearbeitung für Einzeltermin und Gesamtserie

- Priorität: Mittel

Wiederkehrende Buchungen lassen sich nachträglich bearbeiten oder löschen – entweder nur ein einzelner Serientermin oder die gesamte Serie.

## Akzeptanzkriterien
- Beim Bearbeiten oder Löschen eines Serientermins wird abgefragt, ob nur dieser Termin oder die gesamte Serie gemeint ist.
- Wird nur ein einzelner Termin geändert oder gelöscht, bleiben die übrigen Serientermine unverändert.
- Wird die gesamte Serie geändert oder gelöscht, wirken sich Änderung bzw. Löschung auf alle zukünftigen Serientermine aus.

## Check-in für laufende Buchung ermöglichen

- Priorität: Hoch

Buchende können ihre aktuelle Buchung per Check-in bestätigen, damit sie tatsächlich genutzt wird.

## Akzeptanzkriterien
- Für die eigene, aktuell laufende Buchung ist eine Check-in-Möglichkeit sichtbar.
- Nach dem Check-in wird die Buchung als eingecheckt markiert.
- Eine eingecheckte Buchung wird nicht durch die No-Show-Logik freigegeben.

## Automatische Freigabe bei No-Show nach konfigurierbarer Frist

- Priorität: Hoch

Wird eine laufende Buchung nicht innerhalb einer konfigurierbaren Frist nach Beginn eingecheckt, gibt das System den Raum automatisch wieder frei.

## Akzeptanzkriterien
- Eine Buchung ohne Check-in wird X Minuten nach Beginnzeit automatisch freigegeben und erscheint nicht mehr als belegt.
- Eine rechtzeitig eingecheckte Buchung bleibt bestehen.
- Die Frist X lässt sich in der Konfiguration ändern und wird bei der automatischen Freigabe entsprechend angewendet.

## Genehmigungspflicht je Raum konfigurierbar machen

- Priorität: Mittel

Pro Raum lässt sich festlegen, ob Buchungen genehmigungspflichtig sind oder direkt bestätigt werden.

## Akzeptanzkriterien
- Bei einem Raum lässt sich die Genehmigungspflicht aktivieren und deaktivieren.
- In einem Raum ohne Genehmigungspflicht wird eine neue Buchung sofort bestätigt.
- In einem Raum mit Genehmigungspflicht erhält eine neue Buchung zunächst den Status „ausstehend“ und blockiert den Zeitraum.

## Genehmigungsworkflow zum Prüfen und Entscheiden von Anfragen

- Priorität: Mittel

Berechtigte Rollen sehen offene Genehmigungsanfragen und können sie genehmigen oder ablehnen; das Ergebnis ist für den Antragsteller erkennbar.

## Akzeptanzkriterien
- Offene Genehmigungsanfragen sind für die berechtigte Rolle in einer Liste sichtbar.
- Nach Genehmigung hat die Buchung den Status „genehmigt“ und belegt den Zeitraum verbindlich.
- Nach Ablehnung gibt das System den angefragten Zeitraum wieder frei.
- Der Antragsteller kann den Status seiner Anfrage (ausstehend, genehmigt, abgelehnt) einsehen.

## Rollenmodell mit Admin, Facility-Manager und Mitarbeiter

- Priorität: Hoch

Das System unterscheidet die Rollen Admin, Facility-Manager und Mitarbeiter mit unterschiedlichen Rechten: Mitarbeiter buchen, Facility-Manager verwalten zusätzlich Räume und Auslastung, Admin hat sämtliche Verwaltungsrechte.

## Akzeptanzkriterien
- Ein Nutzer mit Rolle Mitarbeiter kann Buchungen anlegen, aber weder Räume verwalten noch Auslastungsberichte aufrufen.
- Ein Facility-Manager kann Räume verwalten und Auslastungsberichte einsehen.
- Ein Admin hat Zugriff auf alle Verwaltungsfunktionen, die den anderen Rollen verwehrt sind.

## Nutzern Rollen zuweisen

- Priorität: Mittel

Administratoren können Nutzern die Rollen Admin, Facility-Manager oder Mitarbeiter zuweisen und ändern.

## Akzeptanzkriterien
- Ein Admin kann einem Nutzer eine der drei Rollen zuweisen.
- Die zugewiesene Rolle bestimmt die sichtbaren Funktionen des Nutzers.
- Nach einer Rollenänderung gelten die neuen Rechte für den betroffenen Nutzer.

## Buchung für Gäste ohne eigenen Account

- Priorität: Hoch

Mitarbeitende können Gäste als Teilnehmer in eine Buchung aufnehmen, ohne dass diese einen Account oder Login benötigen.

## Akzeptanzkriterien
- Im Buchungsformular lassen sich Gäste mit ihren Angaben erfassen, ohne dass diese registriert sind.
- Die Buchung mit Gästen lässt sich erfolgreich speichern.
- Die erfassten Gäste sind in der Buchung sichtbar.

## E-Mail-Benachrichtigungen bei Buchung, Änderung und Stornierung

- Priorität: Mittel

Bei jeder Buchung, Änderung und Stornierung wird automatisch eine E-Mail über den Vorgang versendet.

## Akzeptanzkriterien
- Nach dem Anlegen einer Buchung wird eine Benachrichtigungs-E-Mail mit Raum und Zeitraum versendet.
- Nach einer Änderung der Buchung wird eine E-Mail mit den aktualisierten Angaben versendet.
- Nach einer Stornierung wird eine E-Mail über die Stornierung versendet und der Raum ist wieder als frei geführt.

## Erinnerungs-E-Mail vor Buchungsbeginn senden

- Priorität: Mittel

Vor Beginn einer Buchung erhalten die Beteiligten automatisch eine Erinnerungs-E-Mail.

## Akzeptanzkriterien
- Vor dem Beginn einer bestehenden Buchung wird eine Erinnerungs-E-Mail mit Raum und Uhrzeit versendet.
- Für stornierte Buchungen wird keine Erinnerung versendet.

## Einladungs-E-Mail mit .ics-Anhang versenden

- Priorität: Mittel

Zu einer Buchung wird eine Einladungs-E-Mail mit .ics-Kalenderdatei versendet, damit Empfänger den Termin direkt in ihren Kalender übernehmen können.

## Akzeptanzkriterien
- Zur Buchung wird eine E-Mail mit .ics-Anhang versendet.
- Die .ics-Datei lässt sich in Outlook oder Google Calendar importieren und erzeugt dort den Termin mit Raum, Datum und Uhrzeit.
- Bei Änderung oder Stornierung der Buchung wird eine aktualisierte bzw. stornierende Kalendereinladung versendet.

## iCal-Abo je Raum für Outlook und Google Calendar

- Priorität: Mittel

Für jeden Raum steht eine iCal-Abo-URL bereit, über die Outlook oder Google Calendar den Raumkalender spiegeln können.

## Akzeptanzkriterien
- Zu jedem Raum existiert eine abonnierbare iCal-URL.
- Nach dem Abonnieren in Outlook oder Google Calendar erscheinen die aktuellen Buchungen des Raums im externen Kalender.
- Neue, geänderte und stornierte Buchungen werden beim Aktualisieren des Abos im externen Kalender nachgezogen.

## REST-Schnittstelle für Raumdisplay im Tablet-Modus

- Priorität: Niedrig

Eine einfache REST-Schnittstelle liefert die Daten für ein Anzeige-Display vor der Raumtür, etwa den aktuellen und den nächsten Termin des Raums.

## Akzeptanzkriterien
- Ein REST-Aufruf je Raum liefert maschinenlesbar (JSON) den aktuellen und den nächsten Termin mit Zeiten.
- Ist der Raum aktuell frei, liefert die Schnittstelle eine entsprechende „frei“-Angabe statt eines laufenden Termins.
- Die Schnittstelle antwortet auch, wenn der Raum keinerlei Buchungen hat.

## Auslastungsbericht je Raum, Standort und Zeitraum

- Priorität: Mittel

Facility-Verantwortliche rufen einen Auslastungsbericht ab, der die Raumnutzung je Raum, Standort und Zeitraum ausweist.

## Akzeptanzkriterien
- Der Bericht lässt sich nach Raum, Standort und Zeitraum filtern.
- Der Bericht weist die Auslastung auf Basis der Buchungsdaten aus (belegte im Verhältnis zur verfügbaren Zeit).
- Die ausgewiesenen Werte stimmen mit den tatsächlich vorhandenen Buchungen im gewählten Zeitraum überein.
