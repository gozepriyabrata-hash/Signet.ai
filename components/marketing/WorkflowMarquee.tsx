import { tickerWords as defaultTickerWords } from "@/app/(marketing)/_content";

/**
 * The reference video's full-width marquee ticker. The words are decorative
 * branding copy (`tickerWords` in _content.ts) — a creator-pipeline rhythm
 * chosen for tone — not a second statement of the product's real seven-step
 * workflow, which StepRail and WorkflowArc still render from `steps`
 * unchanged. That's why the whole band is `aria-hidden`: unlike a rail of
 * real steps, stylised ticker copy has no accessible content worth
 * announcing on its own.
 *
 * `bg-surface-invert`/`text-on-invert`: the reference crops this band in the
 * light inversion against an otherwise all-dark page, and this design system
 * already names that exact move — "the scarce light inversion"
 * (docs/design-system.md §1). Marketing has no other inverted surface, so
 * this is the one signature use, not a second one stacked on the Review
 * screen's — that surface lives entirely in the workspace, a different
 * root layout this page never renders.
 *
 * Pure CSS: `.marquee-track` (app/globals.css) is one `@keyframes` loop, no
 * scroll listener and no client boundary. The track is rendered twice back to
 * back and the keyframe translates exactly -50%, so the seam between the two
 * copies is invisible and the loop never resets.
 *
 * `words` accepts any list, but the loop rhythm (one duplicated track, evenly
 * spaced) assumes seven short entries the way `tickerWordSets` in
 * _content.ts provides them; swapping the whole page's tone is a one-line
 * change there, not a prop most call sites need to touch.
 */
export function WorkflowMarquee({
  words = defaultTickerWords,
}: {
  words?: readonly string[];
}) {
  const track = (
    <span className="flex shrink-0 items-center">
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="whitespace-nowrap px-8 text-6xl font-light uppercase leading-none tracking-[-0.01em] lg:text-8xl"
        >
          {word}
          <span aria-hidden="true" className="pl-8 align-middle text-3xl opacity-40 lg:text-5xl">
            +
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      aria-hidden="true"
      className="marquee-edge-fade overflow-hidden border-y border-border bg-surface-invert py-10 text-on-invert lg:py-14"
    >
      <div className="marquee-track flex w-max">
        {track}
        {track}
      </div>
    </div>
  );
}
