"use client";

import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";

import { WorkflowStepper } from "@/components/workflow/WorkflowStepper";
import { useProject } from "@/hooks/use-project";
import { WORKFLOW_STEP_ORDER, completedStepsFor } from "@/lib/workflow";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { WorkflowStepId } from "@/types";

/**
 * The workflow's chrome: the stepper, and the one place the draft store is
 * rehydrated.
 *
 * A client component so the layout above it can stay a Server Component — the
 * same split `(shell)` uses for its sidebar toggle. It reads the current step
 * from the pathname rather than taking it as a prop, because the step IS the
 * address (specs/007 §3.4) and threading it through the layout would create a
 * second copy of that fact.
 *
 * Rehydration happens here, in an effect, and not at module scope: the store
 * sets `skipHydration` because rehydrating during module evaluation races React
 * and produces a server/client mismatch. This is the workflow's single mount
 * point, so it is the right place to do it once.
 *
 * Renders nothing while the project loads rather than a skeleton stepper: a
 * stepper that guesses which steps are complete and then corrects itself is
 * worse than one that arrives a beat late.
 */
export function WorkflowChrome() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const projectId = params.id;

  useEffect(() => {
    void useWorkflowStore.persist.rehydrate();
  }, []);

  const { data: project } = useProject(projectId);

  const segment = pathname.split("/").pop() ?? "";
  const current = WORKFLOW_STEP_ORDER.find((step) => step === segment);

  // `/projects/[id]` itself has no step — it is the resume redirect, and it
  // renders for a few hundred milliseconds before sending the user onward.
  if (!current || !project) return null;

  return (
    <WorkflowStepper
      projectId={projectId}
      current={current as WorkflowStepId}
      completed={completedStepsFor(project)}
    />
  );
}
