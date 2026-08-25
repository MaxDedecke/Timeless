import { NextFunction, Request, Response, Router } from "express";
import {
  ConflictError,
  DomainNotFoundError as NotFoundError,
  ValidationError,
} from "../services/errors.js";
import {
  BookingInput,
  checkIn,
  createBooking,
  listBookingsForRoom,
} from "../services/bookings.js";

const router = Router();

// GET /api/bookings?roomId=<id>&date=<YYYY-MM-DD> – Buchungen eines Raums,
// optional auf einen Tag begrenzt (Kalenderansicht je Raum, Anforderung 1).
// Eine unbekannte oder nicht-numerische Raum-ID gilt wie beim Raumdetail als
// „nicht gefunden" (404) – der Kalender zeigt dann den Raum-Fehlerzustand.
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRoomId = req.query.roomId;
    const roomId = Number(rawRoomId);
    if (
      rawRoomId === undefined ||
      typeof rawRoomId !== "string" ||
      !Number.isInteger(roomId)
    ) {
      throw new NotFoundError("Raum nicht gefunden.");
    }
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;
    res.json(await listBookingsForRoom(roomId, date));
  } catch (err) {
    next(err);
  }
});

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
    if (body.guests !== undefined) input.guests = body.guests;
    res.status(201).json(await createBooking(input));
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/check-in – Check-in der aktuell laufenden Buchung
// (Anforderung 2). Die Pflichtfeld- und Zeitraumprüfung liegt im Service:
// Erfolg liefert die aktualisierte Buchung mit Status 'eingecheckt' (200),
// ein bereits eingecheckter Zweitversuch ist idempotent (ebenfalls 200),
// nicht laufend oder falscher Status führt zu 409, unbekannte ID zu 404.
router.post(
  "/:id(\\d+)/check-in",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await checkIn(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  }
);

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
