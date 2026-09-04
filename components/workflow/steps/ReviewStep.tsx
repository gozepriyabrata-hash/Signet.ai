"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { JobProgressCard } from "@/components/workflow/JobProgressCard";
import { StepShell } from "@/components/workflow/StepShell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useJobPolling } from "@/hooks/use-job-polling";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { CommunicationPackage, WorkflowStepId } from "@/types";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * Step 6 — Review, and step 7 — Send, which is this screen's confirmed state.
 *
 * **This is the only file in the application permitted to call `sendPackage`.**
 *
 * `eslint.config.mjs` bans that call across `components/workflow/**` and
 * `app/(app)/(focus)/**` and exempts exactly one path: this one. That exemption
 * list has one entry and a comment saying a second entry is the rule being
 * broken rather than configured.
 *
 * CLAUDE.md rule 2, in full:
 *
 *   > Never auto-send. `sendPackage` is reachable only from the Review screen,
 *   > and only after an explicit approval interaction. No send on mount, no
 *   > send in an effect, no "send" as a side effect of another action.
 *
 * Four things follow, and all of them are load-bearing:
 *
 *  1. **Send is not a route.** It is this component's state after a successful
 *     job. There is no URL that means "sending", so no refresh, Back, bookmark
 *     or pasted link can trigger one (specs/007 §3.1).
 *  2. **`sendPackage` is called from one event handler**, inside a confirmation
 *     the user opened deliberately. It is never called in an effect, and there
 *     is no code path that reaches it without a click on the dialog.
 *  3. **It is not a Server Action, and must never become one.** A Server Action
 *     compiles to a POST endpoint Next's own documentation says is "reachable
 *     to anyone who can send the same POST", and that render-time gating "is
 *     not a security boundary". That would reduce rule 2 to a claim about which
 *     page has a button (specs/007 §3.2).
 *  4. **Approve & Send stays disabled until every requirement is met**, and the
 *     dialog names the recipient and their address, because this is the last
 *     irreversible moment and it should say exactly what is about to happen and
 *     to whom.
 * ════════════════════════════════════════════════════════════════════════════
 */

interface Requirement {
  id: string;
  label: string;
  met: boolean;
  step: WorkflowStepId;
}

