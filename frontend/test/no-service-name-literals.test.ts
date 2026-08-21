// @vitest-environment node
//
// Regression: Der Browser führt ausschließlich Code aus dem Frontend aus.
// Ein Compose-Servicename als Host (z. B. das frühere Fallback-Literal in
// vite.config.ts und proxy.mjs) ist im Browser des Nutzers nicht auflösbar –
// die Anfrage scheitert dort bereits mit ERR_NAME_NOT_RESOLVED/"Failed to
// fetch", ohne dass ein Server-Log davon etwas sähe. Dieses Verbots-Prüfung
// stellt sicher, dass Host-/URL-Literale auf interne Compose-Services nicht
// zurückkehren: Das Proxy-Ziel kommt ausschließlich aus der Umgebungsvariable
// BACKEND_ORIGIN, die docker-compose.yml setzt.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const FRONTEND_DIR = fileURLToPath(new URL("..", import.meta.url));
const COMPOSE_FILE = fileURLToPath(
  new URL("../../docker-compose.yml", import.meta.url)
);

const SCANNED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".html",
  ".css",
  ".json",
]);
const SKIPPED_DIRS = new Set(["node_modules", "dist"]);

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return SKIPPED_DIRS.has(entry) ? [] : listFiles(fullPath);
    }
    return entry !== "package-lock.json" &&
      SCANNED_EXTENSIONS.has(path.extname(entry))
      ? [fullPath]
      : [];
  });
}

// Die verbotenen Namen kommen aus der docker-compose.yml selbst: Wird ein
// Dienst umbenannt oder kommt einer hinzu, prüft der Test automatisch mit.
function composeServiceNames(): string[] {
  const names: string[] = [];
  let inServices = false;
  for (const line of readFileSync(COMPOSE_FILE, "utf8").split("\n")) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (inServices && /^\S/.test(line)) inServices = false; // Top-Level-Key
    if (!inServices) continue;
    const match = /^ {2}([a-z0-9_-]+):\s*$/.exec(line);
    if (match) names.push(match[1]);
  }
  return names;
}

describe("Keine Compose-Servicenamen als Host-Literale im Frontend-Code", () => {
  it("liest die Servicenamen aus der docker-compose.yml", () => {
    const names = composeServiceNames();
    // Schlägt das fehl, hat sich die Compose-Struktur geändert und die
    // Verbots-Prüfung unten würde stillschweigend nichts mehr finden.
    expect(names).toContain("frontend");
    expect(names).toContain("backend");
  });

  it("enthält keine Host-/URL-Literale auf interne Services", () => {
    // Erfasst werden zwei Formen: "<service>" hinter einem http(s)-Schema
    // sowie "<service>:<port>" ohne Schema. Der Dienstname allein als Wort
    // (etwa "Backend" in einem Kommentar) ist kein Host-Literal und bleibt
    // erlaubt.
    const patterns = composeServiceNames().map((name) => ({
      name,
      regex: new RegExp(
        `https?:\\/\\/${name}(?:\\b|:\\d)|(?:^|[^\\w.-])${name}:\\d+`
      ),
    }));

    const offenders: string[] = [];
    for (const file of listFiles(FRONTEND_DIR)) {
      const content = readFileSync(file, "utf8");
      const relPath = path.relative(FRONTEND_DIR, file);
      for (const { name, regex } of patterns) {
        if (regex.test(content)) offenders.push(`${relPath} (Service "${name}")`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
