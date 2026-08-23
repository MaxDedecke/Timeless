import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import RoomCalendar from "./pages/RoomCalendar";
import RoomForm from "./pages/RoomForm";
import RoomList from "./pages/RoomList";

/**
 * App-Shell: dauerhafte Sidebar links (ab lg fixiert sichtbar, darunter
 * Off-Canvas), Inhalt daneben. Alle Client-Fetches laufen über relative
 * Pfade (/api/...) – der Frontend-Container reicht sie als Reverse-Proxy
 * an das Backend im Compose-Netz weiter; im Browser-Code taucht nie ein
 * Servicename auf.
 */

interface HealthState {
  status: string;
  database?: string;
}

function Dashboard() {
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
    <section aria-labelledby="dashboard-heading">
      <div className="mb-6">
        <h1 id="dashboard-heading" className="text-2xl font-semibold tracking-tight">
          Übersicht
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Raumliste, Tagesansicht und Buchungen folgen in den nächsten Sprints.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Systemstatus</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {error !== null && (
            <p
              role="alert"
              className="rounded-md bg-destructive-background px-3 py-2 text-destructive"
            >
              {error}
            </p>
          )}
          {error === null && health === null && (
            <p className="text-muted-foreground">Status wird geprüft …</p>
          )}
          {error === null && health !== null && (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md bg-success-background px-3 py-2">
                <dt className="text-card-foreground">API</dt>
                <dd className="font-medium text-success">{health.status}</dd>
              </div>
              <div className="flex items-center justify-between rounded-md bg-success-background px-3 py-2">
                <dt className="text-card-foreground">Datenbank</dt>
                <dd className="font-medium text-success">
                  {health.database ?? "unbekannt"}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Navigation schließt das mobile Off-Canvas-Panel.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileOpen={() => setMobileOpen(true)}
        onMobileClose={() => setMobileOpen(false)}
      />
      {/* Ab lg Platz für die fixierte Sidebar (w-64) */}
      <main className="px-4 py-6 md:px-6 lg:ml-64 lg:pl-8 lg:pr-6 xl:px-8">
        <div className="mx-auto max-w-7xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rooms" element={<RoomList />} />
            {/* Raumkalender je Raum (Anforderung 1): /rooms/:id. Statische
                Segmente (/rooms/new) schlagen vor dem dynamischen :id zu –
                in React Router eindeutig, kein Konflikt. */}
            <Route path="/rooms/:id" element={<RoomCalendar />} />
            {/* Anlegen und Bearbeiten: /rooms/new muss VOR /rooms/:id/edit
                nicht ausweichen, kollidiert aber auch nicht – statisch vor
                dynamischem Segment ist in React Router eindeutig. */}
            <Route path="/rooms/new" element={<RoomForm mode="create" />} />
            <Route
              path="/rooms/:id/edit"
              element={<RoomForm mode="edit" />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
