import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Der Dev-Server lauscht auf allen Interfaces, damit der Container ihn
// von außen erreicht; /api geht an das Backend im Compose-Netz.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.BACKEND_ORIGIN ?? "http://backend:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      "/api": {
        target: process.env.BACKEND_ORIGIN ?? "http://backend:3000",
        changeOrigin: true,
        ws: false,
      },
    },
  },
});
