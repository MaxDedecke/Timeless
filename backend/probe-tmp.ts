// Temporärer Probe-Lauf 4: Transaktionsverhalten von pg-mem über Client-Verbindungen
import { newDb } from "pg-mem";

const db = newDb();
const { Pool } = db.adapters.createPg();
const pool: any = new Pool();

await pool.query("CREATE TABLE t (id int)");

// Variante A: BEGIN/INSERT/ROLLBACK über denselben Client
let c = await pool.connect();
await c.query("BEGIN");
await c.query("INSERT INTO t VALUES (1)");
await c.query("ROLLBACK");
c.release();
console.log("A nach Rollback:", (await pool.query("SELECT count(*)::int AS n FROM t")).rows[0].n);

// Variante B: ohne BEGIN (Autocommit) – Referenz
c = await pool.connect();
await c.query("INSERT INTO t VALUES (2)");
c.release();
console.log("B Autocommit:", (await pool.query("SELECT count(*)::int AS n FROM t")).rows[0].n);

// Variante C: db.transaction()-API als Referenz, dass Rollback an sich geht
await db.transaction(async (tx: any) => {
  await tx.query("INSERT INTO t VALUES (3)");
  throw new Error("absichtlich");
}).catch(() => undefined);
console.log("C tx-rollback:", (await pool.query("SELECT count(*)::int AS n FROM t")).rows[0].n);

// Variante D: sieht ein zweiter Client die uncommitteten Daten der ersten?
c = await pool.connect();
await c.query("BEGIN");
await c.query("INSERT INTO t VALUES (4)");
const midCount = (await pool.query("SELECT count(*)::int AS n FROM t")).rows[0].n;
await c.query("COMMIT");
c.release();
console.log("D sichtbar vor Commit:", midCount, "| danach:", (await pool.query("SELECT count(*)::int AS n FROM t")).rows[0].n);

await pool.end?.();
