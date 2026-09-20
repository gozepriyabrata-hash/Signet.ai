"use client";

import { useEffect } from "react";

import { NAV_SCROLL_THRESHOLD, useScrolled } from "@/hooks/use-scrolled";

/**
 * Toggles `html[data-nav-scrolled]`, read by `.marketing-nav`'s CSS rule in
 * app/globals.css to flip the sticky header from transparent to a
 * translucent, blurred surface. The same imperative-attribute-on-`<html>`
 * technique the sidebar's `data-sidebar` mechanism already uses, just a
 * different attribute — a class on `MarketingNav`'s own root would work too,
 * but `MarketingNav` is a Server Component, and this keeps it one.
 *
 * Renders nothing. Runs after hydration, so it doesn't disturb the marketing
 * layout's existing one-level-deep `suppressHydrationWarning` (no attribute
 * is present during SSR; this only ever adds it client-side after mount).
 */
export function NavScrollWatcher() {
  const scrolled = useScrolled(NAV_SCROLL_THRESHOLD);

  useEffect(() => {
    document.documentElement.dataset.navScrolled = String(scrolled);
    return () => {
      delete document.documentElement.dataset.navScrolled;
    };
  }, [scrolled]);

  return null;
}
