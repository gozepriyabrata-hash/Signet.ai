"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { Cta, NavAnchor } from "@/types";

/**
 * The only client component on the landing page.
 *
 * Built to the WAI-ARIA APG disclosure pattern: a real <button> whose
 * aria-expanded reflects state, aria-controls names the panel, Enter and Space
 * activate it (free, from <button>), Escape closes, and focus returns to the
 * trigger on close.
 *
 * Deliberately NOT <details>/<summary>: that element is the right foundation
 * for disclosing prose — which is why the FAQ uses it — but not for
 * command-centric navigation, where interactive elements nested inside a
 * <summary> are inconsistently exposed to screen readers. See
 * specs/002-landing-page.md §3.5 and §5.
 */
const PANEL_LINK_CLASS =
  "block rounded-xs px-2 py-2.5 text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function MobileNav({
  anchors,
  cta,
  loginCta,
}: {
  anchors: readonly NavAnchor[];
  cta: Cta;
  loginCta: Cta;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {open ? "Close" : "Menu"}
      </button>

      <div id={panelId} hidden={!open} className="absolute inset-x-0 top-full border-b border-border bg-background">
        <ul className="flex flex-col gap-1 px-6 py-4">
          {anchors.map((anchor) => (
            <li key={anchor.href}>
              {/* A fragment is a plain <a>; a path is a next/link, so "Policy"
                  reaches /legal/privacy as a client transition rather than a
                  full page load. Same branch as MarketingNav. */}
              {anchor.href.startsWith("#") ? (
                <a
                  href={anchor.href}
                  onClick={() => setOpen(false)}
                  className={PANEL_LINK_CLASS}
                >
                  {anchor.label}
                </a>
              ) : (
                <Link
                  href={anchor.href}
                  onClick={() => setOpen(false)}
                  className={PANEL_LINK_CLASS}
                >
                  {anchor.label}
                </Link>
              )}
            </li>
          ))}
          <li className="pt-2">
            <Link
              href={loginCta.href}
              onClick={() => setOpen(false)}
              className={PANEL_LINK_CLASS}
            >
              {loginCta.label}
            </Link>
          </li>
          <li>
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {cta.label}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
