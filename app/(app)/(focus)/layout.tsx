import { WorkflowChrome } from "@/components/workflow/WorkflowChrome";

/**
 * The focus shell — the workflow's chrome.
 *
 * Deliberately has no sidebar. Once a user is inside `projects/[id]/*` the
 * WorkflowStepper replaces sidebar navigation, and focus is the point
 * (docs/screens.md). The sidebar is absent by construction rather than hidden
 * by a conditional, which is the only version of "hide the sidebar" that a
 * later change cannot quietly defeat.
 *
 * The stepper lives here rather than in each step, so six screens built at six
 * different times cannot end up with six slightly different ones. It is wrapped
 * in a client component (WorkflowChrome) which reads the current step from the
 * pathname, keeping this layout a Server Component.
 */
export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WorkflowChrome />
      {children}
    </>
  );
}
