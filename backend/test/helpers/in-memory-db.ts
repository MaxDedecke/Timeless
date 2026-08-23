import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { newDb } from "pg-mem";
// DataType als echter Wert-Import (Enum-Mitglieder in Typposition UND als
// Werte, siehe registerPgMemCompatibilityStubs): Die pg-mem-Signatur kennt
// nur ihre eigenen Enum-Mitglieder – "int4"/"int8" scheitern am Lint, auch
// wenn die Laufzeit sie über typeSynonyms auflösen kann.
import { DataType, type IBackup, type IMemoryDb } from "pg-mem";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * Produktions-Migrationsverzeichnis – relativ zu dieser Datei aufgelöst, damit
 * der Helper exakt dieselben SQL-Dateien liest wie der Läufer in
 * src/db/migrate.ts (und nicht eine kopierte zweite Wahrheit pflegt).
 */
const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/db/migrations"
);

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
 * Schema: Standardmäßig startet die Instanz LEER. Mit `applyMigrations()` wird
 * das reale Schema aus src/db/migrations eingespielt – dieselben Dateien in
 * derselben Reihenfolge wie der Produktions-Läufer, damit die Tests das echte
 * Schema vorfinden statt einer zweiten Wahrheit im Helper. Jede Instanz ist
 * vollständig eigenständig (kein geteilter Zustand), jeder Testlauf erhält so
 * ein frisches Schema; Tests beeinflussen sich nicht gegenseitig.
 *
 * Der protokollierende FakePool in ./fake-pool.ts bleibt für Suite-lokale
 * Protokoll-Assertionen bestehen; diese Klasse ist die Grundlage, auf der die
 * Services echt getestet werden, statt Antworten nur vorzugeben.
 */
export class InMemoryDb {
  /** Die zugrunde liegende In-Memory-Datenbank (z. B. für Backup/Restore). */
  readonly db: IMemoryDb;

  /**
   * Katalog-Guard gegen den pg-mem-AST-Defekt bei IF-NOT-EXISTS-DDL auf
   * existierende Objekte – gemeinsam von query() und jedem connect()-Client
   * genutzt, damit beide Pfade dieselbe Postgres-Semantik haben.
   */
  private readonly ifNotExistsGuard: IfNotExistsGuard;

  /**
   * pg-kompatibler Pool über der In-Memory-Datenbank. Bewusst als Pool
   * exponiert (nicht nur die eigene query-Methode): So lässt sich dieselbe
   * Instanz überall dort einsetzen, wo die Services `pool` aus src/db.ts
   * erwarten – inklusive `__setPoolForTests`.
   */
  readonly pool: Pool;

  constructor() {
    this.db = newDb();
    this.ifNotExistsGuard = new IfNotExistsGuard(this.db);
    registerPgMemCompatibilityStubs(this.db);
    // createPg().Pool ist die Pool-KLASSE – hier muss eine Instanz entstehen,
    // sonst fehlen query/connect/end am Objekt (die Methoden hängen am
    // Prototyp der Instanz, nicht statisch an der Klasse).
    const PgPool = this.db.adapters.createPg().Pool;
    this.pool = new PgPool() as unknown as Pool;
  }

  /**
   * Factory gemäß Ticket-Umsetzungsplan: frische Instanz pro Aufruf, mit dem
   * Produktionsschema bereits eingespielt – genau für den Testaufbau
   * `const db = await InMemoryDb.migrated();`.
   */
  static async migrated(dir: string = MIGRATIONS_DIR): Promise<InMemoryDb> {
    const db = new InMemoryDb();
    await db.applyMigrations(dir);
    return db;
  }

