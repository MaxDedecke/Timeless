import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

/**
 * Tests für das App-Shell: Sidebar (Desktop sichtbar, mobil einklappbar,
 * aktiver Menüpunkt markiert), Redirect der Wurzelroute „/“ auf die
 * Raumliste (/rooms – kein Systemstatus-Platzhalter mehr) und Verdrahtung
 * der Raumliste unter /rooms. Das Backend wird über global.fetch gemockt –
 * der Test prüft zugleich, dass der Client ausschließlich relative
 * /api-Pfade aufruft.
 */

const ROOMS = [
  {
    id: 1,
    name: "Atelier Nord",
    locationId: 7,
    capacity: 12,
    amenities: [
      { key: "beamer", label: "Beamer" },
      { key: "whiteboard", label: "Whiteboard" },
    ],
    location: { id: 7, name: "Werkhaus" },
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockBackend(rooms?: { status?: number; body?: unknown }) {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url === "/api/rooms") {
      return jsonResponse(rooms?.body ?? [], rooms?.status ?? 200);
    }
    throw new Error(`Unerwarteter Fetch: ${url}`);
  });
}

afterEach(() => {
  // cleanup() ist nötig, weil vitest mit globals:false läuft und
  // @testing-library/react daher kein Auto-Cleanup registriert.
  cleanup();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App-Shell", () => {
  it("leitet die Wurzelroute „/“ auf die Raumliste (/rooms) weiter", async () => {
    const backend = mockBackend({ body: ROOMS });
    global.fetch = backend;
    render(<App />);

    // Redirect ist gelaufen, sobald die Raumliste lädt bzw. steht.
    await waitFor(() =>
      expect(window.location.pathname).toBe("/rooms")
    );

    // Kein Rest des alten Systemstatus-Platzhalters.
    expect(
      screen.queryByRole("heading", { name: "Systemstatus" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Übersicht")).not.toBeInTheDocument();

    // Die Liste holt ihre Daten – über den relativen Pfad – und steht da.
    expect(backend).toHaveBeenCalledWith("/api/rooms", expect.anything());
    expect(await screen.findByTestId("rooms-grid")).toBeInTheDocument();
    expect(
      await within(screen.getByTestId("rooms-grid")).findByText("Atelier Nord")
    ).toBeInTheDocument();
  });

  it("zeigt unter /rooms den aktiven Menüpunkt Räume und lädt die Raumliste", async () => {
    const backend = mockBackend({ body: ROOMS });
    global.fetch = backend;
    window.history.pushState({}, "", "/rooms");
    render(<App />);

    const nav = await screen.findByRole("navigation", {
      name: "Hauptnavigation",
    });
    const roomsLink = within(nav).getByRole("link", { name: "Räume" });
    await waitFor(() => expect(roomsLink).toHaveAttribute("aria-current", "page"));

    // Kein eigener „Übersicht“-Menüpunkt mehr – „/“ leitet auf /rooms.
    expect(
      within(nav).queryByRole("link", { name: "Übersicht" })
    ).not.toBeInTheDocument();
    // Der Raumlisten-Einstieg ist der erste Menüpunkt.
    const navLinks = within(nav).getAllByRole("link");
    expect(navLinks[0]).toHaveTextContent("Räume");

    // Nur relative /api-Pfade, keine Servicename-Hosts im Client-Fetch.
    // (fetch erhält zusätzlich das AbortSignal aus dem useEffect-Cleanup.)
    expect(backend).toHaveBeenCalledWith("/api/rooms", expect.anything());
    const card = await screen.findByText("Atelier Nord");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Werkhaus")).toBeInTheDocument();
    expect(screen.getByText("Beamer")).toBeInTheDocument();
  });

  it("markiert auf der Unterseite /rooms/1 den Menüpunkt Räume weiter als aktiv", async () => {
    const backend = mockBackend({
      body: {
        room: ROOMS[0],
        bookings: [],
      },
    });
    global.fetch = backend;
    window.history.pushState({}, "", "/rooms/1");
    render(<App />);

    // Der NavLink „Räume“ hat kein `end` – er gilt für den Bereich inkl.
    // Unterseiten (Konzept, Navigation): Das Raumdetail markiert weiter „Räume“.
    const nav = await screen.findByRole("navigation", {
      name: "Hauptnavigation",
    });
    const roomsLink = within(nav).getByRole("link", { name: "Räume" });
    await waitFor(() =>
      expect(roomsLink).toHaveAttribute("aria-current", "page")
    );

    // Die Ansicht selbst lädt Raum und Buchungen über relative Pfade.
    await waitFor(() => expect(backend).toHaveBeenCalledWith("/api/rooms/1", expect.anything()));
    expect(backend).toHaveBeenCalledWith(
      "/api/bookings?roomId=1",
      expect.anything()
    );
  });

  it("klappt die Sidebar auf schmalen Breiten aus und schließt sie per Menüpunkt", async () => {
    const user = userEvent.setup();
    global.fetch = mockBackend({ body: ROOMS });
    render(<App />);

    // Off-Canvas beginnt geschlossen …
    const trigger = screen.getByTestId("sidebar-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("mobile-sidebar")).not.toBeInTheDocument();

    // … öffnet per Burger …
    await user.click(trigger);
    const panel = screen.getByTestId("mobile-sidebar");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // … und schließt wieder bei Auswahl eines Menüpunkts.
    await user.click(within(panel).getByRole("link", { name: "Räume" }));
    await waitFor(() =>
      expect(screen.queryByTestId("mobile-sidebar")).not.toBeInTheDocument()
    );
  });
});
