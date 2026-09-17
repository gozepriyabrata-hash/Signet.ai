"use client";

import type { ReactNode } from "react";

import { useHasMounted } from "@/hooks/use-has-mounted";
import { useInView } from "@/hooks/use-in-view";

/**
 * Fades and lifts a landing-page section in the first time it scrolls into
 * view — CSS only (`.motion-reveal` in app/globals.css), matching the
 * "Motion is CSS only, no library" rule and specs/002 §3.6's decision not to
 * take a Framer Motion dependency. Never wraps `Hero`: that block holds the
 * LCP element and specifically documents that nothing on it animates.
 *
 * `data-reveal-state="hidden"` is gated on `useHasMounted` so a first paint
 * — SSR or JS disabled — renders every section fully visible, the same
 * progressive-enhancement reasoning `useHasMounted` itself documents for
 * localStorage-derived values. Once mounted, `useInView` decides when to
 * drop the attribute and let `.motion-reveal`'s transition animate the
 * section in.
 */
export function Reveal({ children }: { children: ReactNode }) {
  const hasMounted = useHasMounted();
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="motion-reveal"
      data-reveal-state={hasMounted && !inView ? "hidden" : undefined}
    >
      {children}
    </div>
  );
}
