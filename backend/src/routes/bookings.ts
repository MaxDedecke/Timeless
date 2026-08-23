import { NextFunction, Request, Response, Router } from "express";
import {
  ConflictError,
  DomainNotFoundError as NotFoundError,
  ValidationError,
} from "../services/errors.js";
import { BookingInput, createBooking } from "../services/bookings.js";

const router = Router();

// POST /api/bookings – Buchung mit Raum, Zeitraum und Urheber anlegen.
// Die Validierung und die Konfliktprüfung liegen im Service; Verstöße kommen
// als Fachfehler an und führen unten zu 400 (Validierung) bzw. 409 (Kollision
// mit einer bestehenden Buchung desselben Raums).
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const input: BookingInput = {
      roomId: body.roomId,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      createdBy: body.createdBy,
    };
    res.status(201).json(await createBooking(input));
  } catch (err) {
    next(err);
  }
});

// Fehlerbehandlung dieses Routers: Fachfehler werden zu verständlichen
// Statuscodes, alles andere bleibt ein Serverfehler (Express-Default, 500).
// Das explizite next(err) ist nötig, weil Express 4 abgelehnte Promises
// von Async-Handlern nicht selbst abfängt.
router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
