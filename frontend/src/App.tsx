import { useEffect, useState } from "react";

interface HealthState {
  status: string;
  database?: string;
}

/**
 * Startseite des Projektgerüsts.
 *
 * Alle Client-Fetches laufen über relative Pfade (/api/...). Der Frontend-
 * Container reicht sie als Reverse-Proxy an das Backend im Compose-Netz
 * weiter – im Browser-Code taucht nie ein Servicename auf.
 */
export default function App() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    fetch("/api/health/ready")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (aktiv) setHealth(data);
      })
      .catch(() => {
        if (aktiv) setError("Backend nicht erreichbar");
      });
    return () => {
      aktiv = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold tracking-tight">Timeless</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Raumbuchung · DesignFreak GmbH
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Projektgrundgerüst steht
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Frontend, Backend-API und PostgreSQL laufen als getrennte Container.
          Die fachlichen Ansichten (Raumliste, Buchungskalender) folgen in den
          nächsten Sprint-Tickets.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            Systemstatus
          </h3>
          {error !== null && (
            <p
              role="alert"
              className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {error === null && health === null && (
            <p className="mt-3 text-sm text-slate-500">Status wird geprüft …</p>
          )}
          {error === null && health !== null && (
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
                <dt className="text-slate-600">API</dt>
                <dd className="font-medium text-emerald-700">{health.status}</dd>
              </div>
              <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
                <dt className="text-slate-600">Datenbank</dt>
                <dd className="font-medium text-emerald-700">
                  {health.database ?? "unbekannt"}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </main>
    </div>
  );
}
