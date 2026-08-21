-- Migration 001: Standorte und Räume
--
-- Beschluss vom 21.8.2026: Standorte sind verwaltete Objekte (eigene Tabelle),
-- kein Freitext-Standort am Raum. Ein Raum existiert nur mit gültigem Standort –
-- daher location_id als NOT NULL mit Fremdschlüssel auf locations.id.

CREATE TABLE IF NOT EXISTS locations (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    location_id BIGINT NOT NULL REFERENCES locations (id),
    capacity    INTEGER NOT NULL
);

-- Tagesansicht und Raumsuche fragen Räume je Standort ab.
CREATE INDEX IF NOT EXISTS idx_rooms_location_id ON rooms (location_id);
