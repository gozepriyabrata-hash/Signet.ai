"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Download,
  Loader2,
  Mail,
  Paperclip,
  UserRound,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { JobProgressCard } from "@/components/workflow/JobProgressCard";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useJobPolling } from "@/hooks/use-job-polling";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { CommunicationPackage, WorkflowStepId } from "@/types";
import { sendPackageEmailAction } from "@/lib/actions/send-package-email";


function useOptionalQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return null;
  }
}

/**
 * Step 6 — Review, and step 7 — Send, which is this screen's confirmed state.
 *
 * This is the ONLY file in the application permitted to call `sendPackage` (CLAUDE.md rule 2).
 */
export function ReviewStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useOptionalQueryClient();
  const { data: project, isPending } = useProject(projectId);
  const clearDraft = useWorkflowStore((state) => state.clearDraft);
  const draft = useWorkflowStore((state) => state.drafts[projectId]);

  const [confirming, setConfirming] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSendingViaResend, setIsSendingViaResend] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendWarning, setSendWarning] = useState<string | null>(null);
  const [isSentConfirmed, setIsSentConfirmed] = useState(false);
  const { data: job } = useJobPolling<CommunicationPackage>(jobId, projectId);


  const pkg = useQuery({
    queryKey: qk.packageForProject(projectId),
    queryFn: () => api.buildPackage(projectId),
    retry: false,
  });

  const ctas = useQuery({
    queryKey: qk.presets("cta"),
    queryFn: async () => {
      try {
        const res = await api.listPresets("cta");
        return res ?? [];
      } catch {
        return [];
      }
    },
  });

  const recipient = draft?.recipient ?? project?.recipient;
  const fileName =
    project?.report?.fileName ||
    (draft as { reportFileName?: string } | undefined)?.reportFileName ||
    "investment_summary.docx";
  const recipientName =
    recipient?.name || project?.recipient?.name || "";
  const recipientEmail =
    (recipient as { email?: string } | undefined)?.email ||
    project?.recipient?.email ||
    "";

  const recipientCompany =
    recipient?.company || project?.recipient?.company || "Signet";
  const recipientRole =
    recipient?.role || project?.recipient?.role || "Executive";

  const firstName = recipientName.split(" ")[0] || recipientName;
  const defaultSubject = `Executive Summary & Strategic Briefing: ${recipientCompany}`;
  const defaultGreeting = `Hi ${firstName},`;
  const defaultBody = `I've put together a personalized video briefing specifically for ${recipientCompany}'s ${recipientRole.toLowerCase()}, focusing on how you can strategically leverage AI Automation to accelerate growth. The walkthrough breaks down the foundational mechanics and high-impact applications relevant to your team.`;

  const emailSubject =
    draft?.subject ||
    project?.email?.subject ||
    defaultSubject;

  const emailGreeting =
    draft?.greeting ||
    project?.email?.greeting ||
    defaultGreeting;

  const emailBody =
    draft?.body ||
    project?.email?.body ||
    defaultBody;

  const ctaId = draft?.ctaId || project?.email?.ctaId;
  const cta = ctas.data?.find((preset) => preset.id === ctaId);
  const ctaName = cta?.name || "Book a Meeting";

  const requirements = [
    {
      id: "attachment",
      label: "Report attached",
      met: Boolean(project?.report),
      step: "report" as WorkflowStepId,
      detail: `${fileName} (${
        project?.report?.sizeBytes
          ? `${Math.round(project.report.sizeBytes / 1024)} kB`
          : "37 kB"
      })`,
    },
    {
      id: "video",
      label: "Video generated",
      met: Boolean(project?.video?.playbackUrl || draft?.avatarId),
      step: "video" as WorkflowStepId,
    },
    {
      id: "recipient",
      label: "Recipient set",
      met: Boolean(recipient && (recipient as any).email),
      step: "recipient" as WorkflowStepId,
      detail: recipientName
        ? `1 recipient: ${recipientName.toUpperCase()}${recipientEmail ? ` (${recipientEmail})` : ""}`
        : undefined,
    },

    {
      id: "email",
      label: "Email written",
      met: Boolean(project?.email || draft?.subject || draft?.body || draft?.greeting),
      step: "email" as WorkflowStepId,
    },
  ];

  const allMet = requirements.every((r) => r.met);

  const send = useMutation({
    mutationFn: (packageId: string) => api.sendPackage(packageId),
    onSuccess: (started) => {
      setJobId(started.id);
      setConfirming(false);
    },
  });

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      await api.saveDraft(projectId, {
        avatarId: draft?.avatarId || project?.video?.avatarId,
        voiceId: draft?.voiceId || project?.video?.voiceId,
        videoFormat: draft?.format || (project?.video?.format as any),
        recipient: recipient
          ? {
              name: recipient.name,
              role: recipient.role,
              company: recipient.company,
              email: (recipient as any).email || recipientEmail,
              industry: recipient.industry,
              businessPriorities: (recipient as any).businessPriorities || [],
              personalisation: (recipient as any).personalisation || "medium",
            }
          : undefined,
        script: draft?.script || project?.script?.body,
        email: {
          subject: emailSubject,
          greeting: emailGreeting,
          body: emailBody,
          ctaId: ctaId || "cta_book_meeting",
          signatureId:
            draft?.signatureId || project?.email?.signatureId || "sig_default",
        },
        reportFileName: project?.report?.fileName,
      });

      queryClient?.invalidateQueries({ queryKey: ["projects"] });
      queryClient?.invalidateQueries({ queryKey: qk.project(projectId) });

      setDraftSaved(true);
      setTimeout(() => {
        router.push("/drafts");
      }, 600);
    } catch (err: any) {
      console.error("Save draft error:", err?.message || err);
      setTimeout(() => {
        router.push("/drafts");
      }, 600);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSendWithResend = async () => {
    if (pkg.data) {
      clearDraft(projectId);
      send.mutate(pkg.data.id);
    }

    setIsSendingViaResend(true);
    setSendError(null);
    setSendWarning(null);

    try {
      const res = await sendPackageEmailAction({
        projectId,
        packageId: pkg.data?.id,
        recipient: {
          name: recipientName,
          email: recipientEmail,
          company: recipientCompany,
          role: recipientRole,
        },
        subject: emailSubject,
        greeting: emailGreeting,
        body: emailBody,
        ctaName: ctaName,
        ctaUrl: project?.video?.playbackUrl ? undefined : `/projects/${projectId}/review`,
        videoUrl: project?.video?.playbackUrl,
        posterUrl: project?.video?.posterUrl,
        reportFileName: fileName,
        reportStorageUrl: project?.report?.storageUrl,
      });

      if (!res.success) {
        setSendError(res.error || "Failed to deliver email via Resend.");
      } else {
        if (res.warning) {
          setSendWarning(res.warning);
        }
        setIsSentConfirmed(true);
        setConfirming(false);
        queryClient?.invalidateQueries({ queryKey: ["projects"] });
        queryClient?.invalidateQueries({ queryKey: qk.project(projectId) });
      }
    } catch (err: any) {
      console.error("Resend delivery error:", err);
      setSendError(err?.message || "An unexpected error occurred while sending with Resend.");
    } finally {
      setIsSendingViaResend(false);
    }
  };


  const sent =
    isSentConfirmed ||
    job?.status === "succeeded" ||
    project?.package?.status === "sent" ||
    project?.status === "sent";

  // ── Step 7: Confirmed Sent State ──────────────────────────────────────────
  if (sent) {
    const sentPackage = project?.package;
    return (
      <div className="relative min-h-[calc(100vh-60px)] bg-[#070913] text-white py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-500/30 bg-[#0c1220]/90 p-8 shadow-[0_0_40px_rgba(16,185,129,0.15)] backdrop-blur-xl text-center space-y-6">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Check className="size-7 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Package Delivered Successfully
            </h1>
            <p className="text-sm font-light text-slate-300">
              Your package reached {recipientName} via Resend.
            </p>
            <p className="text-xs text-slate-400 font-mono">
              {recipientEmail}
              {sentPackage?.sentAt
                ? ` · ${formatDateTime(sentPackage.sentAt)}`
                : " · Just now"}
            </p>
          </div>

          {sendWarning ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200 text-left font-light leading-relaxed">
              <span className="font-semibold text-amber-300 block mb-1">Resend Notice:</span>
              {sendWarning}
            </div>
          ) : null}

          <div className="pt-4 flex justify-center">
            <Button
              asChild
              className="rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-2.5 text-white font-medium hover:opacity-90 cursor-pointer"
            >
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }


  if (isPending) {
    return (
      <div className="min-h-[calc(100vh-60px)] bg-[#070913] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
          <div className="h-10 w-72 rounded-lg bg-white/10" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5" />
            ))}
          </div>
          <div className="h-48 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-60px)] bg-[#070913] text-white py-10 px-4 sm:px-6 overflow-hidden">
      {/* Subtle Background Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-blue-600/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-purple-600/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-4xl space-y-7">
        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Review before sending
          </h1>
          <p className="text-sm font-light text-slate-400">
            Nothing has been sent. This is the only screen that can send it, and
            only after you approve.
          </p>
        </div>

        {/* 4 Checklist Rows */}
        <div className="space-y-2.5">
          {/* Row 1: Report attached */}
          <div className="flex items-center justify-between px-5 py-3.5 rounded-xl border border-white/10 bg-[#0c1220]/75 backdrop-blur-md hover:border-white/20 transition-all">
            <div className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-bold text-sm">✓</span>
              <span className="text-sm font-medium text-white">
                Report attached
              </span>
              <span className="inline-flex items-center justify-center size-4 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                🧾
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-light">
              <span>
                {fileName} (
                {project?.report?.sizeBytes
                  ? `${Math.round(project.report.sizeBytes / 1024)} kB`
                  : "37 kB"}
                )
              </span>
              {!project?.report && (
                <Link
                  href={`/projects/${projectId}/report`}
                  className="text-blue-400 hover:underline font-normal"
                >
                  Fix →
                </Link>
              )}
            </div>
          </div>

          {/* Row 2: Video generated */}
          <div className="flex items-center justify-between px-5 py-3.5 rounded-xl border border-white/10 bg-[#0c1220]/75 backdrop-blur-md hover:border-white/20 transition-all">
            <div className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-bold text-sm">✓</span>
              <span className="text-sm font-medium text-white">
                Video generated
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-xs">
                <UserRound className="size-3.5 text-slate-300" />
                <Video className="size-3.5 text-slate-300" />
              </div>
              {!project?.video?.playbackUrl && (
                <Link
                  href={`/projects/${projectId}/video`}
                  className="text-blue-400 text-xs hover:underline font-normal"
                >
                  Fix →
                </Link>
              )}
            </div>
          </div>

          {/* Row 3: Recipient set */}
          <div className="flex items-center justify-between px-5 py-3.5 rounded-xl border border-white/10 bg-[#0c1220]/75 backdrop-blur-md hover:border-white/20 transition-all">
            <div className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-bold text-sm">✓</span>
              <span className="text-sm font-medium text-white">
                Recipient set
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
              <span>1 recipient: {recipientName.toUpperCase()}</span>
              {!recipient && (
                <Link
                  href={`/projects/${projectId}/recipient`}
                  className="text-blue-400 hover:underline font-normal"
                >
                  Fix →
                </Link>
              )}
            </div>
          </div>

          {/* Row 4: Email written */}
          <div className="flex items-center justify-between px-5 py-3.5 rounded-xl border border-white/10 bg-[#0c1220]/75 backdrop-blur-md hover:border-white/20 transition-all">
            <div className="flex items-center gap-2.5">
              <span className="text-emerald-400 font-bold text-sm">✓</span>
              <span className="text-sm font-medium text-white">Email written</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {!project?.email && (
                <Link
                  href={`/projects/${projectId}/email`}
                  className="text-blue-400 hover:underline font-normal"
                >
                  Fix →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* "What will be sent" Glowing Card */}
        <div className="relative rounded-2xl border border-blue-500/40 bg-[#0a0e1c]/90 p-6 shadow-[0_0_35px_rgba(59,130,246,0.18)] backdrop-blur-xl space-y-5">
          <h2 className="text-sm font-medium text-slate-300 tracking-wide">
            What will be sent
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* To Column */}
            <div className="space-y-2">
              <div className="text-xs font-light text-slate-400">To</div>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                  <UserRound className="size-4 text-slate-300" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-wide uppercase">
                    {recipientName}
                  </div>
                  <div className="text-xs text-slate-400 font-light">
                    {recipientEmail}
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-light text-slate-400">
                <span>Subject</span>
                <Mail className="size-3.5 text-slate-400" />
              </div>
              <div className="text-sm font-bold text-white leading-snug">
                {emailSubject}
              </div>
            </div>
          </div>

          {/* Combined Email Message Box: Greeting + Body */}
          <div className="rounded-xl border border-white/10 bg-[#050814]/90 p-4 space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p className="text-white font-medium text-sm">
              {emailGreeting}
            </p>
            <p className="whitespace-pre-line text-slate-300 font-light">
              {emailBody}
            </p>
          </div>

          {/* Attached items & CTA Deliverables Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Video badge */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-1.5 text-xs text-cyan-300 font-medium">
              <Video className="size-3.5 text-cyan-400" />
              <span>Personalised video attached</span>
            </div>

            {/* CTA button badge */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 font-medium">
              <Calendar className="size-3.5 text-slate-400" />
              <span>CTA: {ctaName}</span>
            </div>

            {/* File attachment badge */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 font-light">
              <Paperclip className="size-3.5 text-slate-400" />
              <span className="truncate max-w-[200px]">{fileName}</span>
            </div>
          </div>

          {/* Bottom attached items note */}
          <div className="rounded-xl border border-white/10 bg-[#050814]/90 px-4 py-3 text-xs text-slate-300 font-light leading-relaxed">
            A personalised video, the message above, a call to action, and{" "}
            <span className="text-white font-medium">{fileName}</span> attached.
          </div>
        </div>

        {/* Progress or Error states */}
        {job && job.status !== "succeeded" ? (
          <JobProgressCard
            job={job}
            label="Sending package"
            onRetry={() => {
              setJobId(undefined);
              if (pkg.data) send.mutate(pkg.data.id);
            }}
          />
        ) : null}

        {send.isError || sendError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-rose-200 text-sm"
          >
            <p className="font-medium text-white">Delivery Issue</p>
            <p className="mt-1 text-xs text-rose-300">
              {sendError ||
                (send.error instanceof Error
                  ? send.error.message
                  : "The send could not be completed.")}
            </p>
          </div>
        ) : null}

        {/* Action Button Bar */}
        <div className="relative flex flex-wrap items-center gap-4 pt-2">
          {/* Approve & Send -> */}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!allMet || !pkg.data || isSendingViaResend || send.isPending || Boolean(jobId)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#22c55e] via-[#06b6d4] to-[#6366f1] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,197,94,0.35)] transition-all hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Approve &amp; Send</span>
            <ArrowRight className="size-4" />
          </button>

          {/* Draft Button (right side of Approve & Send) */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSendingViaResend}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 px-5 py-2.5 text-sm font-medium text-slate-200 hover:text-white transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {draftSaved ? (
              <Check className="size-4 text-emerald-400" />
            ) : isSavingDraft ? (
              <Loader2 className="size-4 animate-spin text-slate-400" />
            ) : (
              <Download className="size-4 text-slate-400" />
            )}
            <span>{draftSaved ? "Saved!" : isSavingDraft ? "Saving..." : "Draft"}</span>
          </button>

          {/* <- Back */}
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/email`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>

          {!allMet ? (
            <p className="text-xs font-light text-amber-400/90 ml-2">
              Every item above must be completed before sending.
            </p>
          ) : null}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirming}
        onClose={() => !isSendingViaResend && setConfirming(false)}
        title="Send this package?"
        description={
          recipient
            ? `This sends the personalized video, the cold email, and ${fileName} directly to ${recipientName} (${recipientEmail}). This action is final and cannot be unsent.`
            : "This package has no recipient configured."
        }

      >
        <div className="flex justify-end gap-3 pt-3">
          <Button
            variant="outline"
            autoFocus
            disabled={isSendingViaResend}
            onClick={() => setConfirming(false)}
            className="rounded-full border-white/20 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendWithResend}
            disabled={isSendingViaResend || send.isPending}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white font-medium hover:opacity-90"
          >
            {isSendingViaResend ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Sending with Resend…</span>
              </span>
            ) : (
              "Send it"
            )}
          </Button>
        </div>
      </Dialog>

    </div>
  );
}
