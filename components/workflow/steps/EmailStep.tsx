"use client";

import { useEffect } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AIEditableField } from "@/components/workflow/AIEditableField";
import { JobProgressCard } from "@/components/workflow/JobProgressCard";
import { StepShell } from "@/components/workflow/StepShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useJobPolling } from "@/hooks/use-job-polling";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { EmailDraft } from "@/types";

/**
 * Step 5 — compose the message that carries the video, the CTA and the report.
 *
 * ── The preview is what the recipient actually gets ─────────────────────────
 * It renders the video as a poster frame with a play badge, not as a player,
 * because that is what arrives in an inbox — no mail client plays video inline.
 * A preview that shows something the recipient will never see is worse than no
 * preview, since it is the screen a user checks before approving.
 *
 * Debounced by 250ms via the same hook the projects search uses. Not for
 * network reasons — this preview is local — but because a preview that
 * re-lays-out on every keystroke is hard to read while typing next to it.
 *
 * ── The attachment cannot be removed ────────────────────────────────────────
 * `CommunicationPackage.reportAttachment` is required, not optional: the
 * package is defined as email + video + CTA + report. So the preview shows it
 * and offers no control to drop it.
 */
export function EmailStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: project, isPending } = useProject(projectId);
  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const draft = useWorkflowStore((state) => state.drafts[projectId]);

  // The job id lives in the store, not in this component: a refresh mid-job
  // would otherwise orphan it — nothing would poll it, so nothing would ever
  // observe it finishing and write its result to the project.
  const jobId = useWorkflowStore((state) => state.activeJobs[`${projectId}:email`]);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);
  const clearActiveJob = useWorkflowStore((state) => state.clearActiveJob);
  const { data: job } = useJobPolling<EmailDraft>(jobId, projectId);


  // Clear on SUCCESS only. A succeeded job's id has no further use, and leaving
  // it in a persisted store means a remount re-polls a finished job and flashes
  // its card.
  //
  // A FAILED job's id must stay: the card renders from it, and the Retry lives
  // inside that card. Clearing it would make the failure vanish and leave the
  // user with no way back — the dead end rule 5 exists to prevent.
  useEffect(() => {
    if (job?.status === "succeeded") clearActiveJob(projectId, "email");
  }, [job?.status, projectId, clearActiveJob]);
  const ctas = useQuery({
    queryKey: qk.presets("cta"),
    queryFn: () => api.listPresets("cta"),
  });
  const signatures = useQuery({
    queryKey: qk.presets("signature"),
    queryFn: () => api.listPresets("signature"),
  });

  const email = project?.email;
  const subject = draft?.subject ?? email?.subject ?? "";
  const greeting = draft?.greeting ?? email?.greeting ?? "";
  const body = draft?.body ?? email?.body ?? "";
  const ctaId = draft?.ctaId ?? email?.ctaId ?? ctas.data?.[0]?.id ?? "";
  const signatureId =
    draft?.signatureId ?? email?.signatureId ?? signatures.data?.[0]?.id ?? "";

  const preview = useDebouncedValue({ subject, greeting, body, ctaId }, 250);
  const cta = ctas.data?.find((preset) => preset.id === preview.ctaId);

  const generate = useMutation({
    mutationFn: () => api.generateEmail(projectId),
    onSuccess: (started) => setActiveJob(projectId, "email", started.id),
  });

  const complete = subject.trim() !== "" && body.trim() !== "" && ctaId !== "";

  if (isPending) {
    return (
      <StepShell title="Compose the email">
        <div
          aria-busy="true"
          aria-label="Loading the composer"
          className="h-64 rounded-xs border border-border bg-surface"
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      title="Compose the email"
      description="What arrives alongside the video. The preview is what your recipient will see in their inbox."
      onBack={() => router.push(`/projects/${projectId}/video`)}
      onNext={
        complete ? () => router.push(`/projects/${projectId}/review`) : undefined
      }
      nextDisabled={!complete}
      nextLabel="Review the package"
    >
      {job && job.status !== "succeeded" ? (
        <JobProgressCard
          job={job}
          label="Writing the email"
          onRetry={() => {
            clearActiveJob(projectId, "email");
            generate.mutate();
          }}
        />
      ) : !email && !subject ? (
        <div className="rounded-xs border border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            Nothing has been drafted for this project yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? "Starting…" : "Draft it"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <AIEditableField
              label="Subject"
              value={subject}
              aiGenerated={draft?.subject === undefined && !email?.editedByUser}
              onChange={(value) => patchDraft(projectId, { subject: value })}
              onRegenerate={() => generate.mutate()}
              isRegenerating={generate.isPending}
            />
            <AIEditableField
              label="Greeting"
              value={greeting}
              aiGenerated={draft?.greeting === undefined && !email?.editedByUser}
              onChange={(value) => patchDraft(projectId, { greeting: value })}
            />
            <AIEditableField
              label="Body"
              variant="textarea"
              rows={8}
              value={body}
              aiGenerated={draft?.body === undefined && !email?.editedByUser}
              onChange={(value) => patchDraft(projectId, { body: value })}
              onRegenerate={() => generate.mutate()}
              isRegenerating={generate.isPending}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cta">Call to action</Label>
                <select
                  id="cta"
                  value={ctaId}
                  onChange={(event) =>
                    patchDraft(projectId, { ctaId: event.target.value })
                  }
                  className="w-full rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {(ctas.data ?? []).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                {/* The target URL is set with the preset, not typed here. */}
                <p className="text-sm font-light text-muted-foreground">
                  Where it points is part of the preset.{" "}
                  <Link
                    href="/settings/email"
                    className="rounded-full underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    Manage in Settings
                  </Link>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Signature</Label>
                <select
                  id="signature"
                  value={signatureId}
                  onChange={(event) =>
                    patchDraft(projectId, { signatureId: event.target.value })
                  }
                  className="w-full rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {(signatures.data ?? []).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
              Preview
            </p>
            <div className="mt-2 space-y-4 rounded-xs border border-border bg-surface p-6">
              <p className="text-sm font-light tracking-[0.01em] text-muted-foreground">
                To: {project?.recipient?.name ?? "—"}
              </p>
              <p className="text-base font-normal text-foreground">
                {preview.subject || "No subject"}
              </p>
              <p className="text-sm font-normal text-foreground">
                {preview.greeting}
              </p>
              <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                {preview.body}
              </p>

              {/* A poster frame with a play badge — what an inbox renders. */}
              <div
                aria-hidden="true"
                className="flex aspect-video items-center justify-center rounded-xs border border-border bg-surface-raised"
              >
                <span className="flex size-10 items-center justify-center rounded-full border border-border bg-surface text-foreground">
                  ▶
                </span>
              </div>

              {cta ? (
                <span className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-light text-primary-foreground">
                  {cta.name}
                </span>
              ) : null}

              <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
                📎 {project?.report?.fileName ?? "report.pdf"}
              </p>
            </div>
          </div>
        </div>
      )}
    </StepShell>
  );
}
