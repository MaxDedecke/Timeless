import { pool } from "../db.js";
import { runMigrations } from "./migrate.js";

// Eigenständiger Aufrufpunkt für die Migration (`npm run migrate`). Der normale
// Serverstart führt sie ebenfalls automatisch aus (siehe main.ts).
try {
  const applied = await runMigrations();
  console.log(
    applied.length > 0
      ? `Migrationen angewendet: ${applied.join(", ")}`
      : "Datenbankschema ist aktuell – keine Migrationen nötig."
  );
} catch (err) {
  console.error("Migration fehlgeschlagen:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