  /**
   * Spielt die Migrationsdateien aus src/db/migrations in Dateinamen-
   * Reihenfolge in dieser Instanz ein. Rückgabe: Namen der angewendeten
   * Dateien (auf einer frischen Instanz beide). Jede Instanz startet ohne
   * Schema: Der Aufruf liegt bewusst in der Hand des Tests, damit ein Test
   * auch mal gegen ein leeres Schema laufen kann; wer das reale Schema
   * braucht, ruft ihn im Testaufbau auf.
   *
   * Nicht unterstütztes SQL wird nicht geschluckt: Der Fehler wird mit
   * Migrationsdatei und Anweisungsausschnitt als Error nach oben gereicht.
   *
   * Wiederholtes Ausführen auf derselben Instanz ist möglich: Die Idempotenz
   * des Migration-SQL (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) wird über
   * die Umgehung des pg-mem-AST-Defekts auch auf dem Client-Pfad wirksam
   * (siehe connect() und isCreateIfNotExists) – ein zweiter Lauf liefert
   * eine leere Liste, weil schema_migrations die Dateien bereits vermerkt hat.
   * Der optionale Parameter dient ausschließlich Tests dazu, den Fehlerpfad
   * mit einem Wegwerf-Verzeichnis zu prüfen.
   */
  async applyMigrations(dir: string = MIGRATIONS_DIR): Promise<string[]> {
    const files = (await readdir(dir))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const applied: string[] = [];
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), "utf8");
      try {
        await this.query(sql);
      } catch (err) {
        // Erste fachliche Anweisungszeile (ohne Kommentar-/Leerzeilen) in die
        // Meldung aufnehmen – damit ist der Bruchpunkt ohne Nachforschen
        // lokalisierbar, auch wenn die ursprüngliche pg-mem-Meldung den SQL-
        // Text nicht enthält.
        const firstStatementLine =
          sql
            .split("\n")
            .map((line) => line.trim())
            .find((line) => line.length > 0 && !line.startsWith("--")) ?? "";
        const snippet =
          firstStatementLine.length > 120
            ? `${firstStatementLine.slice(0, 117)}...`
            : firstStatementLine;
        throw new Error(
          `Migration ${file} konnte in der In-Memory-DB nicht ausgeführt werden` +
            (snippet.length > 0 ? ` (Anweisung: ${snippet})` : "") +
            ` – Ursache: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? { cause: err } : undefined
        );
      }
      applied.push(file);
    }
    return applied;
  }

  /**
   * Führt eine Abfrage mit Text+Values echt gegen die In-Memory-Postgres aus
   * und liefert das Ergebnis in der pg-Form (rows + rowCount).
   */
  async query<R extends QueryResultRow = QueryResultRow>(
    sqlText: string,
    values: unknown[] = []
  ): Promise<QueryResult<R>> {
    // pg-mem-Defekt umgehen (siehe Kommentar an isCreateIfNotExists):
    // Einzelstatement-CREATE TABLE IF NOT EXISTS auf existierende Tabelle
    // wird mit echter Postgres-Semantik als No-op behandelt – derselbe
    // Katalog-Guard wie auf dem Client-Pfad in connect().
    if (values.length === 0 && isCreateIfNotExists(sqlText)) {
      if (await this.ifNotExistsGuard.isNoOp(sqlText)) {
        return this.ifNotExistsGuard.noOp();
      }
    }
    return this.pool.query<R>(sqlText, values as never[]);
  }

  /**
   * Reserviert einen Client für Transaktionen – gleiche Semantik wie
   * `pool.connect()` der Produktions-Naht (Client wieder per release()
   * freigeben, sonst läuft der Pool auf). Der gelieferte Client erhält echte
   * COMMIT-/ROLLBACK-Semantik (siehe Klassenkommentar).
   */
  async connect(): Promise<PoolClient> {
    const inner: PoolClient = await this.pool.connect();
    // Derselbe pg-mem-Defekt wie in query(): Der Migrations-Läufer setzt sein
    // `CREATE TABLE IF NOT EXISTS schema_migrations` über den Client ab –
    // ohne diese Behandlung scheitert der zweite Lauf an existierenden
    // Objekten (AST-Coverage-Fehler statt No-op).
    const guard = new IfNotExistsGuard(this.db);
    return wrapWithSnapshotTransactions(inner, this.db, guard);
  }

  /** Schließt den Pool. Die In-Memory-Datenbank stirbt mit der Instanz. */
  async end(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Native Funktionen, die pg-mem (Stand 3.0.14) nicht mitbringt, aber die
 * Produktions-SQL-Pfade benötigen – als dokumentierte No-op-Stubs:
 *
 * - `hashtext(text)` und die Zwei-Schlüssel-Form von `pg_advisory_lock` /
 *   `pg_advisory_unlock`: Der Migrations-Läufer in src/db/migrate.ts setzt
 *   sie zur Prozessübergreifenden Absprache ab. Unter pg-mem gibt es keine
 *   zweite Instanz, um die sie absprechen müssten; der Stub hält nur die
 *   Aufrufsignatur fest, ohne Verhalten zu prüfen.
 */
function registerPgMemCompatibilityStubs(db: IMemoryDb): void {
  db.public.registerFunction({
    name: "hashtext",
    args: [DataType.text],
    returns: DataType.integer,
    implementation: (text: unknown): number => {
      // Eigenständige 32-Bit-Implementierung (kein Anspruch auf Bitgleichheit
      // mit Postgres' hashtext – für einen No-op-Stub irrelevant).
      const s = String(text);
      let h = 0;
      for (let i = 0; i < s.length; i++) {
        h = ((h * 31 + s.charCodeAt(i)) | 0) | 0;
        if (h > 2147483647) h -= 4294967296;
        else if (h < -2147483648) h += 4294967296;
      }
      return h;
    },
  });
  db.public.registerFunction({
    name: "pg_advisory_lock",
    args: [DataType.bigint, DataType.bigint],
    returns: DataType.bigint,
    implementation: () => 0,
  });
  db.public.registerFunction({
    name: "pg_advisory_unlock",
    args: [DataType.bigint, DataType.bigint],
    returns: DataType.bool,
    implementation: () => true,
  });
}

/**
 * pg-mem 3.0.14 bricht an zwei Stellen am Migrations-SQL:
 *
 * 1. `CREATE TABLE IF NOT EXISTS` gegen ein bereits existierendes Objekt
 *    wirft dessen AST-Coverage-Fehler ("parts have not been read by the query
 *    planner"), statt stillschweigend nichts zu tun. Der Migrations-Läufer
 *    formuliert seine Systemtabelle aber bewusst idempotent.
 * 2. Mehrstimmige Abfragen (wie eine Migrationsdatei) werden an pg-mems
 *    Multi-Statement-Grenze zerlegt; dort fehlt der Kontext, dass die Datei
 *    bereits gelaufen ist bzw. dass das Objekt schon existiert.
 *
 * Beides ist ein Defekt der In-Memory-Engine, nicht unserer Migrationen:
 * Gegen echte Postgres verhält sich exakt dieses SQL korrekt. Damit der
 * Migrations-Läufer hier überhaupt einmal vollständig laufen kann, behandelt
 * diese Klasse genau die Einzelstatement-Form von CREATE TABLE IF NOT EXISTS
 * vorab selbst – mit echter Postgres-Semantik (Katalogabfrage statt
 * Raten): Existiert die Tabelle bereits, wird das Statement übersprungen,
 * sonst unverändert ausgeführt.
 */
function isCreateIfNotExists(sqlText: string): boolean {
  return /^create\s+table\s+if\s+not\s+exists\b/i.test(sqlText.trimStart());
}

/** Erstes Statement-Kürzel einer Tabelle (Groß-/Kleinschreibung egal). */
const CREATE_IF_NOT_EXISTS_NAME = /create\s+table\s+if\s+not\s+exists\s+"?([a-zA-Z_][\w$]*)"?\s*\(/i;

/** Steuerungs-SQL, das die Snapshot-Abbildung selbst behandelt. */
const TX_CONTROL_PATTERNS: Array<{ pattern: RegExp; verb: string }> = [
  { pattern: /^(BEGIN|START TRANSACTION)(\s|;|$)/i, verb: "BEGIN" },
  { pattern: /^(COMMIT|END TRANSACTION)(\s|;|$)/i, verb: "COMMIT" },
  { pattern: /^(ROLLBACK|ABORT)(\s|;|$)/i, verb: "ROLLBACK" },
];

/** Ergebnisform eines verworfenen Steuer-/DDL-Statements (pg-kompatibel). */
function controlResult(command: string): QueryResult {
  return {
    command,
    rowCount: 0,
    rows: [],
    fields: [],
  } as unknown as QueryResult;
}

/**
 * Katalogbasierte Existenzprüfung für `CREATE ... IF NOT EXISTS` – dieselbe
 * echte Postgres-Semantik wie in query(), nur ohne Umweg über den Pool:
 * pg-mems AST-Coverage-Defekt trifft das Statement auf existierendem Objekt
 * (NotSupported), bevor eine Antwort entstehen könnte; der Katalog entscheidet
 * deshalb hier, ob es als No-op verworfen oder unverändert ausgeführt wird.
 */
class IfNotExistsGuard {
  constructor(private readonly db: IMemoryDb) {}

  /** True, wenn das Statement ein IF-NOT-EXISTS-DDL auf existierendes Objekt ist. */
  async isNoOp(sqlText: string): Promise<boolean> {
    if (!isCreateIfNotExists(sqlText)) return false;
    const name = sqlText.match(CREATE_IF_NOT_EXISTS_NAME);
    if (name === null) return false;
    // Name stammt aus dem eigenen Regex auf eigenem SQL; Escaping ist
    // Vorsichtsmaßnahme, kein Vertrauensgrenzen-Feature.
    const safeName = name[1].replace(/'/g, "''");
    const rows = await this.db.public.many(
      "SELECT table_name FROM information_schema.tables " +
        `WHERE table_schema = 'public' AND table_name = '${safeName}'`
    );
    return rows.length > 0;
  }

  /** No-op-Ergebnis für ein verworfenes DDL-Statement (pg-Form). */
  noOp(): QueryResult {
    return controlResult("CREATE TABLE");
  }
}

/**
 * Umhüllt einen Adapter-Client so, dass BEGIN/COMMIT/ROLLBACK echte
 * Transaktionssemantik haben (Snapshot statt pg-mems wirkungsloser
 * Steuerstatements) und alle übrigen Statements unverändert durchgereicht
 * werden – mit einer Ausnahme: Einzelstatement-`CREATE TABLE IF NOT EXISTS`
 * auf bereits existierende Tabelle wird wie in echter Postgres als No-op
 * behandelt (pg-mem-Defekt, siehe isCreateIfNotExists).
 *
 * Grenzen: kein DDL innerhalb einer Transaktion und keine Isolation zwischen
 * gleichzeitig offenen Clients mehrerer Transaktionen (Snapshot gilt pro
 * Datenbank, nicht je Session) – siehe Klassenkommentar von InMemoryDb.
 */
function wrapWithSnapshotTransactions(
  inner: PoolClient,
  db: IMemoryDb,
  guard: IfNotExistsGuard
): PoolClient {
  let snapshot: IBackup | null = null;

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
      if (
        (values === undefined || values.length === 0) &&
        isCreateIfNotExists(text)
      ) {
        return guard.isNoOp(text).then((skip) =>
          skip ? guard.noOp() : inner.query(sql, values)
        );
      }
      return inner.query(sql, values);
    },
    release(err?: Error | boolean): void {
      inner.release(err);
    },
  };

  return wrapped as unknown as PoolClient;
}
