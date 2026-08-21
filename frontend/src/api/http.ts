/**
 * Dünner JSON-Fetch-Helper für alle API-Clients des Frontends.
 *
 * Bewusst nur relative Pfade: Der Browser des Nutzers kennt nur den einen
 * veröffentlichten Ursprung; "/api/..." läuft über den Vite-Proxy bzw. den
 * Reverse-Proxy in den Backend-Container. Ein Compose-Servicename wäre im
 * Browser nicht auflösbar (siehe no-service-name-literals.test.ts).
 */

/** Fachfehler der API mit HTTP-Status und verständlicher Meldung. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Wird als JSON-Body gesendet; ohne Body bleibt der Request leer. */
  body?: unknown;
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers:
        options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (err) {
    throw new ApiError(
      0,
      "Der Server ist nicht erreichbar. Bitte versuche es später erneut."
    );
  }

  if (!response.ok) {
    // Die API liefert Fachfehler als { error: "<meldung>" }; alles andere
    // fällt auf eine generische Meldung zurück, statt roh zu scheitern.
    let message = `Die Anfrage ist fehlgeschlagen (HTTP ${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload?.error === "string" && payload.error.trim() !== "") {
        message = payload.error;
      }
    } catch {
      // Kein JSON-Body – die generische Meldung bleibt stehen.
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}
