import { NextFunction, Request, Response, Router } from "express";
import { listAmenities } from "../services/amenities.js";

const router = Router();

// GET /api/amenities – der Merkmals-Katalog für Auswahllisten (Filter,
// Raumformular). Der Katalog ist fest (Beschluss 21.8.2026): Es gibt bewusst
// nur den Lese-Pfad, keine Anlege-/Änderungs-Endpunkte. Schlägt die
// Datenbankabfrage fehl, bleibt es beim Express-Default (500).
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listAmenities());
  } catch (err) {
    next(err);
  }
});

export default router;
