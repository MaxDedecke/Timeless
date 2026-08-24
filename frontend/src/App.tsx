import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Approvals from "./pages/Approvals";
import DayView from "./pages/DayView";
import RoomCalendar from "./pages/RoomCalendar";
import RoomForm from "./pages/RoomForm";
import RoomList from "./pages/RoomList";
import RoomSearch from "./pages/RoomSearch";

/**
 * App-Shell: dauerhafte Sidebar links (ab lg fixiert sichtbar, darunter
 * Off-Canvas), Inhalt daneben. Alle Client-Fetches laufen über relative
 * Pfade (/api/...) – der Frontend-Container reicht sie als Reverse-Proxy
 * an das Backend im Compose-Netz weiter; im Browser-Code taucht nie ein
 * Servicename auf.
 */

/**
 * Wurzelroute: Der frühere Systemstatus-Platzhalter ist entfernt. „/“ leitet
 * direkt auf die Raumliste weiter (replace, damit kein toter Verlaufseintrag
 * entsteht) – die URL bleibt konsistent auf /rooms und die Sidebar markiert
 * dort den Bereich „Räume“ als aktiv.
 */
function RootRedirect() {
  return <Navigate to="/rooms" replace />;
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
            <Route path="/" element={<RootRedirect />} />
            {/* Freie-Räume-Suche (Anforderung 4, Konzept „Freie-Räume-
                Suche“): Route /free, Sidebar-Punkt „Freie Räume“. */}
            <Route path="/free" element={<RoomSearch />} />
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
            {/* Tagesansicht (Anforderung 6): Standort als Routensegment,
                Datum als Suchparameter. Ohne Segment greift der Fallback auf
                den ersten Standort – der Sidebar-Link zeigt deshalb bewusst
                auf /day. */}
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/day" element={<DayView />} />
            <Route path="/day/:locationId" element={<DayView />} />
            {/* Unbekannte Pfade landen wie die Wurzel direkt bei der
                Raumliste – ohne den Umweg über „/“. */}
            <Route path="*" element={<Navigate to="/rooms" replace />} />
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
