"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AIEditableField } from "@/components/workflow/AIEditableField";
import { JobProgressCard } from "@/components/workflow/JobProgressCard";
import { StepShell } from "@/components/workflow/StepShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useJobPolling } from "@/hooks/use-job-polling";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { PresetKind, VideoAsset, VideoFormat } from "@/types";

/**
 * Step 4 — the Video Studio, and the screen where rule 1 is either kept or lost.
 *
 * ── Exactly five controls ───────────────────────────────────────────────────
 * Avatar, Voice, Style, Format, Captions. That is `VideoOptions` in full, and
 * `types/domain.ts` already comments that branding "is applied from the active
 * brand preset, not chosen here". Branding renders as a read-only line naming
 * the preset; the moment it becomes a picker this step has six controls and the
 * rule has started sliding.
 *
 * Each dropdown lists presets from Settings and **cannot create one**. There is
 * no "＋ New avatar" at the bottom of the list, and adding one would be the end
 * of rule 1 — a step that can write presets is a configuration surface, and
 * there is no principled line between one inline creator and fifteen.
 *
 * The "Manage in Settings" links below were deliberately absent until specs/008
 * built the sections they point at — shipping a 404 from inside the core flow
 * is the bug spec 001 was written to eliminate. They are links out of the
 * workflow rather than a modal, because a step that can open a preset editor is
 * a step that can create presets, and rule 1 does not survive that.
 *
 * ── The script is here, and it is editable ──────────────────────────────────
 * The words the avatar will say are the highest-stakes AI output in the
 * product, and a user must be able to fix them without leaving this step
 * (rule 4).
 */

function usePresets(kind: PresetKind) {
  return useQuery({
    queryKey: qk.presets(kind),
    queryFn: () => api.listPresets(kind),
  });
}

