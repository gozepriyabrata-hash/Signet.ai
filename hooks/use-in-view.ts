"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Reports once a given element has entered the viewport, then stops
 * watching — the scroll-reveal pattern only ever needs to fire once per
 * element, not toggle back out when it scrolls back offscreen.
 *
 * `threshold`/`rootMargin` fire the reveal a little before the element's top
 * edge is fully on screen (`-10%` on the bottom margin), so content is
 * settled by the time a normal scroll speed brings it level with the eye.
 */
export function useInView<T extends Element>(): {
  ref: RefObject<T | null>;
  inView: boolean;
} {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
