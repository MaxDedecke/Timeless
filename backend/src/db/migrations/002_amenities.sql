-- Migration 002: Ausstattungsmerkmale und ihre Zuordnung zu Räumen
--
-- Beschluss vom 21.8.2026 (Pia Ostermann): Die Menge der Ausstattungsmerkmale
-- kommt zunächst aus einem festen Katalog (unten per Seed eingefügt). Die
-- Merkmale sind trotzdem ein eigenes Datenobjekt (Tabelle amenities) – wird
-- später entschieden, dass Admins Merkmale frei verwalten können, bleibt das
-- ein kleines Nachzugs-Ticket (Schreib-Endpunkte), kein Umbau des Modells.

CREATE TABLE IF NOT EXISTS amenities (
    id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key   TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL
);

-- Zuordnungstabelle als echte Menge: Der zusammengesetzte Primärschlüssel
-- verhindert doppelte Zuordnungen desselben Merkmals zum selben Raum.
-- ON DELETE CASCADE: Wird ein Raum gelöscht, gehen seine Zuordnungen mit.
CREATE TABLE IF NOT EXISTS room_amenities (
    room_id    BIGINT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    amenity_id BIGINT NOT NULL REFERENCES amenities (id),
    PRIMARY KEY (room_id, amenity_id)
);

-- Die gefilterte Raumliste fragt auch in Gegenrichtung ab (Merkmal -> Räume).
CREATE INDEX IF NOT EXISTS idx_room_amenities_amenity_id ON room_amenities (amenity_id);

-- Fester Katalog zum Start (Anforderung 1 nennt Beamer, Videokonferenz,
-- Whiteboard). ON CONFLICT macht den Seed wiederholbar und idempotent.
INSERT INTO amenities (key, label) VALUES
    ('beamer', 'Beamer'),
    ('videokonferenz', 'Videokonferenz'),
    ('whiteboard', 'Whiteboard')
ON CONFLICT (key) DO NOTHING;
