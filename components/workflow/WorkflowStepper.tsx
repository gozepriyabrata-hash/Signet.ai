"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { WORKFLOW_STEP_ORDER } from "@/lib/workflow";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Project, WorkflowStepId } from "@/types";

/**
 * The workflow's progress indicator and its navigation.
 */
const STEP_LABEL: Record<WorkflowStepId, string> = {
  avatar: "Avatar",
  report: "Report",
  voice: "Voice",
  video: "Video",
  recipient: "Recipients",
  email: "Email",
  review: "Review",
};

function useOptionalQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return null;
  }
}

export function WorkflowStepper({
  projectId,
  current,
  completed,
}: {
  projectId: string;
  current: WorkflowStepId;
  completed: readonly WorkflowStepId[];
}) {
  const router = useRouter();
  const queryClient = useOptionalQueryClient();
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setDraftSaved(true);
    try {
      const draft = useWorkflowStore.getState().getDraft(projectId);
      const project = queryClient?.getQueryData<Project>(
        qk.project(projectId)
      );

      await api.saveDraft(projectId, {
        avatarId: draft?.avatarId,
        voiceId: draft?.voiceId,
        videoFormat: draft?.format,
        recipient: draft?.recipient
          ? {
              name: draft.recipient.name,
              role: draft.recipient.role,
              company: draft.recipient.company,
              email: draft.recipient.email,
              industry: draft.recipient.industry,
              businessPriorities: draft.recipient.businessPriorities,
              personalisation: draft.recipient.personalisation,
            }
          : undefined,
        script: draft?.script,
        email:
          draft?.subject || draft?.body || draft?.greeting
            ? {
                subject: draft.subject,
                greeting: draft.greeting,
                body: draft.body,
                ctaId: draft.ctaId,
                signatureId: draft.signatureId,
              }
            : undefined,
        reportFileName: project?.report?.fileName,
      });

      queryClient?.invalidateQueries({ queryKey: ["projects"] });
      queryClient?.invalidateQueries({
        queryKey: qk.project(projectId),
      });

      setTimeout(() => {
        router.push("/drafts");
      }, 600);
    } catch (err: any) {
      console.error(
        "Draft save sync error:",
        err?.message ||
          err?.code ||
          (typeof err === "object" ? JSON.stringify(err) : String(err))
      );
      setTimeout(() => {
        router.push("/drafts");
      }, 600);
    }
  };

  return (
    <header className="border-b border-white/10 bg-[#070a14]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <nav aria-label="Workflow progress">
          <ol className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5 scrollbar-none">
            {WORKFLOW_STEP_ORDER.map((step, index) => {
              const isCurrent = step === current;
              const isComplete = completed.includes(step);
              const isClickable = isComplete && !isCurrent;

              return (
                <li key={step} className="flex items-center shrink-0">
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      className="mx-2 text-slate-600 font-light select-none"
                    >
                      —
                    </span>
                  ) : null}

                  {isCurrent ? (
                    <span
                      aria-current="step"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/25 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.45)] text-white text-xs font-medium"
                    >
                      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
                        {index + 1}
                      </span>
                      <span>{STEP_LABEL[step]}</span>
                    </span>
                  ) : isClickable ? (
                    <Link
                      href={`/projects/${projectId}/${step}`}
                      className="inline-flex items-center gap-1 text-slate-300 hover:text-white font-normal transition-colors py-1 px-1.5 rounded-md hover:bg-white/5"
                    >
                      <span className="text-emerald-400 font-semibold text-xs">✓</span>
                      <span>{STEP_LABEL[step]}</span>
                    </Link>
                  ) : isComplete ? (
                    <span className="inline-flex items-center gap-1 text-slate-300 font-normal py-1 px-1.5">
                      <span className="text-emerald-400 font-semibold text-xs">✓</span>
                      <span>{STEP_LABEL[step]}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-500 font-light py-1 px-1.5">
                      <span className="text-[11px] tabular-nums">{index + 1}</span>
                      <span>{STEP_LABEL[step]}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Top Right: Account Profile Menu */}
        <div className="flex items-center shrink-0 ml-4">
          <ProfileMenu
            name="PRIYABRATA GOZE"
            onSaveDraft={handleSaveDraft}
            isSavingDraft={isSaving}
          />
        </div>
      </div>
    </header>
  );
}
