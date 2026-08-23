# Sprint 3 – Review

## Was gelief wurde

Sprint 3 hatte zwei Ziele: die Zustands- und Formatierungs-Muster aus Sprint 2 als verbindliche Referenz etablieren und die Grundlage legen, dass Buchungen sichtbar werden. Der erste Teil ist vollständig erledigt:

- **Design-Konzept mit verbindlichen Zustands-Mustern** (Ben Ritter, Commit 60616300): „Ladezustand" (Skeleton-Raster), „Fehleranzeige" (destructives Alert mit „Erneut versuchen", Submit-Spinner mit Alert-Reset) und „Leerzustand" sind in `docs/design-konzept.md` als verbindlich dokumentiert und gegen den tatsächlichen Code (RoomList, RoomForm, AmenityFilter) gegengeprüft.
- **Gemeinsamer Zeit-/Datumsformatierer** (Frida Lang, Commit 4d39bc2b): `formatTime` („HH:mm") und `formatDate` (de-DE, „So., 23.08.2026") in `frontend/src/lib/format.ts`, deterministisch, mit Platzhalter statt Throw bei ungültiger Eingabe. 7 Vitest-Tests, Gesamtsuite 43 Tests grün, tsc-Lint grün. Nutzungsregel steht im Konzept (Abschnitt „Datum & Uhrzeit").
- **BookingStatusBadge** (Ben Ritter, Commit 848e00c3): Feste Zuordnung Buchungsstatus → shadcn-Badge-Variante samt deutschem Label (bestätigt/genehmigt→success, ausstehend→warning, abgelehnt→destructive, eingecheckt→primary, „nicht erschienen"/unbekannt→neutral). Je Statuswert ein Rendering-Test plus Fallback-Test; als Abschnitt „Buchungsstatus-Badge" ins Konzept aufgenommen.

Damit stehen für die kommenden Kalender- und Tagesansichten Statusdarstellung, Zeitformate und Zustands-Muster als verbindliche Referenz bereit. Die Integrationsprüfung (voller Stack) ist bestanden, der Dienst „frontend" war erreichbar.

Prozesshinweis: Das Design-Konzept- und das Formatierer-Ticket wurden jeweils doppelt vergeben. Beide Zweit-Anläufe haben korrekt erkannt, dass die Arbeit bereits committet war, und nur nachgewiesen bzw. gegengeprüft statt doppelt zu bauen – kein Doppelschaden, aber die Doppelvergabe selbst hat unnötigen Prüfaufwand erzeugt.

## Was offen blieb (und warum)

- **Das Sprint-Ziel ist nur zur Hälfte erreicht: Der Kunde sieht noch keinen Raumkalender.** Kein Ticket in Sprint 3 betraf die Kalenderansicht je Raum (Anforderung 5) oder die Tagesansicht (Anforderung 6) – beide fehlen damit weiterhin im Frontend. Die technischen Grundlagen liegen seit Sprint 2 bereit (Buchungs-Tabelle, Buchungs-API mit Konfliktprüfung), und die in diesem Sprint etablierten Muster sind genau für diese Ansichten gemacht – gebaut wurde sie aber noch nicht.
- Die Integrationsprüfung ist bestanden; aus ihr ergibt sich keine offene Baustelle.

## Wo der Auftraggeber gefragt ist

Beide noch offenen Kunden-Zulieferungen (laut Beschluss vom 23.8. „jetzt direkt beantworten") liegen weiterhin beim Auftraggeber:

1. **Testdaten statt realer Raumliste**: Wie viele Standorte, wie viele Räume je Standort, mit welchen Kapazitäten und Ausstattungsmerkmalen sollen die Testdaten abbilden? Ohne diese Angabe bleiben Demo- und Prüfdaten notgedrungen erfunden.
2. **Login-Verfahren**: Reicht für den Testbetrieb ein einfacher E-Mail-Login, oder ist ein konkretes SSO-Verfahren vorzugeben? Davon hängen das Rollenmodell (Anforderung 15/16) und die erkennbare Urheberschaft von Buchungen (Anforderung 7) ab.

Beides blockiert aktuell kein Sprint-4-Ticket direkt, sollte aber beantwortet sein, bevor Rollen und Buchende mit echten Nutzern angefasst werden.

## Empfehlung für den nächsten Sprint

- **Sprint 4 sollte das ausstehende Sprint-3-Ziel liefern: die Kalenderansicht je Raum** (Anforderung 5). Alle Bausteine sind fertig – Buchungsdatenmodell und -API aus Sprint 2, Status-Badge, Formatierer, Zustands-Muster aus Sprint 3. Die Ansicht ist damit im Wesentlichen Zusammensetzen nach dokumentierter Referenz.
- Danach die **Tagesansicht über alle Räume eines Standorts** (Anforderung 6) anstreben; sie teilt mit der Raumkalender-Ansicht Formatierer, Badge und Zustands-Muster.
- Die beiden Zulieferungs-Fragen (Testdaten, Login) parallel beim Auftraggeber nachhalten, damit der Sprint danach Rollenmodell und Buchende mit echten Nutzern angehen kann.

## Anhang: Integrationsprüfung (voller Stack)
Bestanden. Voller Stack erreichbar (Dienst „frontend", Port 32986).
