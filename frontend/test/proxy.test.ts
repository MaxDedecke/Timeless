// @vitest-environment node
//
// Regression: Der Proxy im Frontend-Container muss /api-Requests an das
// Backend weiterreichen können. Ein früherer Stand setzte den Host-Header
// des Weiterleitungs-Requests auf undefined – Node brach dann mit
// ERR_HTTP_INVALID_HEADER_VALUE ab und der Frontend-Container starb beim
// ersten API-Aufruf.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND_PORT = 45991;
const PROXY_PORT = 45990;

const workDir = mkdtempSync(path.join(tmpdir(), "timeless-proxy-"));
const proxyScript = path.join(workDir, "proxy.mjs");
const children: ChildProcess[] = [];

function start(script: string, env: Record<string, string>): ChildProcess {
  const child = spawn(process.execPath, [script], {
    cwd: workDir,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  children.push(child);
  return child;
}

async function waitUntilReachable(url: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Testserver nicht erreichbar (${url}): ${String(lastError)}`);
}

beforeAll(async () => {
  // Mini-Backend: antwortet auf jeden Pfad mit JSON inklusive des
  // empfangenen Host-Headers – daran ist die Umschreibung sichtbar.
  writeFileSync(
    path.join(workDir, "backend.mjs"),
    [
      'import http from "node:http";',
      "http.createServer((req, res) => {",
      '  res.writeHead(200, { "Content-Type": "application/json" });',
      '  res.end(JSON.stringify({ ok: true, host: req.headers.host ?? null }));',
      `}).listen(${BACKEND_PORT}, "127.0.0.1");`,
    ].join("\n"),
  );

  // Statischer Stand, den der Proxy zusätzlich ausliefern soll.
  mkdirSync(path.join(workDir, "dist"));
  writeFileSync(path.join(workDir, "dist", "index.html"), "<html>statisch ok</html>");

  copyFileSync(fileURLToPath(new URL("../proxy.mjs", import.meta.url)), proxyScript);

  start(path.join(workDir, "backend.mjs"), {});
  await waitUntilReachable(`http://127.0.0.1:${BACKEND_PORT}/ping`);

  start(proxyScript, {
    PORT: String(PROXY_PORT),
    BACKEND_ORIGIN: `http://127.0.0.1:${BACKEND_PORT}`,
  });
  await waitUntilReachable(`http://127.0.0.1:${PROXY_PORT}/`);
}, 20000);

afterAll(() => {
  for (const child of children) child.kill();
  rmSync(workDir, { recursive: true, force: true });
});

describe("proxy.mjs", () => {
  it("reicht /api-Requests ans Backend durch, ohne selbst abzubrechen", async () => {
    const res = await fetch(`http://127.0.0.1:${PROXY_PORT}/api/health`);
    expect(res.status).toBe(200);
    // Host-Header muss aufs Backend-Ziel umgeschrieben sein, nicht "undefined".
    expect(await res.json()).toEqual({ ok: true, host: `127.0.0.1:${BACKEND_PORT}` });
  }, 20000);

  it("liefert statische Dateien aus dem Build-Verzeichnis aus", async () => {
    const res = await fetch(`http://127.0.0.1:${PROXY_PORT}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("statisch ok");
  }, 20000);
});
