import type { Project, WorkflowStepId } from "@/types";

/**
 * The workflow's step order, and the rule that resolves a project to the step
 * a user should land on when they open it.
 *
 * This is where `/projects/[id]` gets its answer (specs/001 §3: the route is a
 * redirect that resolves `ProjectStatus` to the resume step). It is a pure
 * function of `Project` and lives outside React so the rule can be tested on
 * its own, and so the WorkflowStepper can reuse the same ordering rather than
 * declaring a second copy of it that drifts.
 */

/** Six routes, seven steps. Send is the confirmed state of Review, not a step
 *  of its own — specs/001 §3, and the reason rule 2 is enforceable at all. */
export const WORKFLOW_STEP_ORDER = [
  "report",
  "recipient",
  "analysis",
  "video",
  "email",
  "review",
] as const satisfies readonly WorkflowStepId[];

/**
 * "This step has produced its output."
 *
 * Steps 1–5 only. `review` is terminal, so it is what remains when everything
 * before it is done rather than something with a completion test of its own.
 */
const PRODUCED_ITS_OUTPUT: readonly {
  step: WorkflowStepId;
  done: (project: Project) => boolean;
}[] = [
  // A report still uploading, still parsing, or failed is NOT done. The Report
  // step is where its progress and its Retry live, so that is where a user has
  // to land for the failure to be recoverable in place (CLAUDE.md rule 5).
  { step: "report", done: (project) => project.report?.status === "parsed" },
  { step: "recipient", done: (project) => project.recipient !== undefined },
  { step: "analysis", done: (project) => project.analysis !== undefined },
  // A VideoAsset exists as soon as its render job is queued — it carries a
  // `jobId` long before it carries anything watchable. Only a playback URL
  // means the step has produced something.
  { step: "video", done: (project) => project.video?.playbackUrl !== undefined },
  { step: "email", done: (project) => project.email !== undefined },
];

function firstUnfinishedStep(project: Project): WorkflowStepId {
  return (
    PRODUCED_ITS_OUTPUT.find(({ done }) => !done(project))?.step ?? "review"
  );
}

/**
 * The step this project resumes at.
 *
 * Most statuses name exactly one step. Two do not, and both defer to the data:
 *
 * - `draft` spans steps 1 and 2 — a project stays a draft from creation until
 *   analysis begins, which covers both "no report yet" and "report uploaded,
 *   no recipient yet".
 * - `failed` can be reached from any step, and `Project` does not record which
 *   one failed. The first step that has not produced its output IS the step
 *   that failed, so the same walk answers both.
 */
export function resumeStepFor(project: Project): WorkflowStepId {
  switch (project.status) {
    case "draft":
    case "failed":
      return firstUnfinishedStep(project);
    case "analysing":
      return "analysis";
    case "video_pending":
      return "video";
    case "email_pending":
      return "email";
    case "ready_for_review":
    case "sent":
      return "review";
  }
}

/**
 * The steps this project has already produced the output for.
 *
 * The stepper's second consumer of the same predicates. It exists so the
 * stepper cannot derive "done" a second way and drift from what the resume
 * redirect believes — one of them would then be wrong, and there would be no
 * test that could tell you which (specs/007 §3.5).
 *
 * `review` is never in this list. It is the terminal step, and its exit
 * condition is a human approving a send rather than a field being present;
 * that is Review's own business, not the stepper's.
 */
export function completedStepsFor(project: Project): readonly WorkflowStepId[] {
  return PRODUCED_ITS_OUTPUT.filter(({ done }) => done(project)).map(
    ({ step }) => step,
  );
}

/**
 * The URL `/projects/[id]` sends the user to.
 *
 * Only `Project.id` and the step id go into the path. Nothing from
 * `Project.recipient` may ever be added here — recipient fields are client PII
 * and a URL is the one place CLAUDE.md rule 11 names explicitly.
 */
export function resumeHref(project: Project): string {
  return `/projects/${project.id}/${resumeStepFor(project)}`;
}
