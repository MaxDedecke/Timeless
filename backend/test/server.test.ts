import assert from "node:assert/strict";
import { after, test } from "node:test";
import request from "supertest";
import app from "../src/server.js";
import { pool } from "../src/db.js";

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
