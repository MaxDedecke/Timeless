import express, { Request, Response } from "express";
import { pool } from "./db.js";
import locationsRouter from "./routes/locations.js";

const app = express();
app.use(express.json());

// Verwaltete Objekte: Standorte (Beschluss 21.8.2026 – kein Freitext-Feld).
app.use("/api/locations", locationsRouter);

// Liveness: Prozess läuft, ohne an die Datenbank gebunden zu sein.
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Readiness: Backend + Datenbank-Verbindung.
app.get("/api/health/ready", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "up" });
  } catch (err) {
    res.status(503).json({ status: "degraded", database: "down" });
  }
});

export default app;
