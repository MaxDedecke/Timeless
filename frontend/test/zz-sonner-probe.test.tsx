import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toaster, toast } from "sonner";

describe("sonner probe", () => {
  it("rendert Toaster und zeigt einen Toast", async () => {
    render(<Toaster />);
    toast.success("Check-in erfasst");
    await new Promise((r) => setTimeout(r, 50));
    console.log("body:", document.body.innerHTML.slice(0, 300));
    expect(screen.getByText("Check-in erfasst")).toBeInTheDocument();
  });
});
