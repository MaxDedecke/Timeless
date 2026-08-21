import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Ziel des API-Proxys kommt ausschließlich aus der Umgebung –
// docker-compose.yml setzt BACKEND_ORIGIN auf den internen Dienstnamen.
// Bewusst kein Fallback im Code: Läuft der Dev-/Preview-Server ohne diese
// Variable, wäre jede Weiterleitung falsch – dann lieber sofort klar
// abbrechen, statt Anfragen still in die Irre zu leiten. Der Dienstname
// steht dadurch nirgends im Code, sondern nur in der Compose-Verkabelung.
function requireBackendOrigin(): string {
  const backendOrigin = process.env.BACKEND_ORIGIN;
  if (!backendOrigin) {
    throw new Error(
      "BACKEND_ORIGIN ist nicht gesetzt – ohne Ziel kann /api nicht weitergeleitet werden (wird in docker-compose.yml gesetzt)."
    );
  }
  return backendOrigin;
}

// Der Dev-Server lauscht auf allen Interfaces, damit der Container ihn
// von außen erreicht; /api geht an das Backend im Compose-Netz. Nur
// dev/preview ("serve") betreiben überhaupt einen Proxy – der reine
// Build ("vite build") braucht kein Proxy-Ziel und läuft deshalb auch
// ohne Compose-Umgebung, etwa in der Build-Stufe des Dockerfiles.
export default defineConfig(({ command }) => {
  const backendOrigin = command === "serve" ? requireBackendOrigin() : "";
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
          ws: false,
        },
      },
    },
  };
});
