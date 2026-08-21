import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../src/App";

describe("App", () => {
  it("rendert den Anwendungstitel", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Timeless" })).toBeTruthy();
  });
});
