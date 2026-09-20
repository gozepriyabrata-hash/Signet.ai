"use client";

import type { ReactNode } from "react";

import { useHasMounted } from "@/hooks/use-has-mounted";
import { useInView } from "@/hooks/use-in-view";

/**
 * `Reveal.tsx`'s sibling for the cinematic landing-page sections
 * (specs/017): same `useInView`-gated mount/hidden state, but `.tilt-reveal`
 * (app/globals.css) adds a slight rotation and scale to the hidden state on
 * top of the existing lift-and-fade, and `delay` lets a row of siblings fan
 * in staggered rather than as one block — both still transform and opacity
 * only, so `prefers-reduced-motion` collapses them the same way.
 *
 * Not a replacement for `Reveal`, which still wraps the two `FeatureSplit`
 * bands: those get the plainer fade-and-lift, matching their existing test
 * coverage and the more subdued treatment a feature section calls for. This
 * one is for content that reads as a "fanning in" set — step cards, proof
 * rows, arc-gallery tiles.
 */
export function TiltReveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const hasMounted = useHasMounted();
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={className ? `tilt-reveal ${className}` : "tilt-reveal"}
      data-reveal-state={hasMounted && !inView ? "hidden" : undefined}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
