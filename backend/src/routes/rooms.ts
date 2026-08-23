import { NextFunction, Request, Response, Router } from "express";
import { DomainNotFoundError as NotFoundError, ValidationError } from "../services/errors.js";
import {
  AvailabilityInput,
  createRoom,
  getRoom,
  listAvailableRooms,
  listRooms,
  RoomChangeInput,
  updateRoom,
} from "../services/rooms.js";

const router = Router();

// POST /api/rooms – Raum mit Name, Standortreferenz (locationId) und
// Kapazität anlegen, optional bereits mit Ausstattungsmerkmalen (amenities
// als Liste von Katalog-Schlüsseln). Die Validierung liegt im Service;
// Verstöße kommen als ValidationError an und führen unten zu 400.
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    res.status(201).json(
      await createRoom(
        body.name,
        body.locationId,
        body.capacity,
        body.amenities
      )
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms – alle Räume auflisten, je Raum inklusive Standort-Objekt
// und zugeordneter Ausstattungsmerkmale.
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listRooms());
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/available?from=&to= – freie Räume für einen Zeitraum
// (Anforderung 1). Bewusst VOR dem /:id-Platzhalter registriert, sonst
// verschluckt "available" als :id und die Suche liefert 404.
// Validierung und Überlappungslogik liegen im Service; ValidationError
// (fehlend/unlesbar/to<=from) führt unten zu 400 mit Meldung.
router.get(
  "/available",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: AvailabilityInput = {
        from: req.query.from,
        to: req.query.to,
      };
      res.json(await listAvailableRooms(input));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/rooms/:id – einen Raum lesen (Raumdetail inklusive Merkmale).
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
