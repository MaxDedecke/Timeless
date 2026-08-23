// Wegwerf-Sonde: Welche SQL-Konstrukte trägt pg-mem für den Verfügbarkeits-Endpunkt?
import { InMemoryDb } from "./test/helpers/in-memory-db.js";

const db = await InMemoryDb.migrated();
try {
  const loc = await db.query<{ id: number }>(
    "INSERT INTO locations (name) VALUES ('Probe') RETURNING id::int AS id"
  );
  const locationId = loc.rows[0].id;
  const room = await db.query<{ id: number }>(
    "INSERT INTO rooms (name, location_id, capacity) VALUES ('Probe-Raum', $1, 5) RETURNING id::int AS id",
    [locationId]
  );
  const roomId = room.rows[0].id;
  await db.query(
    "INSERT INTO bookings (room_id, created_by, starts_at, ends_at) VALUES ($1, 'p@example.com', $2::timestamptz, $3::timestamptz)",
    [roomId, "2026-09-01T10:00:00Z", "2026-09-01T11:00:00Z"]
  );
  await db.query(
    "INSERT INTO room_amenities (room_id, amenity_id) VALUES " +
      "((SELECT id FROM rooms WHERE name = 'Probe-Raum'), (SELECT id FROM amenities WHERE key = 'beamer'))"
  );

  const von = "2026-09-01T12:00:00Z";
  const bis = "2026-09-01T13:00:00Z";

  const varianten: Array<[string, string, unknown[]]> = [
    ["M Anti-Join (LEFT JOIN + IS NULL)",
      `SELECT r.id::int AS id, r.name AS name, r.location_id::int AS "locationId", r.capacity, l.name AS "locationName"
       FROM rooms r
       JOIN locations l ON l.id = r.location_id
       LEFT JOIN bookings b ON b.room_id = r.id AND b.starts_at < $2::timestamptz AND b.ends_at > $1::timestamptz
       WHERE b.id IS NULL
       ORDER BY r.name`,
      [von, bis]],
    ["H NOT EXISTS, außen ohne Join",
      `SELECT r.id::int AS id FROM rooms r
       WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND b.starts_at < $2::timestamptz AND b.ends_at > $1::timestamptz)`,
      [von, bis]],
    ["I NOT EXISTS, außen mit Join",
      `SELECT r.id::int AS id, l.name AS "locationName"
       FROM rooms r JOIN locations l ON l.id = r.location_id
       WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND b.starts_at < $2::timestamptz AND b.ends_at > $1::timestamptz)`,
      [von, bis]],
    ["L IN-Liste mit Parametern",
      `SELECT ra.room_id::int AS "roomId", a.key, a.label
       FROM room_amenities ra JOIN amenities a ON a.id = ra.amenity_id
       WHERE ra.room_id IN ($1, $2)`,
      [roomId, roomId + 1]],
    ["K kollidierender Zeitraum (Anti-Join, Treffer erwartet: 0 Zeilen)",
      `SELECT r.id::int AS id
       FROM rooms r
       LEFT JOIN bookings b ON b.room_id = r.id AND b.starts_at < $2::timestamptz AND b.ends_at > $1::timestamptz
       WHERE b.id IS NULL`,
      ["2026-09-01T10:30:00Z", "2026-09-01T11:30:00Z"]],
  ];

  for (const [name, sql, values] of varianten) {
    try {
      const res = await db.query(sql, values);
      console.log(`OK   ${name}`, JSON.stringify(res.rows));
    } catch (err) {
      console.log(`FAIL ${name}:`, err instanceof Error ? err.message.split("\n")[0] : String(err));
    }
  }
} finally {
  await db.end();
}
