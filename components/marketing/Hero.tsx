import Link from "next/link";

import { hero, primaryCta } from "@/app/(marketing)/_content";
import { HeroLoop } from "@/components/marketing/HeroLoop";

/**
 * The hero, laid out from the landing-page wireframe: the headline on the
 * left, the supporting paragraph set small on the right at the same optical
 * baseline, then the looping film panel across the full width with the one
 * "Get started" pill centred beneath it.
 *
 * Accent use 1 of 2 (specs/002 §3.10): a single low-alpha --accent wash behind
 * the headline. This is the one surface in the product where accent acts as
 * brand rather than as an AI signal. No gradient card, no glassmorphism, no
 * second hue — those anti-patterns are not suspended. The wireframe's colour
 * band between the two feature sections is illustration, not a second accent
 * treatment, and is drawn in the artwork-only pastels for that reason.
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
        {/* `grid-cols-1` is load-bearing, not decorative: without an explicit
            track below `lg`, a CSS grid's implicit column sizes to its child's
            max-content width — the headline's *unwrapped* width — and the
            whole row overflows the viewport instead of wrapping. Tailwind's
            numbered `grid-cols-*` utilities wrap every track in
            `minmax(0, …)` for exactly this reason; the custom `lg:` track
            below does not, so `min-w-0` on both children carries the same
            guarantee up through the two-column breakpoint. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-16">
          <h1 className="min-w-0 text-2xl font-light leading-[1.15] tracking-[-0.022em] text-foreground sm:text-5xl lg:text-[4rem] lg:leading-[1.05]">
            {hero.headline.lead}
            {/* The two-tone headline device — docs/design-system.md §2: the
                opening clause in --foreground, the closing clause in
                --body-foreground. It only reads as the device when the second
                clause starts its own line, hence `block`.

                Base size is `text-2xl`, two steps down from the desktop-scale
                `text-4xl` the wireframe implies, so the opening clause wraps
                to three lines (plus this closing one) at ordinary phone
                widths (~360px and up) — four lines total, verified against
                the actual rendered line count, not eyeballed, since text
                wrapping is exactly the kind of thing that looks fine at one
                width and wrong at the next. `sm:`/`lg:` scale back up where
                there is room. Do not replace this with a bracketed arbitrary
                value at the base breakpoint (e.g. `text-[1.5rem]`) — in this
                project's build, an unprefixed arbitrary `text-[…]` on an
                element that also carries a `text-<color>` utility fails to
                generate a font-size rule at all (verified via computed
                style: falls back to the inherited 16px). A
                breakpoint-prefixed arbitrary value, like `lg:text-[4rem]`
                below, is unaffected — the failure is specific to the base,
                unprefixed case. */}
            <span className="block text-body-foreground">
              {hero.headline.trail}
            </span>
          </h1>

          <p className="min-w-0 max-w-[46ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground lg:pb-3">
            {hero.subhead}
          </p>
        </div>

        <div className="mt-14">
          <HeroLoop
            alt={hero.loop.alt}
            width={hero.loop.width}
            height={hero.loop.height}
          />
        </div>

        <div className="mt-10 flex justify-center">
          {/* next/link: /signup is inside (marketing), same as this page (specs/012 §3). */}
          <Link
            href={primaryCta.href}
            className="inline-flex items-center rounded-full bg-primary px-8 py-3 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {primaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
