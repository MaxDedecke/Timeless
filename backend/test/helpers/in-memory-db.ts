import { newDb } from "pg-mem";
import type { IBackup, IMemoryDb } from "pg-mem";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * Echte In-Memory-Postgres für containerlose Tests – die Naht, die SQL
 * wirklich ausführt, wo der FakePool aus ./fake-pool.ts nur protokolliert.
 *
 * Die Klasse bedient dieselbe Aufrufschnittstelle wie die Produktions-Naht in
 * src/db.ts: Abfragen als `query(sql, values)` mit Text+Values und Ergebnis in
 * der pg-Form `{ rows, rowCount }`, Transaktionen über `connect()` (Client mit
 * query/BEGIN/COMMIT/ROLLBACK und release()) sowie `end()` zum Abschluss.
 * Innen läuft ein echter Postgres-Sprachprozessor (pg-mem) – DDL, Identity-
 * Spalten, Fremdschlüssel und Parameter-Binding verhalten sich also wie in
 * Postgres, ohne dass ein Container oder Netz nötig ist.
 *
 * Transaktionen: pg-mem 3.0.14 nimmt BEGIN/COMMIT/ROLLBACK entgegen, hält aber
 * keine Datenwirkung zurück – Schreibvorgänge sind sofort dauerhaft und ein
 * ROLLBACK macht sie nicht rückgängig (empirisch gegen die installierte
 * Version geprüft). Weil die Services genau dieses Muster nutzen (BEGIN →
 * fachliche Prüfung → INSERT → COMMIT, im Fehlerfall ROLLBACK), bildet diese
 * Klasse Transaktionssemantik selbst ab: BEGIN legt einen O(1)-Snapshot über
 * `IMemoryDb.backup()` an, ROLLBACK stellt ihn per `restore()` wieder her,
 * COMMIT verwirft den Snapshot. Damit verhält sich die Naht für den
 * sequenziellen Testfall wie eine echte Postgres.
 *
 * Grenzen dieser Abbildung (bewusst dokumentiert statt verschwiegen):
 * - Kein DDL innerhalb einer Transaktion – restore() verlangt ein seit dem
 *   Snapshot unverändertes Schema (die Services führen keine DDL aus).
 * - Keine Isolation zwischen gleichzeitig offenen Clients mehrerer
 *   Transaktionen – der Snapshot gilt pro Datenbank, nicht je Session. Die
 *   Test-Suiten laufen sequenziell; dafür ist der Weg zur echten Postgres im
 *   Compose-Stack gedacht.
 *
 * Bewusst ohne Schema-Vorbelegung: Die Klasse ist neutral, jeder Test bringt
 * sein eigenes Schema mit (der Smoke-Test macht sein CREATE TABLE selbst) oder
 * ruft den Produktions-Migrationsläufer gegen `connect()` auf.
 *
 * Der FakePool bleibt parallel bestehen (FakeDbSession unangetastet); diese
 * Klasse ist die Grundlage, auf der die Services schrittweise echt getestet
 * werden, statt Antworten nur vorzugeben.
 */
export class InMemoryDb {
  /** Die zugrunde liegende In-Memory-Datenbank (z. B. für Backup/Restore). */
  readonly db: IMemoryDb;

  /**
   * pg-kompatibler Pool über der In-Memory-Datenbank. Bewusst als Pool
   * exponiert (nicht nur die eigene query-Methode): So lässt sich dieselbe
   * Instanz überall dort einsetzen, wo die Services `pool` aus src/db.ts
   * erwarten – inklusive `__setPoolForTests`.
   */
  readonly pool: Pool;

  constructor() {
    this.db = newDb();
    // createPg().Pool ist die Pool-KLASSE – hier muss eine Instanz entstehen,
    // sonst fehlen query/connect/end am Objekt (die Methoden hängen am
    // Prototyp der Instanz, nicht statisch an der Klasse).
    const PgPool = this.db.adapters.createPg().Pool;
    this.pool = new PgPool() as unknown as Pool;
  }

  /**
   * Führt eine Abfrage mit Text+Values echt gegen die In-Memory-Postgres aus
   * und liefert das Ergebnis in der pg-Form (rows + rowCount).
   */
  async query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = []
  ): Promise<QueryResult<R>> {
    return this.pool.query<R>(sql, values);
  }

  /**
   * Reserviert einen Client für Transaktionen – gleiche Semantik wie
   * `pool.connect()` der Produktions-Naht (Client wieder per release()
   * freigeben, sonst läuft der Pool auf). Der gelieferte Client erhält echte
   * COMMIT-/ROLLBACK-Semantik (siehe Klassenkommentar).
   */
  async connect(): Promise<PoolClient> {
    const inner: PoolClient = await this.pool.connect();
    return wrapWithSnapshotTransactions(inner, this.db);
  }

  /** Schließt den Pool. Die In-Memory-Datenbank stirbt mit der Instanz. */
  async end(): Promise<void> {
    await this.pool.end();
  }
}

/** Steuerungs-SQL, das die Snapshot-Abbildung selbst behandelt. */
const TX_CONTROL_PATTERNS: Array<{ pattern: RegExp; verb: string }> = [
  { pattern: /^(BEGIN|START TRANSACTION)(\s|;|$)/i, verb: "BEGIN" },
  { pattern: /^(COMMIT|END TRANSACTION)(\s|;|$)/i, verb: "COMMIT" },
  { pattern: /^(ROLLBACK|ABORT)(\s|;|$)/i, verb: "ROLLBACK" },
];

/**
 * Umhüllt einen Adapter-Client so, dass BEGIN/COMMIT/ROLLBACK echte
 * Transaktionssemantik haben (Snapshot statt pg-mems wirkungsloser
 * Steuerstatements) und alle übrigen Statements unverändert durchgereicht
 * werden.
 *
 * Grenzen: kein DDL innerhalb einer Transaktion und keine Isolation zwischen
 * gleichzeitig offenen Clients mehrerer Transaktionen (Snapshot gilt pro
 * Datenbank, nicht je Session) – siehe Klassenkommentar von InMemoryDb.
 */
function wrapWithSnapshotTransactions(
  inner: PoolClient,
  db: IMemoryDb
): PoolClient {
  let snapshot: IBackup | null = null;

  const controlResult = (command: string): QueryResult =>
    ({
      command,
      rowCount: 0,
      rows: [],
      fields: [],
    }) as unknown as QueryResult;

  const wrapped = {
    query(sql: string, values?: unknown[]): Promise<QueryResult> {
      const text = typeof sql === "string" ? sql.trim() : "";
      const control = TX_CONTROL_PATTERNS.find((c) => c.pattern.test(text));
      if (control !== undefined) {
        switch (control.verb) {
          case "BEGIN":
            // Verschachteltes BEGIN kommt im Service-Code nicht vor; ein
            // bereits vorhandener Snapshot bleibt dann einfach stehen.
            snapshot ??= db.backup();
            return Promise.resolve(controlResult("BEGIN"));
          case "COMMIT":
            snapshot = null;
            return Promise.resolve(controlResult("COMMIT"));
          default:
            if (snapshot !== null) {
              const restore = snapshot;
              snapshot = null;
              restore.restore();
            }
            return Promise.resolve(controlResult("ROLLBACK"));
        }
      }
      return inner.query(sql, values);
    },
    release(err?: Error | boolean): void {
      inner.release(err);
    },
  };

  return wrapped as unknown as PoolClient;
}
