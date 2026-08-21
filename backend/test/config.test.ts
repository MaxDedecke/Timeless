import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDbConfig } from "../src/db.js";

test("DB-Konfiguration: Default-Host ist der Compose-Servicename postgres:5432", () => {
  const config = buildDbConfig({});
  assert.equal(config.host, "postgres");
  assert.equal(config.port, 5432);
});

test("DB-Konfiguration: Env-Variablen überschreiben die Defaults", () => {
  const config = buildDbConfig({
    PGHOST: "db.intern",
    PGPORT: "6543",
    PGDATABASE: "andere",
    PGUSER: "u",
    PGPASSWORD: "p",
  });
  assert.equal(config.host, "db.intern");
  assert.equal(config.port, 6543);
  assert.equal(config.database, "andere");
});
