import { hero } from "@/app/(marketing)/_content";
import { AmbientVideo } from "@/components/marketing/AmbientVideo";
import { HeroField } from "@/components/marketing/HeroField";
import { HeroLoop } from "@/components/marketing/HeroLoop";

/**
 * The hero headline's closing clause gets one deliberate typographic accent:
 * its last word, in the italic serif face (`--font-serif`, app/fonts.ts).
 * Split in code rather than duplicating the string, so the styling survives
 * unchanged if `hero.headline.trail` is edited later.
 */
const trailWords = hero.headline.trail.split(" ");
const trailAccentWord = trailWords.pop();
const trailLead = trailWords.join(" ");

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
 * The headline, subhead and CTAs do not animate. This block holds the LCP
 * element, and every fade-in on it is a measurable delay to the metric the
 * page exists to win. `HeroField` (specs/017) is the one exception: a
 * decorative, `aria-hidden` canvas that mounts client-side after hydration,
 * behind everything, and contributes nothing to the server-rendered paint.
 */
export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      {/* Ambient background video — atmosphere, never product footage (see
          the comment on hero.ambientVideo in _content.ts). Sits behind
          everything else in the hero, including HeroField's canvas, with a
          gradient overlay built entirely from --color-background so the
          headline stays legible without introducing a new token. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-30 overflow-hidden">
        <AmbientVideo src={hero.ambientVideo.src} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
      </div>

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
      {/* `inset-0` on the whole section, not the 36rem band the accent wash
          uses: the reference's line field crosses the entire hero, including
          past the film panel, not just the band behind the headline. */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <HeroField />
      </div>

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
              {trailLead}
              {trailLead ? " " : ""}
              <span className="font-serif italic">{trailAccentWord}</span>
            </span>
          </h1>

          <div className="min-w-0 lg:pb-3">
            <p className="max-w-[46ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              {hero.subhead}
            </p>
          </div>
        </div>

        <div className="mt-14">
          <HeroLoop
            alt={hero.loop.alt}
            width={hero.loop.width}
            height={hero.loop.height}
          />
        </div>

      </div>
    </section>
  );
}
