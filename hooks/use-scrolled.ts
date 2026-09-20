"use client";

import { useEffect, useState } from "react";

/**
 * Shared threshold for MarketingNav's own scroll reaction — the header
 * flips from transparent to a translucent, blurred surface at the same pixel
 * offset NavLogo's wordmark collapses at, so the two read as one motion
 * instead of two effects firing out of sync.
 */
export const NAV_SCROLL_THRESHOLD = 20;

/**
 * Tracks whether the page has scrolled past `threshold` pixels. Used to
 * shrink the sticky nav wordmark once the user leaves the top of the page,
 * and restore it when they scroll back — the same pattern anthropic.com's
 * nav uses. The listener is passive and reads `window.scrollY` directly
 * rather than the scroll event's payload, so it stays correct regardless of
 * what else is listening.
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
