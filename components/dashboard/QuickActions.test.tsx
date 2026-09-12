import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuickActions } from "@/components/dashboard/QuickActions";

/**
 * A Server Component with no query and no store — specs/015-dashboard-redesign.md
 * §3.2 — so a plain render is enough; no QueryClientProvider needed.
 */
describe("QuickActions", () => {
  it("links to the three routes specs/001-route-map.md already fixed", () => {
    render(<QuickActions />);

    expect(screen.getByRole("link", { name: /Projects/ })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: /Campaigns/ })).toHaveAttribute(
      "href",
      "/campaigns",
    );
    expect(screen.getByRole("link", { name: /Analytics/ })).toHaveAttribute(
      "href",
      "/analytics",
    );
  });

  it("does not offer a templates card", () => {
    render(<QuickActions />);
    expect(screen.queryByText(/template/i)).not.toBeInTheDocument();
  });
});