export function ReviewStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: project, isPending } = useProject(projectId);
  const clearDraft = useWorkflowStore((state) => state.clearDraft);

  const [confirming, setConfirming] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>();
  const { data: job } = useJobPolling<CommunicationPackage>(jobId, projectId);

  const pkg = useQuery({
    queryKey: qk.packageForProject(projectId),
    queryFn: () => api.buildPackage(projectId),
    // Assembling reads what already exists; it produces nothing and sends
    // nothing. Retrying it is safe.
    retry: false,
  });

  const requirements: Requirement[] = [
    { id: "report", label: "Report analysed", met: Boolean(project?.analysis), step: "analysis" },
    { id: "recipient", label: "Recipient set", met: Boolean(project?.recipient), step: "recipient" },
    { id: "video", label: "Video generated", met: Boolean(project?.video?.playbackUrl), step: "video" },
    { id: "email", label: "Email written", met: Boolean(project?.email), step: "email" },
    { id: "attachment", label: "Report attached", met: Boolean(project?.report), step: "report" },
  ];
  const allMet = requirements.every((requirement) => requirement.met);
  const recipient = project?.recipient;

  const send = useMutation({
    // The one call. Reached only from the dialog's confirm handler below.
    mutationFn: (packageId: string) => api.sendPackage(packageId),
    onSuccess: (started) => {
      setJobId(started.id);
      setConfirming(false);
    },
  });

  const sent = job?.status === "succeeded" || project?.package?.status === "sent";

  // ── Step 7: the confirmed state ──────────────────────────────────────────
  if (sent) {
    const sentPackage = project?.package;
    return (
      <StepShell title="Sent">
        <div className="space-y-8">
          <div className="rounded-xs border border-border bg-surface p-6">
            <p className="flex items-center gap-2 text-base font-normal text-foreground">
              <span aria-hidden="true" className="text-success">
                ✓
              </span>
              Your package reached {recipient?.name ?? "your recipient"}.
            </p>
            <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              {recipient?.email}
              {sentPackage?.sentAt ? ` · ${formatDateTime(sentPackage.sentAt)}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* The detail page, not the list — the user just sent this package
                and making them find it again is a strange reward. */}
            <Button asChild>
              <Link href={`/campaigns/${sentPackage?.id ?? ""}`}>
                View in Campaigns
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>

          {/* "Duplicate for another recipient" belongs here per
              docs/screens.md. It needs a `duplicateProject` seam method that
              does not exist, and a control that goes nowhere is the bug spec
              001 was written to eliminate — so it is absent rather than dead. */}
        </div>
      </StepShell>
    );
  }

  if (isPending) {
    return (
      <StepShell title="Review before sending">
        <div
          aria-busy="true"
          aria-label="Loading the package"
          className="h-64 rounded-xs border border-border bg-surface"
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      title="Review before sending"
      description="Nothing has been sent. This is the only screen that can send it, and only after you approve."
      onBack={() => router.push(`/projects/${projectId}/email`)}
    >
      <div className="space-y-8">
        <ul className="space-y-2">
          {requirements.map((requirement) => (
            <li
              key={requirement.id}
              className="flex items-center justify-between gap-4 rounded-xs border border-border bg-surface px-4 py-3"
            >
              <span className="flex items-center gap-3 text-sm font-light tracking-[0.01em] text-foreground">
                <span
                  aria-hidden="true"
                  className={requirement.met ? "text-success" : "text-warning"}
                >
                  {requirement.met ? "✓" : "!"}
                </span>
                {requirement.label}
              </span>
              {/* An unmet row is a warning with the fix one click away. */}
              {!requirement.met ? (
                <Link
                  href={`/projects/${projectId}/${requirement.step}`}
                  className="rounded-full px-3 py-1 text-sm font-light text-foreground hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  Fix →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>

        <section className="rounded-xs border border-border bg-surface p-6">
          <h2 className="text-sm font-light tracking-[0.01em] text-body-foreground">
            What will be sent
          </h2>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-light text-body-foreground">To</dt>
              <dd className="mt-1 text-sm font-normal text-foreground">
                {recipient?.name ?? "—"}
                {recipient?.email ? (
                  <span className="block font-light text-body-foreground">
                    {recipient.email}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-light text-body-foreground">Subject</dt>
              <dd className="mt-1 text-sm font-normal text-foreground">
                {project?.email?.subject ?? "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            A personalised video, the message above, a call to action, and{" "}
            {project?.report?.fileName ?? "the report"} attached.
          </p>
        </section>

        {job && job.status !== "succeeded" ? (
          <JobProgressCard
            job={job}
            label="Sending"
            onRetry={() => {
              setJobId(undefined);
              if (pkg.data) send.mutate(pkg.data.id);
            }}
          />
        ) : null}

        {send.isError ? (
          <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
            <p className="text-base font-normal text-foreground">
              Nothing was sent.
            </p>
            <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              {send.error instanceof Error
                ? send.error.message
                : "The send could not be started."}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <Button
            onClick={() => setConfirming(true)}
            disabled={!allMet || !pkg.data || send.isPending || Boolean(jobId)}
          >
            Approve &amp; Send →
          </Button>
          {!allMet ? (
            <p className="text-sm font-light text-body-foreground">
              Every row above has to be met first.
            </p>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Send this package?"
        description={
          recipient
            ? `This sends the video, the email and ${project?.report?.fileName ?? "the report"} to ${recipient.name} at ${recipient.email}. It cannot be unsent.`
            : "This package has no recipient."
        }
      >
        <div className="flex justify-end gap-3">
          {/* autofocus on the way out, not on Send: an Enter keypress landing
              on an open dialog must not send anything. */}
          <Button
            variant="outline"
            autoFocus
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!pkg.data) return;
              clearDraft(projectId);
              send.mutate(pkg.data.id);
            }}
            disabled={send.isPending}
          >
            {send.isPending ? "Sending…" : "Send it"}
          </Button>
        </div>
      </Dialog>
    </StepShell>
  );
}
