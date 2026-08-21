import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";

// Diese Suite prüft das Verhalten bei NICHT erreichbarer Datenbank – das soll
// in jedem Umfeld gelten, auch im Backend-Container, wo über den
// Compose-Servicenamen sehr wohl eine Postgres erreichbar sein kann. Damit der
// Fall deterministisch bleibt, zeigt der Pool dieser Suite bewusst auf eine
// Loopback-Adresse, auf der nichts lauscht (die Verbindung wird sofort
// abgewiesen). Die Variablen müssen gesetzt sein, BEVOR db.ts den Pool baut –
// deshalb werden App und Pool hier dynamisch importiert statt oben statisch.
// dotenv überschreibt bereits gesetzte Env-Variablen nicht, die Werte gelten
// also auch dann, wenn eine .env oder die Container-Umgebung etwas anderes
// enthält.
process.env.PGHOST = "127.0.0.1";
process.env.PGPORT = "1";

const { default: app } = await import("../src/server.js");
const { pool } = await import("../src/db.js");

after(async () => {
  // Pool schließen, damit der Testlauf sauber endet.
  await pool.end();
});

test("GET /api/health liefert Status ok", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("GET /api/health/ready meldet degradiert (503), wenn die DB nicht erreichbar ist", async () => {
  const res = await request(app).get("/api/health/ready");
  assert.equal(res.status, 503);
  assert.equal(res.body.database, "down");
});
