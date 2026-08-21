import { NextFunction, Request, Response, Router } from "express";
import {
  createLocation,
  listLocations,
  DomainNotFoundError as NotFoundError,
  updateLocation,
  ValidationError,
} from "../services/locations.js";

const router = Router();

// POST /api/locations – Standort mit Namen anlegen.
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await createLocation(req.body?.name));
  } catch (err) {
    next(err);
  }
});

// GET /api/locations – alle Standorte auflisten.
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listLocations());
  } catch (err) {
    next(err);
  }
});

// PUT und PATCH ändern denselben Datensatz. Der Standort hat nur den Namen,
// deshalb gibt es zwischen beiden Verben keinen fachlichen Unterschied.
async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await updateLocation(req.params.id, req.body?.name));
  } catch (err) {
    next(err);
  }
}
router.put("/:id", update);
router.patch("/:id", update);

// Fehlerbehandlung dieses Routers: Fachfehler werden zu verständlichen
// Statuscodes, alles andere bleibt ein Serverfehler (Express-Default, 500).
// Das explizite next(err) ist nötig, weil Express 4 abgelehnte Promises
// von Async-Handlern nicht selbst abfängt.
router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
