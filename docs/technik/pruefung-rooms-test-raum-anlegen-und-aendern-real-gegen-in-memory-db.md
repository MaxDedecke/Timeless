# Automatische Prüfung: rooms.test.ts – Raum-Anlegen und -Ändern real gegen In-Memory-DB

Ticket „rooms.test.ts: Raum-Anlegen und -Ändern real gegen In-Memory-DB“: Die Tests für
Anlegen (inkl. GET-Nachweis), die drei Pflichtfeld-Ablehnungen und das Ändern von
Standort/Kapazität laufen containerlos real gegen die In-Memory-Testnaht
(`FakeDbSession`/`FakePool` aus `test/helpers/fake-pool.ts` über `__setPoolForTests`,
Service-Ebene statt supertest – dieselbe Naht wie in `locations.test.ts`).
Transaktions-SQL landet im Protokoll des Clients aus `pool.connect()`, Zählungen
betrachten Pool- und Client-Protokoll gemeinsam (`recordedSql`).

## Zuordnung Test ↔ Akzeptanzkriterium

| Test (backend/test/rooms.test.ts) | Akzeptanzkriterium |
| --- | --- |
| „Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar“ | Anf. 1, Kriterium 1: Raum lässt sich mit Name, Standort, Kapazität anlegen und erscheint danach (hier: Detailabruf `getRoom` mit allen drei Feldern); genau ein INSERT, kein versteckter zweiter Schreibzugriff. |
| „Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird“ | Anf. 1, Kriterium 3: Ohne Name keine Speicherung – ValidationError mit Meldung, kein INSERT und nicht einmal ein Standort-Check im Protokoll. |
| „Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird“ | Anf. 1, Kriterium 3: Ohne Standort keine Speicherung (gleiche Assertion-Familie). |
| „Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird“ | Anf. 1, Kriterium 3: Ohne Kapazität keine Speicherung (gleiche Assertion-Familie). |
| „Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar“ | Anf. 1, Kriterium 2: Standort und Kapazität lassen sich nachträglich ändern; genau ein UPDATE, Parameterplatzhalter je gebundenem Wert (deckt den früheren fehlenden `$` vor dem ID-Platzhalter ab), Name bleibt unangetastet, Änderung per `getRoom` nachlesbar. |

Zusätzlich absichern die vorhandenen API-Tests derselben Datei die Pflichtfeld-Ablehnung
auf Route-Ebene („POST/PUT/PATCH /api/rooms … wird mit 400 und Fehlermeldung abgelehnt“).

## Lauf (containerlos, Sandbox)

```
> timeless-backend@0.1.0 test
> node --import tsx --test test/*.test.ts

# Subtest: Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
ok 29 - Raum anlegen: createRoom schreibt Name, Standort und Kapazität; der Raum ist anschließend per getRoom abrufbar
# Subtest: Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
ok 30 - Raum anlegen mit fehlendem Namen wird abgelehnt, bevor die Datenbank berührt wird
# Subtest: Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
ok 31 - Raum anlegen mit fehlendem Standort wird abgelehnt, bevor die Datenbank berührt wird
# Subtest: Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
ok 32 - Raum anlegen mit fehlender Kapazität wird abgelehnt, bevor die Datenbank berührt wird
# Subtest: Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar
ok 33 - Standort und Kapazität ändern: updateRoom ändert genau diese Felder; die Änderung ist per getRoom sichtbar

# tests 35
# pass 35
# fail 0
# cancelled 0
# skipped 0
```

Exit-Code 0, kein `.skip`/`t.skip()` mehr in der Datei. Die beiden verbliebenen
Platzhalter-Tests „… Integrationsteil übersprungen …“ in `amenities.test.ts` und
`migrations.test.ts` sind benannte Tests anderer Dateien (Nachbar-Tickets der
Zerlegung), keine Skips im Sinne von node:test (`# skipped 0`) und gehören nicht
zu diesem Ticket.
