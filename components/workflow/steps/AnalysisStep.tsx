"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AIEditableField } from "@/components/workflow/AIEditableField";
import { JobProgressCard } from "@/components/workflow/JobProgressCard";
import { StepShell } from "@/components/workflow/StepShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJobPolling } from "@/hooks/use-job-polling";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Analysis } from "@/types";

/**
 * Step 3 — show the user what the AI understood, before it generates anything.
 *
 * ── This is the transparency screen, and it must not degrade into a gate ────
 * `docs/screens.md` is unusually direct about this one: it "is what earns trust
 * in the output — do not let it degrade into a loading gate". The distinction
 * is that while the job runs the screen is a JobProgressCard with real stages,
 * and once it finishes the screen is a set of editable fields — not a summary
 * with a Next button under it.
 *
 * Every block here is an AIEditableField, per rule 4. The summary is a
 * textarea; the talking points are a list the user can include or exclude, and
 * excluding one is what keeps it out of the script.
 *
 * ── The exit condition is a choice, not a formality ─────────────────────────
 * At least one talking point must be included. A script generated from nothing
 * is a script about nothing, and the check is here rather than in the Video
 * step because this is the screen where the user can see what they excluded.
 */
export function AnalysisStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: project, isPending } = useProject(projectId);
  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const draft = useWorkflowStore((state) => state.drafts[projectId]);

  // The job may have been started by the Recipient step, or here by
  // Regenerate. Either way it is addressed through the store, so this screen
  // polls a real job rather than rendering a placeholder that cannot finish.
  const storedJobId = useWorkflowStore((state) =>
    state.activeJobs[`${projectId}:analysis`],
  );
  const clearActiveJob = useWorkflowStore((state) => state.clearActiveJob);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);

  const { data: job } = useJobPolling<Analysis>(storedJobId, projectId);

  const analysis = project?.analysis;
  const running = Boolean(job) && job?.status !== "succeeded";

  useEffect(() => {
    if (job?.status === "succeeded") clearActiveJob(projectId, "analysis");
  }, [job?.status, projectId, clearActiveJob]);

  const regenerate = useMutation({
    mutationFn: () => {
      const recipient = project?.recipient;
      if (!recipient) throw new Error("This project has no recipient yet.");
      return api.analyzeReport(projectId, recipient);
    },
    onSuccess: (started) => setActiveJob(projectId, "analysis", started.id),
  });

  const summary = draft?.executiveSummary ?? analysis?.executiveSummary ?? "";
  const included = draft?.talkingPointsIncluded ?? {};
  const isIncluded = (id: string, fallback: boolean) => included[id] ?? fallback;

  const anyIncluded =
    analysis?.talkingPoints.some((point) =>
      isIncluded(point.id, point.included),
    ) ?? false;

  if (isPending) {
    return (
      <StepShell title="What the AI found">
        <div
          aria-busy="true"
          aria-label="Loading analysis"
          className="h-64 rounded-xs border border-border bg-surface"
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      title="What the AI found"
      description="Everything below is editable, and everything below is what the video and the email are built from. Change anything that is wrong before continuing."
      onBack={() => router.push(`/projects/${projectId}/recipient`)}
      onNext={
        analysis && anyIncluded
          ? () => {
              patchDraft(projectId, { executiveSummary: summary });
              router.push(`/projects/${projectId}/video`);
            }
          : undefined
      }
      nextDisabled={!analysis || !anyIncluded}
      nextLabel="Continue to video"
    >
      {running && job ? (
        <JobProgressCard
          job={job}
          label="Analysing the report"
          onRetry={() => {
            clearActiveJob(projectId, "analysis");
            regenerate.mutate();
          }}
        />
      ) : !analysis ? (
        <div className="rounded-xs border border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            This report has not been analysed yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
          >
            {regenerate.isPending ? "Starting…" : "Analyse it now"}
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          <AIEditableField
            label="Executive summary"
            variant="textarea"
            rows={4}
            value={summary}
            aiGenerated={!analysis.editedByUser && draft?.executiveSummary === undefined}
            onChange={(value) => patchDraft(projectId, { executiveSummary: value })}
            onRegenerate={() => regenerate.mutate()}
            isRegenerating={regenerate.isPending}
          />

          <section className="space-y-3">
            <h2 className="text-sm font-light tracking-[0.01em] text-body-foreground">
              Key insights
            </h2>
            <ul className="space-y-3">
              {analysis.keyInsights.map((insight) => (
                <li
                  key={insight.id}
                  className="rounded-xs border border-border bg-surface p-4"
                >
                  <p className="text-sm font-normal text-foreground">
                    {insight.title}
                  </p>
                  <p className="mt-1 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                    {insight.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-light tracking-[0.01em] text-body-foreground">
                Talking points
              </h2>
              {!analysis.editedByUser ? <Badge variant="ai">AI generated</Badge> : null}
            </div>
            <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-muted-foreground">
              Only the points you keep are written into the script.
            </p>

            <ul className="space-y-2">
              {analysis.talkingPoints.map((point) => {
                const on = isIncluded(point.id, point.included);
                return (
                  <li key={point.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xs border p-4 transition-colors duration-150 ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground ${
                        on
                          ? "border-border bg-surface"
                          : "border-border bg-surface opacity-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(event) =>
                          patchDraft(projectId, {
                            talkingPointsIncluded: {
                              ...included,
                              [point.id]: event.target.checked,
                            },
                          })
                        }
                        className="mt-0.5 size-4 accent-foreground"
                      />
                      <span className="text-sm font-light leading-relaxed tracking-[0.01em] text-foreground">
                        {point.text}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {!anyIncluded ? (
              <p role="alert" className="text-sm font-light text-danger">
                Keep at least one talking point — the script is written from
                these.
              </p>
            ) : null}
          </section>
        </div>
      )}
    </StepShell>
  );
}
