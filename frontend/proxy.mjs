// Minimaler Webserver für den Frontend-Container: liefert den gebauten
// statischen Stand aus und reicht /api/* als Reverse-Proxy an das Backend
// im Compose-Netz weiter. Der Browser sieht nur relative Pfade – der
// Compose-Servicename taucht ausschließlich serverseitig auf.
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT ?? 80);
const DIST = path.resolve(process.cwd(), "dist");
const BACKEND = process.env.BACKEND_ORIGIN ?? "http://backend:3000";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const type = MIME[path.extname(filePath)] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    const target = BACKEND + url.pathname + url.search;
    // Host-Header auf das Backend-Ziel umschreiben. Ein expliziter Wert ist
    // Pflicht: Node wirft bei einem Header-Wert "undefined" sofort
    // ERR_HTTP_INVALID_HEADER_VALUE und der Proxy-Request bricht ab.
    const headers = { ...req.headers, host: new URL(target).host };
    const proxyReq = http.request(
      target,
      { method: req.method, headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Backend nicht erreichbar" }));
    });
    req.pipe(proxyReq);
    return;
  }

  let filePath = path.join(DIST, url.pathname);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, "index.html"); // SPA-Fallback
  }
  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Timeless Frontend lauscht auf Port ${PORT}`);
});
