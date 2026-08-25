-- Migration 004: Genehmigungspflicht je Raum (Sprint 10, Anforderungen 13/14)
--
-- Pro Raum lässt sich festlegen, ob Buchungen genehmigungspflichtig sind oder
-- direkt bestätigt werden. Der Schalter liegt am Raum (nicht an der Buchung),
-- weil die Service-Schicht ihn beim Anlegen einer Buchung ablest und daraus
-- den Anfangsstatus ableitet: 'ausstehend' im pflichtigen Raum, sonst wie
-- bisher 'bestaetigt'.
--
-- Default false: Bestehende Räume verhalten sich unverändert weiter (jede
-- neue Buchung sofort bestätigt) – die Genehmigungspflicht ist ein Opt-in
-- je Raum.
--
-- Kein IF NOT EXISTS nötig: Der Läufer vermerkt jede Datei in
-- schema_migrations, sodass diese Migration exakt einmal läuft; auf das
-- von pg-mem ohnehin nur mit Sonderbehandlung verträgliche IF-NOT-EXISTS-
-- DDL wird hier bewusst verzichtet.

ALTER TABLE rooms
    ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT false;
