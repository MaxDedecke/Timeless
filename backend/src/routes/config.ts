import { Request, Response, Router } from "express";
import { getConfig } from "../services/config.js";

/**
 * System-Konfiguration (Anforderung 1: No-Show-Frist).
 *
 * Bereitgestellt als schreibgeschützte GET-Route /api/config – die Werte
 * werden per Umgebungsvariable überschreibbar, mit einem Sinn-Vorgabe für
 * lokale Entwicklung. Die Sidebar-„Einstellungen" ist später der Ort, um diese
 * dauerhaft zu ändern; bis dahin gelten die Defaults / Env-Werte.
 *
 * Derzeit ein einziger Wert:
 * - noShowAfterMinutes: Minuten nach Beginn, die ein Check-in noch möglich
 *   ist, bevor die No-Show-Freigabe greift. Standard 15 (gemäß Konzept).
 */
const router = Router();

// GET /api/config – liefert die System-Konfiguration (u. a. No-Show-Frist).
router.get("/", (_req: Request, res: Response) => {
  res.json(getConfig());
});

export default router;
