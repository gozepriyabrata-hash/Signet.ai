/**
 * Ambient, decorative motion behind the Hero and the closing CTA band —
 * atmosphere, never product footage. Modeled on HeroLoop.tsx's <video>
 * handling: autoplaying, muted, looping, aria-hidden, and hidden outright
 * under prefers-reduced-motion via the `motion-reduce:` Tailwind variant
 * rather than JavaScript, because a video's own autoplay ignores the global
 * animation-duration override in app/globals.css.
 *
 * Unlike HeroLoop, there is no poster/fallback content: this carries no
 * information (it is aria-hidden), so there is nothing to preserve for a
 * reduced-motion viewer — the section behind it just falls back to its own
 * background color.
 *
 * `preload="metadata"`: decorative, and must never contend with the hero
 * headline — the actual LCP element — for bandwidth. (`fetchPriority` isn't
 * in React's `<video>` attribute types, unlike `<img>`, so `preload` is the
 * one lever available here.)
 */
export function AmbientVideo({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return (
    <video
      aria-hidden="true"
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      className={`pointer-events-none object-cover motion-reduce:hidden ${className}`}
    >
      <source src={src} />
    </video>
  );
}
