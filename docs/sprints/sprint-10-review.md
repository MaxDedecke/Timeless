# Sprint 10 – Review
## Was geliefert wurde
In Sprint 10 wurden alle im Ziel genannten Funktionen umgesetzt und in der Integrationsprüfung bestätigt:
- **Backend:** Das Flag „requires_approval“ wurde je Raum migriert und die Raum-API erweitert. Buchungen erhalten bei genehmigungspflichtigen Räumen automatisch den Status „ausstehend“, bei nicht pflichtigen Räumen sofort „bestätigt“. Die Konfliktprüfung bleibt unter der Raumsperre funktionsfähig, Back-to-back-Buchungen bleiben zulässig. Alle pg-mem-Tests der Suite bestanden.
- **Frontend:** Im RoomForm wurde ein shadcn/ui-Switch für „Genehmigungspflichtig“ integriert. Der Standwert beim Anlegen ist ausgestellt, beim Bearbeiten wird der vorhandene Wert vorbelegt. Die Raumliste kennzeichnet pflichtige Räume mit einem Warning-Badge. Es wurden 6 neue Tests hinzugefügt; die Gesamtsuite umfasst nun 139 Tests bei voller Grüner.
- **Frontend:** Die Gäste-Erfassung im BookingForm ist fertiggestellt. Gäste können optional mit Namen und E-Mail erfasst werden; bei Speicherung werden sie als `guests: [{ name, email }, …]` an die API übermittelt und im Kalenderslot als Badge angezeigt.
- **Design-Konzept:** Das Zusammenspiel von Status- und Gäste-Badge im Kalenderslot wurde gegen den Code geprüft und entspricht exakt den etablierten Mustern – es gab keinen Widerspruch und keinen zusätzlichen Codeeingriff. Der vorherige QA-Prüfstand mit einem fehlgeschlagenen Subtest war nicht reproduzierbar.

Integrierte Prüfung: Der volle Stack war erreichbar (Dienst „frontend“, Port 33195), alle Prüfskripte erfolgreich.

## Was offen blieb (und warum)
Es gab keine offen gebliebenen funktionalen Anforderungen des Sprint-Ziels. Frühere Anläufe in Sprint 9 (No-Show-Status, Genehmigungsworkflow-UI) hatten multiple Versuche benötigt, sind aber in diesem Sprint entsprechend der Beschlüsse vom 25.8.2026 nachgezogen und abgeschlossen. Keine technischen Blocker.

## Wo der Auftraggeber gefragt ist
Alle in diesem Sprint umgesetzten Funktionen entsprechen den freigegebenen Anforderungen (13–17, 19–22) und den Beschlüssen des Auftraggebers (insb. 25.8.2026 zu Sprint-10-Grundlagen). Es sind keine neuen Entscheidungen des Auftraggebers für den Abschluss dieses Sprints erforderlich.

## Empfehlung für den nächsten Sprint
Das Sprint-Ziel „Räume als genehmigungspflichtig markieren, ausstehende Anfragen sehen, Gäste ohne Account buchen“ ist erfüllt und in der Integration geprüft. Die nächste Priorität ergibt sich aus dem weitergeführten Product Backlog; es empfiehlt sich, die stabilen Basisfunktionen in einem kurzen Retrospektiv-Check zu validieren und die als nächstesten Backlog-Items (z. B. Feinschliffe bei Benachrichtigungen, iCal-Export oder Performance-Optimierung) in den nächsten Sprint zu übernehmen. Eine konkrete Sprintziele-Empfehlung steht im aktuellen Backlog und wird entsprechend der Scrum-Rhythmik festgelegt.

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 33195).
