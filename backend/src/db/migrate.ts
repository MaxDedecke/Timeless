import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { pool } from "../db.js";

/**
 * Läufer für die SQL-Migrationen in src/db/migrations.
 *
 * Die Dateien werden in Dateinamen-Reihenfolge angewendet – deshalb sind die
 * Namen fortlaufend nummeriert (001_, 002_, …). Welche Migrationen bereits
 * gelaufen sind, wird in der Tabelle schema_migrations vermerkt; dadurch läuft
 * dieser Läufer fehlerfrei sowohl gegen eine frische als auch gegen eine
 * bereits migrierte Datenbank.
 *
 * Hinweis zur Build-Umgebung: tsc kopiert keine .sql-Dateien nach dist/. Das
 * Backend-Dockerfile nimmt src/db/migrations deshalb zusätzlich nach
 * dist/db/migrations auf – dieser Pfad liegt relativ zu dieser Datei.
 */
const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

// Advisory Lock in der Zwei-Schlüssel-Form, damit niemals zwei Prozesse
// (z. B. Serverstart und manuelles `npm run migrate`) gleichzeitig migrieren.
const DEFAULT_LOCK_SCOPE = "timeless";
const LOCK_NAME = "schema-migrations";

async function acquireLock(client: PoolClient, lockScope: string): Promise<void> {
  await client.query("SELECT pg_advisory_lock(hashtext($1), hashtext($2))", [lockScope, LOCK_NAME]);
}

async function releaseLock(client: PoolClient, lockScope: string): Promise<void> {
  await client.query("SELECT pg_advisory_unlock(hashtext($1), hashtext($2))", [lockScope, LOCK_NAME]);
}

/** Minimalinterface, damit Tests einen eigenen Pool unter eigener search_path übergeben können. */
export interface MigratableDb {
  connect(): Promise<PoolClient>;
}

/**
 * Wendet alle noch nicht ausgeführten Migrationen an.
 * Rückgabe: Namen der neu angewendeten Dateien (leer = Schema war aktuell).
 */
export async function runMigrations(
  db: MigratableDb = pool,
  lockScope: string = DEFAULT_LOCK_SCOPE
): Promise<string[]> {
  const client = await db.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (" +
        "name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    );

    await acquireLock(client, lockScope);
    try {
      const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
      const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
      const applied = new Set(rows.map((row) => row.name));

      const newlyApplied: string[] = [];
      for (const file of files) {
        if (applied.has(file)) continue;
        const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
        // Einfaches Query-Protokoll: mehrere Statements einer Datei laufen
        // in einer impliziten Transaktion (alles oder nichts).
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        newlyApplied.push(file);
      }
      return newlyApplied;
    } finally {
      await releaseLock(client, lockScope);
    }
  } finally {
    client.release();
  }
}