export function VideoStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: project, isPending } = useProject(projectId);
  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const draft = useWorkflowStore((state) => state.drafts[projectId]);

  const avatars = usePresets("avatar");
  const voices = usePresets("voice");
  const styles = usePresets("scriptStyle");
  const branding = usePresets("branding");

  // The job id lives in the store, not in this component: a refresh mid-job
  // would otherwise orphan it — nothing would poll it, so nothing would ever
  // observe it finishing and write its result to the project.
  const jobId = useWorkflowStore((state) => state.activeJobs[`${projectId}:video`]);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);
  const clearActiveJob = useWorkflowStore((state) => state.clearActiveJob);
  const { data: job } = useJobPolling<VideoAsset>(jobId, projectId);


  // Clear on SUCCESS only. A succeeded job's id has no further use, and leaving
  // it in a persisted store means a remount re-polls a finished job and flashes
  // its card.
  //
  // A FAILED job's id must stay: the card renders from it, and the Retry lives
  // inside that card. Clearing it would make the failure vanish and leave the
  // user with no way back — the dead end rule 5 exists to prevent.
  useEffect(() => {
    if (job?.status === "succeeded") clearActiveJob(projectId, "video");
  }, [job?.status, projectId, clearActiveJob]);
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [styleId, setStyleId] = useState("");
  const [format, setFormat] = useState<VideoFormat>("landscape");
  const [captions, setCaptions] = useState(true);

  const video = project?.video;
  const rendered = Boolean(video?.playbackUrl) && job?.status !== "running";
  const script = draft?.script ?? project?.script?.body ?? "";

  const generate = useMutation({
    mutationFn: () =>
      api.generateVideo(projectId, {
        avatarId: avatarId || avatars.data?.[0]?.id || "avt_default",
        voiceId: voiceId || voices.data?.[0]?.id || "voi_default",
        scriptStyleId: styleId || styles.data?.[0]?.id || "sty_executive",
        format,
        captions,
      }),
    onSuccess: (started) => setActiveJob(projectId, "video", started.id),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelJob(id),
  });

  const select = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { id: string; name: string }[] | undefined,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value || options?.[0]?.id || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={!options}
        className="w-full rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
      >
        {(options ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );

  if (isPending) {
    return (
      <StepShell title="Video studio">
        <div
          aria-busy="true"
          aria-label="Loading video studio"
          className="h-64 rounded-xs border border-border bg-surface"
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      title="Video studio"
      description="The avatar reads the script below. Everything it can wear, sound like or be styled as is defined in Settings — this step chooses between them."
      onBack={() => router.push(`/projects/${projectId}/analysis`)}
      onNext={
        rendered ? () => router.push(`/projects/${projectId}/email`) : undefined
      }
      nextDisabled={!rendered}
      nextLabel="Continue to email"
    >
      <div className="space-y-10">
        <AIEditableField
          label="Script"
          variant="textarea"
          rows={6}
          value={script}
          description="What the avatar will say, word for word."
          aiGenerated={draft?.script === undefined && !project?.script?.editedByUser}
          onChange={(value) => patchDraft(projectId, { script: value })}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* The preview. A placeholder frame plus real metadata, never an
              <img> or <video> pointed at a URL — nothing in this app may make
              an external request, and a poster URL is the one field that would
              do it by accident. */}
          <div>
            <div
              aria-hidden="true"
              className={`flex aspect-video items-center justify-center rounded-xs border border-border bg-surface-raised ${
                job?.status === "running" ? "generation-pulse" : ""
              }`}
            >
              <span className="text-sm font-light text-body-foreground">
                {rendered ? "Personalised video" : "No video yet"}
              </span>
            </div>
            {rendered && video ? (
              <p className="mt-3 text-sm font-light tracking-[0.01em] text-body-foreground">
                {video.durationSec ? `${video.durationSec}s · ` : ""}
                {video.format === "landscape" ? "Landscape" : "Portrait"}
                {video.captions ? " · Captions on" : " · No captions"}
              </p>
            ) : null}
          </div>

          <div className="space-y-5">
            {select("avatar", "Avatar", avatarId, setAvatarId, avatars.data)}
            {select("voice", "Voice", voiceId, setVoiceId, voices.data)}
            {select("style", "Style", styleId, setStyleId, styles.data)}

            <fieldset className="space-y-2">
              <legend className="text-sm font-light tracking-[0.01em] text-body-foreground">
                Format
              </legend>
              <div className="flex gap-2">
                {(["landscape", "portrait"] as const).map((option) => (
                  <label
                    key={option}
                    className={`flex-1 cursor-pointer rounded-xs border px-3 py-2 text-center text-sm font-light transition-colors duration-150 ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground ${
                      format === option
                        ? "border-foreground bg-surface-raised text-foreground"
                        : "border-border bg-surface text-body-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={format === option}
                      onChange={() => setFormat(option)}
                    />
                    {option === "landscape" ? "Landscape" : "Portrait"}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xs border border-border bg-surface px-3 py-2">
              <span className="text-sm font-light tracking-[0.01em] text-body-foreground">
                Captions
              </span>
              <input
                type="checkbox"
                checked={captions}
                onChange={(event) => setCaptions(event.target.checked)}
                className="size-4 accent-foreground"
              />
            </label>

            {/* Read-only, deliberately. Branding is applied from the active
                preset; a picker here would be a sixth control. */}
            <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-muted-foreground">
              Branding: {branding.data?.[0]?.name ?? "House brand"} — applied
              automatically.
            </p>

            {/* A navigation away, not a way to configure from here. */}
            <p className="text-sm font-light tracking-[0.01em] text-muted-foreground">
              <Link
                href="/settings/avatar"
                className="rounded-full underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Manage avatars, voices and branding in Settings
              </Link>
            </p>

            {!job || job.status === "failed" || rendered ? (
              <Button
                className="w-full"
                onClick={() => generate.mutate()}
                disabled={generate.isPending || !script.trim()}
              >
                {generate.isPending
                  ? "Starting…"
                  : rendered
                    ? "Regenerate video"
                    : "Generate video"}
              </Button>
            ) : null}
          </div>
        </div>

        {job && !rendered ? (
          <JobProgressCard
            job={job}
            label="Video"
            onRetry={() => {
              clearActiveJob(projectId, "video");
              generate.mutate();
            }}
            onCancel={
              job.status === "running" || job.status === "queued"
                ? () => cancel.mutate(job.id)
                : undefined
            }
          />
        ) : null}
      </div>
    </StepShell>
  );
}
