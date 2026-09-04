import Link from "next/link";

import { WORKFLOW_STEP_ORDER } from "@/lib/workflow";
import type { WorkflowStepId } from "@/types";

/**
 * The workflow's progress indicator and its only navigation.
 *
 * ── There is no ARIA pattern for this, so the markup is a decision ──────────
 * The ARIA Authoring Practices Guide publishes patterns for Accordion,
 * Breadcrumb, Tabs, Disclosure and two dozen more, and **none for a stepper, a
 * wizard, or a multi-step progress indicator**. There is nothing to follow, so
 * this is argued rather than looked up (specs/007 §2.7).
 *
 * A `<nav>` around an ordered list is the honest description: it is a set of
 * links to places, in a defined order. `aria-current="step"` is the one
 * attribute defined for exactly this — MDN: "Represents the current step within
 * a process such as the current step in an enumerated multi step checkout
 * flow."
 *
 * ── Completion comes from the data, never from route history ────────────────
 * `completed` is derived by the caller from the project, using the same
 * predicates `lib/workflow.ts` uses to resolve `/projects/[id]` to a resume
 * step. The two must not be allowed to disagree about what "done" means, which
 * is why this component does not compute it a second way.
 *
 * A visited-but-abandoned step has been visited and is not complete. Deriving
 * from history would mark it done and let a user past an unmet dependency,
 * which docs/design-system.md forbids in terms.
 *
 * ── Future steps are text, not disabled links ───────────────────────────────
 * A disabled control still sits in the reading order, so a keyboard or screen
 * reader user tabs past four dead nodes on every step of every project. Plain
 * text is not focusable and says the same thing.
 */

const STEP_LABEL: Record<WorkflowStepId, string> = {
  report: "Report",
  recipient: "Recipient",
  analysis: "Analysis",
  video: "Video",
  email: "Email",
  review: "Review",
};

export function WorkflowStepper({
  projectId,
  current,
  completed,
}: {
  projectId: string;
  current: WorkflowStepId;
  /** Steps whose exit condition the project already meets. */
  completed: readonly WorkflowStepId[];
}) {
  return (
    <nav aria-label="Workflow progress" className="border-b border-border">
      <ol className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-6 py-4 lg:px-8">
        {WORKFLOW_STEP_ORDER.map((step, index) => {
          const isCurrent = step === current;
          const isComplete = completed.includes(step);
          const isClickable = isComplete && !isCurrent;

          const label = (
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span
                aria-hidden="true"
                className={[
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums",
                  isCurrent
                    ? "border-accent text-foreground outline-2 outline-offset-2 outline-accent/40"
                    : isComplete
                      ? "border-transparent bg-surface-raised text-foreground"
                      : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {isComplete && !isCurrent ? "✓" : index + 1}
              </span>
              <span
                className={
                  isCurrent
                    ? "text-sm font-normal text-foreground"
                    : isComplete
                      ? "text-sm font-light text-body-foreground"
                      : "text-sm font-light text-muted-foreground"
                }
              >
                {STEP_LABEL[step]}
              </span>
            </span>
          );

          return (
            <li key={step} className="flex items-center gap-1">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="mr-1 h-px w-6 shrink-0 bg-border"
                />
              ) : null}

              {isClickable ? (
                <Link
                  href={`/projects/${projectId}/${step}`}
                  className="rounded-full px-2 py-1 transition-colors duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {label}
                </Link>
              ) : (
                <span
                  className="px-2 py-1"
                  {...(isCurrent ? { "aria-current": "step" as const } : {})}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
