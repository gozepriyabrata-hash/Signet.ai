import Link from "next/link";

import { hero, primaryCta, secondaryCta } from "@/app/(marketing)/_content";
import { ReservedFrame } from "@/components/marketing/ReservedFrame";

/**
 * The hero.
 *
 * Accent use 1 of 2 (specs/002 §3.10): a single low-alpha --accent wash behind
 * the headline. This is the one surface in the product where accent acts as
 * brand rather than as an AI signal. No gradient card, no glassmorphism, no
 * second hue — those anti-patterns are not suspended.
 *
 * Nothing here animates. This block holds the LCP element, and every fade-in
 * on it is a measurable delay to the metric the page exists to win.
 */
export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      {/* The accent wash. Decorative, hidden from assistive tech. Derived from
          the --accent token rather than any literal colour, so it moves with
          the theme and never introduces a hex (CLAUDE.md rule 6). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10"
        style={{
          height: "36rem",
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--accent) 12%, transparent), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        <h1 className="max-w-4xl text-4xl font-light leading-[1.05] tracking-[-0.022em] text-foreground sm:text-5xl lg:text-[4.5rem]">
          {hero.headline.lead}
          {/* The two-tone headline device — docs/design-system.md §2: first
              line in --foreground, second in --body-foreground, splitting a
              two-clause message. It only reads as the device when the second
              clause starts its own line, hence `block`. */}
          <span className="block text-body-foreground">
            {hero.headline.trail}
          </span>
        </h1>

        <p className="mt-8 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {hero.subhead}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          {/* next/link: /signup is inside (marketing), same as this page (specs/012 §3). */}
          <Link
            href={primaryCta.href}
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {primaryCta.label}
          </Link>
          <a
            href={secondaryCta.href}
            className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {secondaryCta.label}
          </a>
        </div>

        <div className="mt-16">
          <ReservedFrame
            alt={hero.shot.alt}
            width={hero.shot.width}
            height={hero.shot.height}
            sizes="(max-width: 1152px) 100vw, 1152px"
            eager
          />
        </div>
      </div>
    </section>
  );
}
