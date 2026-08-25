-- Migration 005: Gäste einer Buchung (Anforderung 1: Buchung für Gäste ohne eigenen Account)
--
-- Gäste sind keine Nutzer*innen – sie werden als Teilnehmer einer Buchung
-- erfasst (Name/E-Mail) und erhalten keinen Account. Die Tabelle
-- booking_guests speichert sie der Buchung zu, referenziert bookings.id
-- per Fremdschlüssel mit ON DELETE CASCADE (stornierte Buchungen nehmen
-- ihre Gäste mit), wie es das Design-Konzept „API und Datenmodell"
-- vorsieht. Der Primärschlüssel ist eine eigene id-Spalte plus booking_id.
--
-- Kein UNIQUE-Constraint auf (booking_id, email): Ein buchender darf denselben
-- Gast mehrfach angeben (z. B. zwei Termine, zwei Personen gleicher Firma);
-- die Service-Schicht verhindert doppelte Gäste pro Anlage-Request, nicht die
-- Datenbank.

CREATE TABLE IF NOT EXISTS booking_guests (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_guests_booking_id ON booking_guests (booking_id);
