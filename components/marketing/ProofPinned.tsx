import { Eye, Settings2, ShieldCheck, SquarePen } from "lucide-react";

import { proofBlocks } from "@/app/(marketing)/_content";
import { TiltReveal } from "@/components/marketing/TiltReveal";

/**
 * The reference video's pinned-object beat, reinterpreted honestly
 * (specs/017 §3): the reference pins a literal 3D object at the center of the
 * viewport while service cards reveal at its corners as the page scrolls.
 * There is no photographed object to pin here, so the center column holds one
 * small `aria-hidden` CSS motif instead of a claim, and the side column
 * carries the three real `proofBlocks` entries — the product's actual
 * differentiators, not a services list.
 *
 * Each service card in the reference carries its own small ring-icon beside
 * the heading; `ROW_ICONS` below reproduces that detail with existing
 * `lucide-react` icons matched to each block's own meaning — decorative only,
 * `aria-hidden`, no caption of their own, so nothing here adds a word the
 * block's real title and body don't already say.
 *
 * `position: sticky` on the center column, not continuous scroll-progress
 * math: each row reveals independently via `TiltReveal`'s own
 * `IntersectionObserver`, which is cheaper and matches how `Reveal.tsx`
 * already works elsewhere on this page. No `ReservedFrame` per row — the
 * pinned motif replaces the three separate screenshot slots
 * `ProofBlocks.tsx` (kept, no longer composed) reserves for the same data.
 */
const ROW_ICONS: Record<string, typeof Eye> = {
  "human-gate": Eye,
  editable: SquarePen,
  "configure-once": Settings2,
};
export function ProofPinned() {
  return (
    <section id="proof" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        {/* `grid-cols-1` at the base breakpoint, matching Hero.tsx's fix
            (specs/016 §6): a bare `grid` with no explicit base track still
            let a wide child force the row past the viewport there, and the
            arbitrary `lg:` track's `minmax(0, …)` alone only guards that one
            breakpoint. */}
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
          <ol className="tilt-perspective space-y-16 lg:space-y-28">
            {proofBlocks.map((block, index) => {
              const RowIcon = ROW_ICONS[block.id] ?? ShieldCheck;

              return (
                <li key={block.id}>
                  <TiltReveal delayMs={index * 90}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-light tracking-[0.01em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border"
                      >
                        <RowIcon className="size-3.5 text-muted-foreground" strokeWidth={1.25} />
                      </span>
                    </div>
                    <h3 className="mt-3 max-w-[24ch] text-2xl font-light leading-[1.15] tracking-[-0.02em] text-foreground lg:text-[2rem]">
                      {block.title}
                    </h3>
                    <p className="mt-4 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                      {block.body}
                    </p>
                  </TiltReveal>
                </li>
              );
            })}
          </ol>

          <div className="hidden lg:block">
            <div className="sticky top-32 flex flex-col items-center gap-6">
              {/* Purely decorative — the three real claims beside it carry
                  the meaning, so this has no caption of its own to invent
                  (specs/002 §3.12). */}
              <div
                aria-hidden="true"
                className="landing-motif relative flex size-40 items-center justify-center rounded-full border border-border"
              >
                <div className="absolute inset-4 rounded-full border border-border" />
                <ShieldCheck
                  className="size-9 text-foreground"
                  strokeWidth={1.25}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
