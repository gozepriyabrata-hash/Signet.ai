"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { StepShell } from "@/components/workflow/StepShell";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { PresetKind } from "@/types";

/**
 * The Avatar and Voice steps: pick this project's preset, with the library
 * (formerly the Settings section) right below it, so a missing avatar or voice
 * can be added without leaving the workflow. The choice is a draft field —
 * the Video step reads it when it starts the render.
 */
export function PresetChoiceStep({
  projectId,
  kind,
  field,
  title,
  description,
  label,
  back,
  next,
  children,
}: {
  projectId: string;
  kind: Extract<PresetKind, "avatar" | "voice">;
  field: "avatarId" | "voiceId";
  title: string;
  description: string;
  label: string;
  back?: string;
  next: string;
  /** The library, rendered below the picker. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const presets = useQuery({
    queryKey: qk.presets(kind),
    queryFn: () => api.listPresets(kind),
  });
  const chosen = useWorkflowStore((state) => state.drafts[projectId]?.[field]);
  const patchDraft = useWorkflowStore((state) => state.patchDraft);

  const options = presets.data ?? [];
  // A remembered choice that has since been archived falls back to the default.
  const value =
    options.find((preset) => preset.id === chosen)?.id ??
    options.find((preset) => preset.isDefault)?.id ??
    options[0]?.id;

  return (
    <StepShell
      title={title}
      description={description}
      onBack={back ? () => router.push(`/projects/${projectId}/${back}`) : undefined}
      onNext={() => {
        if (!value) return;
        patchDraft(projectId, { [field]: value });
        router.push(`/projects/${projectId}/${next}`);
      }}
      nextDisabled={!value}
      nextLabel="Continue"
    >
      <div className="max-w-md space-y-2">
        <Label htmlFor={`choose-${kind}`}>{label}</Label>
        {presets.isError ? (
          <p role="alert" className="text-sm font-light text-body-foreground">
            Could not load the list.{" "}
            <button
              type="button"
              onClick={() => void presets.refetch()}
              className="rounded-full underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Try again
            </button>
          </p>
        ) : presets.isPending ? (
          <div
            aria-busy="true"
            aria-label={`Loading ${label.toLowerCase()}`}
            className="h-9 rounded-xs border border-border bg-surface"
          />
        ) : options.length === 0 ? (
          <p className="text-sm font-light text-body-foreground">
            Nothing to choose yet — add one below.
          </p>
        ) : (
          <select
            id={`choose-${kind}`}
            value={value}
            onChange={(event) => patchDraft(projectId, { [field]: event.target.value })}
            className="w-full rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {options.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-12">{children}</div>
    </StepShell>
  );
}
