/**
 * The hero's looping film panel — the wireframe's "a small 3d video which is
 * always running in a loop".
 *
 * Two branches, and the one that ships today is the empty one. Until a real
 * loop asset exists this renders the exact box the film will occupy, labelled,
 * for the reason ReservedFrame gives: placeholder art is worse than no art,
 * and a box that never changes size causes no layout shift when the asset
 * lands.
 *
 * The playing branch is written now rather than later because of rule 10.
 * `<video autoplay loop>` ignores `prefers-reduced-motion` — the global
 * animation-duration override in app/globals.css cannot touch a video element
 * — so the panel swaps to the still poster under that media query instead.
 * A loop asset must therefore ship with a poster; that is what the type says.
 *
 * Server Component. No motion library, no client JavaScript: the swap is a
 * media query, and the loop is the video element's own attribute.
 */
export function HeroLoop({
  alt,
  width,
  height,
  src,
  poster,
}: {
  alt: string;
  width: number;
  height: number;
  /** An .mp4/.webm under /public. Absent today. */
  src?: string;
  /** Required alongside `src` — it is what reduced-motion viewers see. */
  poster?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border bg-surface"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {src ? (
        <>
          <video
            className="h-full w-full object-cover motion-reduce:hidden"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={poster}
            aria-label={alt}
          >
            <source src={src} />
          </video>
          {poster ? (
            // The still for reduced motion, swapped by a media query rather
            // than by JavaScript; next/image would need a client boundary to
            // do this, and the poster is already sized for the panel.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={alt}
              className="hidden h-full w-full object-cover motion-reduce:block"
            />
          ) : null}
        </>
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full items-center justify-center p-6"
        >
          <span className="text-center text-sm font-light tracking-[0.01em] text-body-foreground">
            Product film pending
          </span>
        </div>
      )}
    </div>
  );
}
