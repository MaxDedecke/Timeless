import { NextFunction, Request, Response, Router } from "express";
import { DomainNotFoundError as NotFoundError, ValidationError } from "../services/errors.js";
import {
  createRoom,
  getRoom,
  listRooms,
  RoomChangeInput,
  updateRoom,
} from "../services/rooms.js";

const router = Router();

// POST /api/rooms – Raum mit Name, Standortreferenz (locationId) und
// Kapazität anlegen. Die Pflichtfeld-Validierung liegt im Service; Verstöße
// kommen als ValidationError an und führen unten zu 400 + Fehlermeldung.
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    res.status(201).json(
      await createRoom(body.name, body.locationId, body.capacity)
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms – alle Räume auflisten, je Raum inklusive Standort-Objekt.
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listRooms());
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id – einen Raum lesen (Nachweis-Pfad des Änderungs-Tickets).
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getRoom(req.params.id));
  } catch (err) {
    next(err);
  }
});

// PUT ersetzt den Datensatz: alle drei Pflichtfelder müssen geliefert werden.
// PATCH ändert nur die übergebenen Felder. Die Validierung liegt im Service,
// die Route übersetzt nur Fachfehler in Statuscodes.
async function put(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await updateRoom(req.params.id, req.body as RoomChangeInput, "put"));
  } catch (err) {
    next(err);
  }
}
async function patch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await updateRoom(req.params.id, req.body as RoomChangeInput, "patch"));
  } catch (err) {
    next(err);
  }
}
router.put("/:id", put);
router.patch("/:id", patch);

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
