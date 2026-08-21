import { Pool } from "pg";
import "dotenv/config";

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Baut die DB-Verbindungskonfiguration aus der Umgebung.
 *
 * Der Default-Host ist der Compose-Servicename `postgres` – im Compose-Netz
 * ist das die einzige Adresse, unter der die Datenbank erreichbar ist
 * (`localhost` wäre im Container das Backend selbst). Für lokale Läufe ohne
 * Docker lässt sich alles per Env überschreiben.
 */
export function buildDbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  return {
    host: env.PGHOST ?? "postgres",
    port: Number(env.PGPORT ?? 5432),
    database: env.PGDATABASE ?? "timeless",
    user: env.PGUSER ?? "timeless",
    password: env.PGPASSWORD ?? "timeless",
  };
}

export let pool: Pool = new Pool(buildDbConfig());

let productionPool: Pool | undefined;

/**
 * Test-only-Naht für containerlose Unit-Tests: Ersetzt den aktiven Pool,
 * damit die Services gegen einen In-Memory-Fake laufen können, ohne dass eine
 * Postgres erreichbar sein muss. Im normalen Betrieb (dev/start, Compose-Stack)
 * wird sie nie aufgerufen – der beim Start gebaute Pool bleibt aktiv.
 *
 * Bewusst eine explizite Naht statt Node-Modul-Mocking: Sie funktioniert ohne
 * experimentelle Runner-Flags und ist eine Zeile je Seite statt eines Umbaus
 * aller Aufrufer auf Dependency-Injection.
 */
export function __setPoolForTests(replacement: Pool): void {
  productionPool ??= pool;
  pool = replacement;
}

/** Gegenstück zu __setPoolForTests: stellt den ursprünglichen Pool wieder her. */
export function __restorePoolForTests(): void {
  if (productionPool !== undefined) {
    pool = productionPool;
    productionPool = undefined;
  }
}
