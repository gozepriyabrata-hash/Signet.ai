import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketingNav } from "@/components/marketing/MarketingNav";

/**
 * Pins specs/012's decision: `/login` is a quiet link, `/signup` is the one
 * `--primary` pill, and neither points at the now-gated `/dashboard`.
 */
describe("MarketingNav", () => {
  it("renders the three in-page anchors, unchanged", () => {
    render(<MarketingNav />);
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(screen.getByRole("link", { name: "Security" })).toHaveAttribute("href", "#security");
  });

  it("links Log in to /login as a quiet link, not a pill", () => {
    render(<MarketingNav />);
    const loginLinks = screen.getAllByRole("link", { name: "Log in" });
    for (const link of loginLinks) {
      expect(link).toHaveAttribute("href", "/login");
      expect(link.className).not.toMatch(/bg-primary/);
    }
  });

  it("links the one primary CTA to /signup, never /dashboard", () => {
    render(<MarketingNav />);
    const ctaLinks = screen.getAllByRole("link", { name: "Create a workspace" });
    expect(ctaLinks.length).toBeGreaterThan(0);
    for (const link of ctaLinks) {
      expect(link).toHaveAttribute("href", "/signup");
    }
  });
});
