import { steps, stepsIntro } from "@/app/(marketing)/_content";

/** The step the rail points at — the human gate, which is the differentiator. */
const CURRENT_STEP_ID = "review";

/**
 * The seven-step rail.
 *
 * A fresh component, NOT an import of components/workflow/WorkflowStepper.
 * That component's contract is interactive (onNavigate, "only completed steps
 * are clickable"), so importing it would drag "use client" onto a page that
 * ships one client component by design — and it would make a workflow
 * component answerable to marketing requirements. It copies the visual
 * language instead: neutral filled for completed, an accent ring on current,
 * hollow outlines ahead. See specs/002-landing-page.md §5.
 *
 * Accent use 2 of 2 (§3.10), and the one place on this page where accent
 * carries its ordinary product meaning rather than acting as brand.
 */
export function StepRail() {
  const currentIndex = steps.findIndex((step) => step.id === CURRENT_STEP_ID);

  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        <h2 className="text-2xl font-normal tracking-tight text-foreground">
          {stepsIntro.title}
        </h2>
        <p className="mt-4 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {stepsIntro.body}
        </p>

        <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isComplete = index < currentIndex;

            return (
              <li key={step.id} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className={[
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-normal",
                    isCurrent
                      ? "text-accent ring-2 ring-accent"
                      : isComplete
                        ? "bg-surface-raised text-foreground"
                        : "border border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {index + 1}
                </span>

                <div>
                  <h3 className="text-base font-normal text-foreground">
                    {step.label}
                    {isCurrent ? (
                      <span className="ml-2 align-middle text-xs font-light text-accent">
                        the human gate
                      </span>
                    ) : null}
                  </h3>
                  <p className="mt-1.5 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                    {step.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
