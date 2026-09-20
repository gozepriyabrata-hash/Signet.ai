import { WorkflowCards } from "@/components/marketing/WorkflowCards";

/**
 * The reference video's arched carousel of project thumbnails, reinterpreted
 * without a single fabricated screenshot or client logo (specs/017 §3).
 *
 * The card visual itself lives in `WorkflowCards` — a client leaf, because it
 * re-orders the flashcard pool on every visit (rule 8: push `"use client"`
 * to the leaf that needs it). This component stays a Server Component and
 * owns everything that doesn't change per-render: the heading.
 *
 * `id="how-it-works"` lives here rather than on `StepRail` now that StepRail
 * is dormant — the nav's "How it works" link and the hero's "See the seven
 * steps" link both target this id, and this section is the page's other
 * statement of the same seven steps.
 */
export function WorkflowArc() {
  return (
    <section
      id="how-it-works"
      aria-label="The seven-step workflow, in order"
      className="relative overflow-hidden border-t border-border bg-background"
    >
      <div className="relative mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <h2 className="max-w-[42ch] text-3xl font-light leading-[1.1] tracking-[-0.02em] text-foreground lg:text-5xl">
          Type it. Clone it. Roll it. Cut it. Post it. That&rsquo;s the entire
          skillset.
        </h2>

        <WorkflowCards />
      </div>
    </section>
  );
}
