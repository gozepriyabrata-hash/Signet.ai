import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { steps } from "@/app/(marketing)/_content";
import { StepRail } from "@/components/marketing/StepRail";

/**
 * The golden path in CLAUDE.md is seven steps, and the rail is the landing
 * page's promise that the product has exactly those seven. A step quietly
 * disappearing here is a marketing page that no longer describes the product.
 */
describe("StepRail", () => {
  it("renders all seven steps of the golden path, in order", () => {
    render(<StepRail />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(7);

    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(headings[0]).toContain("Report");
    expect(headings[5]).toContain("Review");
    expect(headings[6]).toContain("Send");
    expect(steps).toHaveLength(7);
  });

  it("marks exactly one step as the human gate", () => {
    render(<StepRail />);
    expect(screen.getAllByText("the human gate")).toHaveLength(1);
  });

  it("is reachable by its nav anchor", () => {
    const { container } = render(<StepRail />);
    expect(container.querySelector("#how-it-works")).toBeInTheDocument();
  });
});
