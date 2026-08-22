import { newDb } from "pg-mem";
import type { IMemoryDb } from "pg-mem";
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
 * Bewusst ohne Schema-Vorbelegung: Die Klasse ist neutral, jeder Test bringt
 * sein eigenes Schema mit (der Smoke-Test macht sein CREATE TABLE selbst) oder
 * ruft den Produktions-Migrationsläufer gegen `connect()` auf – dessen
 * MigratableDb-Interface braucht nur `connect()`, das dieser Pool liefert.
 *
 * Der FakePool bleibt parallel bestehen (FakeDbSession unangetastet, siehe
 * offene Klärung „Schema-Aufbau"); diese Klasse ist die Grundlage, auf der die
 * Services schrittweise echt getestet werden, statt Antworten nur vorzugeben.
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
   * freigeben, sonst läuft der Pool auf).
   */
  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /** Schließt den Pool. Die In-Memory-Datenbank stirbt mit der Instanz. */
  async end(): Promise<void> {
    await this.pool.end();
  }
}
