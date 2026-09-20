import type { CSSProperties } from "react";

import { faq, faqAmbientVideo } from "@/app/(marketing)/_content";
import { AmbientVideo } from "@/components/marketing/AmbientVideo";
import type { FaqEntry } from "@/types";

/**
 * The FAQ, restyled as three independently-looping horizontal rows of cards
 * on request — replacing the accordion `Faq.tsx` normally renders here.
 * `Faq.tsx` stays dormant, not deleted (same precedent as `StepRail` and
 * `SecurityBigType`): its own test still renders and pins it directly.
 *
 * Pure CSS, no client boundary: every row reuses the `marquee-track`
 * keyframe `WorkflowMarquee` already defines (app/globals.css) — swapping
 * `animation-direction` to `reverse` gets the alternating direction for
 * free, so no second keyframe exists. Each row is wrapped in the same
 * `.marquee-edge-fade` mask `WorkflowMarquee` uses.
 *
 * Unlike that ticker, this row's content is real — a screen reader or
 * find-in-page search should reach every question and answer — so only the
 * duplicated copy that makes the loop seamless is `aria-hidden`, not the
 * whole row.
 *
 * Pausing on hover isn't optional the way it might be for a decorative logo
 * strip: an answer someone is mid-sentence reading should stop moving under
 * the cursor. `prefers-reduced-motion` freezes every row the same way
 * `.marquee-track` already does.
 *
 * The ambient video behind the section is the same clip Hero/FinalCta use
 * (`faqAmbientVideo`, _content.ts) — atmosphere, not product footage. It only
 * shows through the section's own padding and the gaps around cards: the
 * cards are opaque (`bg-surface`), so no answer text ever sits on top of it.
 */

interface FaqRowConfig {
  entries: readonly FaqEntry[];
  direction: "left" | "right";
  durationSeconds: number;
}

// Ten entries split across three rows for visual rhythm only — if the count
// in `faq` (_content.ts) changes, update this split.
const ROWS: readonly FaqRowConfig[] = [
  { entries: faq.slice(0, 4), direction: "left", durationSeconds: 44 },
  { entries: faq.slice(4, 7), direction: "right", durationSeconds: 52 },
  { entries: faq.slice(7, 10), direction: "left", durationSeconds: 60 },
];

function FaqCard({ entry }: { entry: FaqEntry }) {
  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 rounded-md border border-border bg-surface p-6 sm:w-96">
      <h3 className="text-base font-normal text-foreground">{entry.question}</h3>
      <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
        {entry.answer}
      </p>
    </div>
  );
}

function FaqRow({ entries, direction, durationSeconds }: FaqRowConfig) {
  const trackClass = direction === "right" ? "faq-row-track-reverse" : "faq-row-track";

  return (
    <div className="marquee-edge-fade overflow-hidden">
      <div
        className={`flex w-max gap-6 ${trackClass}`}
        style={{ "--faq-duration": `${durationSeconds}s` } as CSSProperties}
      >
        <div className="flex shrink-0 gap-6">
          {entries.map((entry) => (
            <FaqCard key={entry.question} entry={entry} />
          ))}
        </div>
        {/* Duplicate for the seamless loop, same technique as
            WorkflowMarquee — aria-hidden so it isn't announced or found
            twice, since the first copy above already carries the real
            content. */}
        <div aria-hidden="true" className="flex shrink-0 gap-6">
          {entries.map((entry) => (
            <FaqCard key={`${entry.question}-duplicate`} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FaqScroller() {
  return (
    <section
      id="faq"
      className="relative isolate overflow-hidden border-t border-border py-16 lg:py-24"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20">
        <AmbientVideo src={faqAmbientVideo.src} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/60" />
      </div>

      <h2 className="mx-auto max-w-3xl px-6 text-2xl font-normal tracking-tight text-foreground lg:px-8">
        Questions
      </h2>

      <div className="mt-10 flex flex-col gap-8">
        {ROWS.map((row, index) => (
          <FaqRow key={index} {...row} />
        ))}
      </div>
    </section>
  );
}
