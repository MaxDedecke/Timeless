import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {/* Transiente Erfolgs-Toasts (Konzept „Toast (Sonner)“, hier: „Check-in
        erfasst") laufen zentral über diesen einen Mount an der Wurzel –
        Ansichten rufen nur noch toast(...) auf, Fehler bleiben davon
        ausgenommen und erscheinen inline. */}
    <Toaster position="bottom-right" richColors closeButton />
  </StrictMode>
);
