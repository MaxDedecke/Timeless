-- Migration 003: Buchungen
--
-- Grundlage des Buchungswesens (Sprint 2): Jede Buchung hängt an genau einem
-- Raum (room_id NOT NULL mit Fremdschlüssel) und trägt ihren Urheber als
-- Text – eine Users-Tabelle existiert noch nicht, weil die SSO-/Login-
-- Klärung beim Kunden blockiert ist. Steht der Nutzer fest, folgt die
-- Umstellung auf einen Fremdschlüssel als Nachzugs-Migration.
--
-- Löschverhalten bewusst RESTRICT: Ein Raum, zu dem Buchungen existieren,
-- ist nicht löschbar – die Buchungshistorie (u.a. Grundlage des Auslastungs-
-- berichts) bleibt geschützt. Kaskadieren würde stillschweigend Buchungen
-- mitlöschen.
--
-- Status als freier TEXT mit Default 'bestaetigt' statt CHECK/Enum: Die
-- pg-mem-Testnaht führt das SQL real aus; fachliche Statusregeln
-- (ausstehend/genehmigt/abgelehnt aus dem Genehmigungsworkflow, Freigabe bei
-- No-Show) setzt die Service-Schicht durch, sobald diese Tickets kommen.

CREATE TABLE IF NOT EXISTS bookings (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id    BIGINT NOT NULL REFERENCES rooms (id) ON DELETE RESTRICT,
    created_by TEXT NOT NULL,
    starts_at  TIMESTAMPTZ NOT NULL,
    ends_at    TIMESTAMPTZ NOT NULL,
    status     TEXT NOT NULL DEFAULT 'bestaetigt'
);

-- Konfliktprüfung (Doppelbuchung) und Raumkalender lesen Buchungen je Raum
-- nach Zeit – dieser Index deckt beide Zugriffe ab.
CREATE INDEX IF NOT EXISTS idx_bookings_room_id_starts_at ON bookings (room_id, starts_at);
