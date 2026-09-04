"use client";

import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`, resetting the timer on every change.
 *
 * The projects search runs through the service seam (specs/004 §3.6), so each
 * distinct value is a network call — and the mock adds 300–800ms of deliberate
 * latency on top. Undebounced, typing "meridian" fires eight requests and the
 * last one to *resolve* wins, which is not necessarily the last one sent.
 *
 * The setState here is inside a timeout rather than in the effect body, so it
 * does not trip the cascading-render rule that rejects synchronous setState in
 * an effect.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
