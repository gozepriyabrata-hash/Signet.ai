import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketingNav } from "@/components/marketing/MarketingNav";

/**
 * Pins the wireframe's nav, and the part of specs/012 the wireframe did not
 * change: `/login` is a quiet link, there is exactly one `--primary` pill, and
 * neither points at the now-gated `/dashboard`.
 *
 * "Pricing" and "Security" are both deliberately absent — neither has a
 * section to land on today, and _content.ts records why. If either comes
 * back, it comes back with a section to land on.
 *
 * "Research" points at `#clip-flow`, not `#faq` — the FAQ section was
 * dropped from the page, and _content.ts records why the label itself
 * stayed rather than being dropped along with it.
 */
describe("MarketingNav", () => {
  it("renders the three wireframe labels still wired to a section", () => {
    render(<MarketingNav />);

    expect(screen.getByRole("link", { name: "Research" })).toHaveAttribute("href", "#clip-flow");
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
    expect(screen.queryByRole("link", { name: "Pricing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Security" })).not.toBeInTheDocument();
  });

  it("points Policy at the published privacy policy, not a fragment", () => {
    render(<MarketingNav />);
    expect(screen.getByRole("link", { name: "Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("links Log in to /login as a quiet link, not a pill", () => {
    render(<MarketingNav />);
    const loginLinks = screen.getAllByRole("link", { name: "Log in" });
    for (const link of loginLinks) {
      expect(link).toHaveAttribute("href", "/login");
      expect(link.className).not.toMatch(/bg-primary/);
    }
  });

  it("links the one primary pill to /signup, never /dashboard", () => {
    render(<MarketingNav />);
    const ctaLinks = screen.getAllByRole("link", { name: "Workspace" });
    expect(ctaLinks.length).toBeGreaterThan(0);
    for (const link of ctaLinks) {
      expect(link).toHaveAttribute("href", "/signup");
    }
  });
});
