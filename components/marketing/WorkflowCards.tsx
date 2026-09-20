"use client";

import { useMemo } from "react";

import { cardImages, pickRandomCardImages } from "@/components/marketing/cardImages";
import { ImageStreamHero } from "@/components/marketing/ImageStreamHero";
import { TiltReveal } from "@/components/marketing/TiltReveal";
import { useHasMounted } from "@/hooks/use-has-mounted";

/**
 * The client leaf of `WorkflowArc`: the only part of that section that must
 * differ between visits, since it re-orders the flashcard pool into a fresh
 * arrangement for `ImageStreamHero`'s two rails on every page load.
 *
 * `useHasMounted` — the same `useSyncExternalStore` gate `TiltReveal` already
 * uses — renders the pool in its fixed, deterministic order during SSR and
 * the first client pass, then swaps in the shuffled order once mounted.
 * That is what keeps this hydration-safe without a `useEffect`-driven
 * `setState`.
 */
export function WorkflowCards() {
  const hasMounted = useHasMounted();
  const images = useMemo(
    () => (hasMounted ? pickRandomCardImages(cardImages, cardImages.length) : cardImages),
    [hasMounted],
  );

  return (
    <TiltReveal>
      <ImageStreamHero images={images} className="h-105 w-full" />
    </TiltReveal>
  );
}
