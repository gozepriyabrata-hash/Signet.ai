import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MobileNav } from "@/components/marketing/MobileNav";
import type { Cta, NavAnchor } from "@/types";

const anchors: readonly NavAnchor[] = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

const cta: Cta = { href: "/signup", label: "Create a workspace" };
const loginCta: Cta = { href: "/login", label: "Log in" };

/**
 * Pins the WAI-ARIA APG disclosure contract that specs/002 §3.4 chose over the
 * zero-JavaScript <details> shortcut. If these fail, the reason we accepted a
 * client component at all has evaporated.
 */
describe("MobileNav", () => {
  function setup() {
    render(<MobileNav anchors={anchors} cta={cta} loginCta={loginCta} />);
    return screen.getByRole("button", { name: "Menu" });
  }

  it("starts collapsed, with aria-expanded false", () => {
    const trigger = setup();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("names a panel that actually exists in the document", () => {
    const trigger = setup();
    const panelId = trigger.getAttribute("aria-controls");

    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toBeInTheDocument();
  });

  it("hides the panel until it is opened", async () => {
    const trigger = setup();
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls") as string,
    );

    expect(panel).not.toBeVisible();

    await userEvent.click(trigger);
    expect(panel).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens with Enter and with Space", async () => {
    const trigger = setup();

    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const trigger = setup();

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes when an anchor in the panel is followed", async () => {
    const trigger = setup();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("link", { name: "Pricing" }));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
