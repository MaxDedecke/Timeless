import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

/**
 * Tests für das App-Shell: Sidebar (Desktop sichtbar, mobil einklappbar,
 * aktiver Menüpunkt markiert) und Verdrahtung der Raumliste unter /rooms.
 * Das Backend wird über global.fetch gemockt – der Test prüft zugleich, dass
 * der Client ausschließlich relative /api-Pfade aufruft.
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
    if (url === "/api/health/ready") {
      return jsonResponse({ status: "ok", database: "up" });
    }
    if (url === "/api/rooms") {
      return jsonResponse(rooms?.body ?? [], rooms?.status ?? 200);
    }
    throw new Error(`Unerwarteter Fetch: ${url}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App-Shell", () => {
  it("rendert die Sidebar mit aktiven Menüpunkt auf der Startseite", async () => {
    global.fetch = mockBackend();
    render(<App />);

    const nav = await screen.findByRole("navigation", {
      name: "Hauptnavigation",
    });
    const overview = within(nav).getByRole("link", { name: "Übersicht" });
    expect(overview).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Räume" })).not.toHaveAttribute(
      "aria-current"
    );
    expect(
      screen.getByRole("heading", { name: "Übersicht", level: 1 })
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
    expect(
      within(nav).getByRole("link", { name: "Übersicht" })
    ).not.toHaveAttribute("aria-current");

    // Nur relative /api-Pfade, keine Servicename-Hosts im Client-Fetch.
    expect(backend).toHaveBeenCalledWith("/api/rooms");
    const card = await screen.findByText("Atelier Nord");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Werkhaus")).toBeInTheDocument();
    expect(screen.getByText("Beamer")).toBeInTheDocument();
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
