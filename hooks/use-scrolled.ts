"use client";

import { useEffect, useState } from "react";

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
