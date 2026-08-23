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

/**
 * Stapel der Pool-Naht: Unten liegt der Produktions-Pool, darüber jeder durch
 * __setPoolForTests eingesetzte Ersatz. Ein Stack statt eines einzelnen
 * Platzhalters, weil sich die beiden Test-Hilfen ineinander verschachteln:
 * Eine Suite kann den Pool auf die In-Memory-DB setzen (Datei-Aufbau) und
 * sich darin lokal den protokollierenden FakePool einsetzen lassen
 * (FakeDbSession je Test). Restore stellt immer genau die vorherige Stufe
 * wieder her – bei einer Einzelvariablen würde das erste innere end()
 * bereits den Produktions-Pool zurückbringen und alle folgenden Zugriffe des
 * Testlaufs gegen echte Postgres schicken.
 */
const poolStack: Pool[] = [];

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
  if (poolStack.length === 0) {
    poolStack.push(pool);
  }
  poolStack.push(replacement);
  pool = replacement;
}

/** Gegenstück zu __setPoolForTests: stellt den zuvor aktiven Pool wieder her. */
export function __restorePoolForTests(): void {
  if (poolStack.length > 1) {
    poolStack.pop();
    pool = poolStack[poolStack.length - 1];
  }
}
