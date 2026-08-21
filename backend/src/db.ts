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

export const pool = new Pool(buildDbConfig());
