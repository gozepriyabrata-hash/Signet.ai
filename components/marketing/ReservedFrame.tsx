import Image from "next/image";

/**
 * A product screenshot, or the exact box one will occupy.
 *
 * docs/screens.md is explicit that placeholder art is worse than no art, so
 * until the Review screen, the editable-field surface and Settings are real
 * enough to photograph, this renders an empty frame at the final dimensions.
 * Dropping the real asset in later causes no layout shift, because the box
 * never changes size.
 *
 * The hero instance is the LCP element, hence `eager` + `fetchPriority="high"`
 * rather than the `priority` prop, which is deprecated in Next.js 16.
 */
export function ReservedFrame({
  alt,
  width,
  height,
  src,
  sizes,
  eager = false,
  className = "",
}: {
  alt: string;
  width: number;
  height: number;
  src?: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xs border border-border bg-surface ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="h-full w-full object-cover"
        />
      ) : (
        // Not decorative filler — a labelled placeholder that says what is
        // missing, so an empty frame in review reads as pending, not broken.
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full items-center justify-center p-6"
        >
          <span className="text-center text-sm font-light tracking-[0.01em] text-body-foreground">
            Product screenshot pending
          </span>
        </div>
      )}
    </div>
  );
}
