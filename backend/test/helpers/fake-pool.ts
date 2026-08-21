import type { Pool, PoolClient } from "pg";
import { __restorePoolForTests, __setPoolForTests } from "../../src/db.js";

/**
 * Minimaler Datenbank-Ersatz für containerlose Unit-Tests der Service-Schicht.
 *
 * Die Services hängen an `pool` bzw. einem Transaktions-Client (`pool.connect()`).
 * Beide Oberflächen stellt dieser Fake bereit: Abfragen werden nur protokolliert
 * und über eine vom Test gesetzte Antwort-Funktion beantwortet. So lassen sich
 * Erfolgsfälle und Änderungen ohne laufende Postgres prüfen – inklusive der
 * Frage, WELCHE Statements mit WELCHEN Parametern abgesetzt wurden und ob die
 * Transaktion sauber abgeschlossen bzw. der Client freigegeben wurde.
 *
 * Bewusst nicht Teil des Fakes: SQL-Ausführung, Transaktionssemantik,
 * Resultset-Formate jenseits von `{ rows, rowCount }`. Die Tests wollen die
 * Fachlogik der Services prüfen, nicht Postgres nachbauen.
 */

/** Ein protokollierter Aufruf von `query(sql, values)`. */
export interface QueryRecord {
  sql: string;
  values: unknown[];
}

/** Ergebnis, das ein Test für eine Abfrage vorgibt. */
export interface FakeQueryResult {
  rows: Array<Record<string, unknown>>;
  /** Optional: explizite rowCount (sonst Anzahl der gelieferten Zeilen). */
  rowCount?: number | null;
}

/** Antwort-Funktion: bekommt den Abfrage-Datensatz und liefert das Ergebnis. */
export type FakeResponder = (query: QueryRecord) => FakeQueryResult;

/** SQL auf ein Leerzeichen je Whitespace-Sequenz normieren (Matcher-Erleichterung). */
export function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

/** Alle protokollierten Abfragen, deren normalisiertes SQL auf das Muster passt. */
export function queriesMatching(
  pool: FakePool,
  pattern: RegExp
): QueryRecord[] {
  return pool.queries.filter((record) =>
    pattern.test(normalizeSql(record.sql))
  );
}

/** Transaktions-Client-Oberfläche, wie sie `pool.connect()` liefert. */
export class FakePoolClient {
  readonly queries: QueryRecord[] = [];
  released = false;

  constructor(private readonly pool: FakePool) {}

  async query(
    sql: string,
    values: unknown[] = []
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }> {
    const record: QueryRecord = { sql, values };
    this.queries.push(record);
    return this.pool.dispatch(record);
  }

  release(): void {
    this.released = true;
  }
}

/**
 * Ersatz für den pg-Pool: gleiche Oberfläche (`query`, `connect`, `end`),
 * aber ohne Netz. Jede Abfrage landet der Reihenfolge nach im Protokoll.
 */
export class FakePool {
  readonly queries: QueryRecord[] = [];
  readonly clients: FakePoolClient[] = [];

  private responder: FakeResponder = () => ({ rows: [] });

  /** Setzt die Antwort-Funktion für alle folgenden Abfragen. */
  respondWith(responder: FakeResponder): void {
    this.responder = responder;
  }

  dispatch(record: QueryRecord): {
    rows: Array<Record<string, unknown>>;
    rowCount: number | null;
  } {
    // Ein im Responder geworfener Fehler bricht die Abfrage ab – das Protokoll
    // enthält ihn trotzdem, damit Tests sehen können, wie weit es kam.
    const result = this.responder(record);
    return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
  }

  async query(
    sql: string,
    values: unknown[] = []
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }> {
    const record: QueryRecord = { sql, values };
    this.queries.push(record);
    return this.dispatch(record);
  }

  async connect(): Promise<PoolClient> {
    const client = new FakePoolClient(this);
    this.clients.push(client);
    return client as unknown as PoolClient;
  }

  async end(): Promise<void> {
    // Keine faken Verbindungen – nichts zu schließen.
  }
}

/**
 * Bindet den FakePool für die Dauer einer Suite an die Services an.
 *
 * Nutzt die explizite Test-Naht in src/db.ts (__setPoolForTests /
 * __restorePoolForTests) – bewusst statt Node-Modul-Mocking, das nur hinter
 * einem experimentellen Runner-Flag funktioniert. Weil `pool` eine ESM-
 * Live-Bindung ist, sehen alle Importeure (Services, Router, App) sofort den
 * Fake; nach `end()` wieder den echten Pool.
 *
 * Nutzungsmuster in einer Suite: `begin()` auf Modulebene aufrufen, NACHDEM
 * der DB-Erreichbarkeits-Check den echten Pool geprüft hat (sonst läuft der
 * Check schon gegen den Fake), aber VOR dem Registrieren der Tests.
 */
export class FakeDbSession {
  private readonly pool: FakePool;
  private installed = false;

  constructor(pool?: FakePool) {
    this.pool = pool ?? new FakePool();
  }

  get fake(): FakePool {
    return this.pool;
  }

  /** Ersetzt den aktiven Pool durch den Fake. Idempotent je Session. */
  begin(): void {
    if (this.installed) return;
    __setPoolForTests(this.pool as unknown as Pool);
    this.installed = true;
  }

  /** Stellt den echten Pool wieder her. No-op, wenn nichts installiert war. */
  end(): void {
    if (!this.installed) return;
    __restorePoolForTests();
    this.installed = false;
  }
}
