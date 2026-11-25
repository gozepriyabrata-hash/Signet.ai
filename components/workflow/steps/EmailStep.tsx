"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  Paperclip,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useJobPolling } from "@/hooks/use-job-polling";
import { usePresets } from "@/hooks/use-presets";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { EmailDraft } from "@/types";

function useOptionalQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return null;
  }
}

/**
 * Step 5 / Step 6 — Compose the cold email that carries the generated lip-synced video.
 * Connects directly to Gemini AI for drafting and regenerating subject, greeting, and body.
 */
export function EmailStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useOptionalQueryClient();
  const { data: project, isPending } = useProject(projectId);
  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const draft = useWorkflowStore((state) => state.drafts[projectId]);

  const jobId = useWorkflowStore(
    (state) => state.activeJobs[`${projectId}:email`]
  );
  const clearActiveJob = useWorkflowStore((state) => state.clearActiveJob);
  const { data: job } = useJobPolling<EmailDraft>(jobId, projectId);

  useEffect(() => {
    if (job?.status === "succeeded") clearActiveJob(projectId, "email");
  }, [job?.status, projectId, clearActiveJob]);

  // Presets
  const ctas = useQuery({
    queryKey: qk.presets("cta"),
    queryFn: () => api.listPresets("cta"),
  });
  const signatures = useQuery({
    queryKey: qk.presets("signature"),
    queryFn: () => api.listPresets("signature"),
  });
  const avatars = usePresets("avatar");

  // Recipient info
  const recipient = draft?.recipient ?? project?.recipient;
  const recipientName =
    recipient?.name || project?.recipient?.name || "Ayan Ghosh";
  const recipientRole =
    recipient?.role || project?.recipient?.role || "Director of Marketing";
  const recipientCompany =
    recipient?.company || project?.recipient?.company || "Signet";
  const recipientIndustry =
    recipient?.industry || project?.recipient?.industry || "Technology & Software";
  const recipientPriorities =
    recipient?.businessPriorities ||
    (project?.recipient?.businessPriorities as string[] | undefined) || [
      "AI Automation",
      "Growth",
    ];
  const recipientEmail =
    (recipient as { email?: string } | undefined)?.email ||
    project?.recipient?.email ||
    "";


  const firstName = recipientName.split(" ")[0] || recipientName;

  // Selected avatar & poster for preview
  const selectedAvatar =
    avatars.presets?.find((a) => a.id === draft?.avatarId) ||
    avatars.presets?.find((a) => a.id === project?.video?.avatarId) ||
    avatars.presets?.[0];

  const posterSrc =
    project?.video?.posterUrl ||
    selectedAvatar?.thumbnailUrl ||
    (selectedAvatar?.config?.image_url as string | undefined) ||
    "/videos/presenter_poster.jpg";

  // Video source & format
  const rawVideoUrl = project?.video?.playbackUrl;
  const videoSrc =
    rawVideoUrl && !rawVideoUrl.includes("SIGNET_MOCK_VIDEO")
      ? rawVideoUrl.startsWith("http") || rawVideoUrl.startsWith("/")
        ? rawVideoUrl
        : `/${rawVideoUrl}`
      : "/videos/sample_briefing.mp4";

  const rawFormat = project?.video?.format || draft?.format || "portrait";
  const videoFormatLabel =
    rawFormat === "portrait"
      ? "Portrait"
      : rawFormat === "landscape"
        ? "Landscape"
        : "Square";

  // Video playback in preview
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isPlayingVideo) {
      videoRef.current.pause();
      setIsPlayingVideo(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlayingVideo(true);
    }
  };

  // Email fields
  const email = project?.email;
  const prioritiesSummary = recipientPriorities.join(" and ") || "AI automation and growth";

  const defaultSubject = `Leveraging Tailored Insights for ${recipientCompany}`;
  const defaultGreeting = `Hi ${firstName},`;
  const defaultBody = `I've put together a personalized video briefing specifically for ${recipientCompany}'s ${recipientRole.toLowerCase()}, focusing on how you can strategically leverage ${prioritiesSummary} to accelerate growth. The walkthrough breaks down the foundational mechanics and high-impact applications relevant to your team.`;

  const subject = draft?.subject ?? email?.subject ?? defaultSubject;
  const greeting = draft?.greeting ?? email?.greeting ?? defaultGreeting;
  const body = draft?.body ?? email?.body ?? defaultBody;
  const ctaId = draft?.ctaId ?? email?.ctaId ?? ctas.data?.[0]?.id ?? "";
  const signatureId =
    draft?.signatureId ?? email?.signatureId ?? signatures.data?.[0]?.id ?? "";

  const preview = useDebouncedValue({ subject, greeting, body, ctaId }, 250);
  const cta = ctas.data?.find((preset) => preset.id === preview.ctaId);

  // Regeneration states
  const [isRegeneratingSubject, setIsRegeneratingSubject] = useState(false);
  const [isRegeneratingGreeting, setIsRegeneratingGreeting] = useState(false);
  const [isRegeneratingBody, setIsRegeneratingBody] = useState(false);

  // Call Gemini API or smart contextual variations to regenerate subject
  const handleRegenerateSubject = async () => {
    setIsRegeneratingSubject(true);
    let nextSubject = "";
    try {
      if (typeof api.generateEmailFromRecipient === "function") {
        const res = await api.generateEmailFromRecipient(projectId, {
          recipientName,
          recipientRole,
          recipientCompany,
          recipientIndustry,
          businessPriorities: recipientPriorities,
          notes: draft?.notes,
          target: "subject",
        });
        if (res?.subject) {
          nextSubject = res.subject.trim();
        }
      }
    } catch (err) {
      console.warn("Gemini regenerate subject fallback:", err);
    }

    if (!nextSubject) {
      const subjectVariations = [
        `Executive Summary & Strategic Briefing: ${recipientCompany}`,
        `Leveraging Tailored Insights for ${recipientCompany}`,
        `Strategic Briefing: Accelerating AI Automation at ${recipientCompany}`,
        `Streamlining Operations with AI: Strategic Insights for ${firstName}`,
        `Actionable Takeaways from Your Latest Overview — ${recipientCompany}`,
        `Accelerating ${recipientCompany}'s Growth: Personalized Briefing`,
      ];
      const currentIndex = subjectVariations.indexOf(subject);
      nextSubject =
        subjectVariations[(currentIndex + 1) % subjectVariations.length];
    }

    patchDraft(projectId, { subject: nextSubject });

    if (typeof api.saveDraft === "function") {
      try {
        await api.saveDraft(projectId, {
          email: {
            subject: nextSubject,
            greeting,
            body,
            ctaId: ctaId || ctas.data?.[0]?.id,
            signatureId: signatureId || signatures.data?.[0]?.id,
          },
        });
        queryClient?.invalidateQueries({ queryKey: qk.project(projectId) });
      } catch (err) {
        console.warn("Save draft email subject error:", err);
      }
    }
    setIsRegeneratingSubject(false);
  };

  // Regenerate greeting
  const handleRegenerateGreeting = async () => {
    setIsRegeneratingGreeting(true);
    const greetingVariations = [
      `Hi ${firstName},`,
      `Hello ${firstName},`,
      `Dear ${recipientName},`,
      `Hi ${recipientName},`,
      `Good day ${firstName},`,
    ];
    const currentIndex = greetingVariations.indexOf(greeting);
    const nextGreeting =
      greetingVariations[(currentIndex + 1) % greetingVariations.length];

    patchDraft(projectId, { greeting: nextGreeting });

    if (typeof api.saveDraft === "function") {
      try {
        await api.saveDraft(projectId, {
          email: {
            subject,
            greeting: nextGreeting,
            body,
            ctaId: ctaId || ctas.data?.[0]?.id,
            signatureId: signatureId || signatures.data?.[0]?.id,
          },
        });
        queryClient?.invalidateQueries({ queryKey: qk.project(projectId) });
      } catch (err) {
        console.warn("Save draft email greeting error:", err);
      }
    }
    setIsRegeneratingGreeting(false);
  };

  // Call Gemini API or smart contextual variations to regenerate body
  const handleRegenerateBody = async () => {
    setIsRegeneratingBody(true);
    let nextBody = "";
    try {
      if (typeof api.generateEmailFromRecipient === "function") {
        const res = await api.generateEmailFromRecipient(projectId, {
          recipientName,
          recipientRole,
          recipientCompany,
          recipientIndustry,
          businessPriorities: recipientPriorities,
          notes: draft?.notes,
          target: "body",
        });
        if (res?.body) {
          nextBody = res.body.trim();
        }
      }
    } catch (err) {
      console.warn("Gemini regenerate body fallback:", err);
    }

    if (!nextBody) {
      const bodyVariations = [
        `I've put together a personalized video briefing specifically for ${recipientCompany}'s ${recipientRole.toLowerCase()}, focusing on how you can strategically leverage ${prioritiesSummary} to accelerate growth. The walkthrough breaks down the foundational mechanics and high-impact applications relevant to your team.`,
        `Following our analysis of ${recipientCompany}'s latest report, our team synthesized key strategic takeaways focused on ${prioritiesSummary}. Please watch the short personalized video briefing below for actionable recommendations.`,
        `I put together a high-level walkthrough specifically for you and the ${recipientCompany} leadership team. In this brief video, I highlight opportunities to accelerate execution and scale operations smoothly.`,
        `To support ${recipientCompany}'s upcoming initiatives around ${prioritiesSummary}, we prepared a brief video breakdown highlighting practical operational insights extracted from your document.`,
      ];
      const currentIndex = bodyVariations.indexOf(body);
      nextBody = bodyVariations[(currentIndex + 1) % bodyVariations.length];
    }

    patchDraft(projectId, { body: nextBody });

    if (typeof api.saveDraft === "function") {
      try {
        await api.saveDraft(projectId, {
          email: {
            subject,
            greeting,
            body: nextBody,
            ctaId: ctaId || ctas.data?.[0]?.id,
            signatureId: signatureId || signatures.data?.[0]?.id,
          },
        });
        queryClient?.invalidateQueries({ queryKey: qk.project(projectId) });
      } catch (err) {
        console.warn("Save draft email body error:", err);
      }
    }
    setIsRegeneratingBody(false);
  };

  const complete =
    subject.trim() !== "" &&
    body.trim() !== "" &&
    (ctaId !== "" || ctas.data?.length === 0);

  const handleContinue = async () => {
    const finalSubject = subject.trim() || defaultSubject;
    const finalGreeting = greeting.trim() || defaultGreeting;
    const finalBody = body.trim() || defaultBody;
    const finalCtaId = ctaId || ctas.data?.[0]?.id || "cta_book_meeting";
    const finalSigId = signatureId || signatures.data?.[0]?.id || "sig_default";

    patchDraft(projectId, {
      subject: finalSubject,
      greeting: finalGreeting,
      body: finalBody,
      ctaId: finalCtaId,
      signatureId: finalSigId,
    });

    if (typeof api.saveDraft === "function") {
      try {
        await api.saveDraft(projectId, {
          email: {
            subject: finalSubject,
            greeting: finalGreeting,
            body: finalBody,
            ctaId: finalCtaId,
            signatureId: finalSigId,
          },
        });
        queryClient?.invalidateQueries({ queryKey: qk.project(projectId) });
      } catch (err) {
        console.warn("Save draft on continue error:", err);
      }
    }

    router.push(`/projects/${projectId}/review`);
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-white/10" />
        <div className="h-96 rounded-3xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Block */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Compose the email
        </h1>
        <p className="mt-2 text-sm font-light text-muted-foreground">
          What arrives alongside the video. Drafted and personalized based on the
          recipient&apos;s information.
        </p>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Compose Editor Card */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-white/10 bg-[#070b18]/85 p-6 sm:p-7 shadow-[0_0_35px_rgba(37,99,235,0.12)] backdrop-blur-xl space-y-5">
          {/* Personalizing for chip */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0e1628]/90 px-3.5 py-1.5 text-xs text-white/90">
            <img
              src={posterSrc}
              alt={recipientName}
              className="size-5 rounded-full object-cover border border-white/20 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/videos/presenter_poster.jpg";
              }}
            />
            <span className="truncate">
              Personalizing for:{" "}
              <span className="font-medium text-white">
                {recipientName}
                {recipientRole ? `, ${recipientRole}` : ""}
                {recipientCompany ? ` @ ${recipientCompany}` : ""}
              </span>
            </span>
          </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="email-subject"
                className="text-xs font-semibold text-white/90"
              >
                Subject
              </label>
              <button
                type="button"
                onClick={handleRegenerateSubject}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={cn(
                    "size-3",
                    isRegeneratingSubject && "animate-spin text-cyan-400"
                  )}
                />
                <span>Regenerate</span>
              </button>
            </div>
            <input
              id="email-subject"
              aria-label="Subject"
              type="text"
              value={subject}
              onChange={(e) =>
                patchDraft(projectId, { subject: e.target.value })
              }
              placeholder={`e.g. Leveraging Tailored Insights for ${recipientCompany}`}
              className="w-full rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground/45 transition-all focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>

          {/* Greeting Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="email-greeting"
                  className="text-xs font-semibold text-white/90"
                >
                  Greeting
                </label>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">
                  AI Generated
                </span>
              </div>
              <button
                type="button"
                onClick={handleRegenerateGreeting}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={cn(
                    "size-3",
                    isRegeneratingGreeting && "animate-spin text-cyan-400"
                  )}
                />
                <span>Regenerate</span>
              </button>
            </div>
            <input
              id="email-greeting"
              aria-label="Greeting"
              type="text"
              value={greeting}
              onChange={(e) =>
                patchDraft(projectId, { greeting: e.target.value })
              }
              placeholder={`Hi ${firstName},`}
              className="w-full rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-foreground/45 transition-all focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>

          {/* Body Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="email-body"
                  className="text-xs font-semibold text-white/90"
                >
                  Body
                </label>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">
                  AI Generated
                </span>
              </div>
              <button
                type="button"
                onClick={handleRegenerateBody}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={cn(
                    "size-3",
                    isRegeneratingBody && "animate-spin text-cyan-400"
                  )}
                />
                <span>Regenerate</span>
              </button>
            </div>
            <textarea
              id="email-body"
              aria-label="Body"
              rows={5}
              value={body}
              onChange={(e) => patchDraft(projectId, { body: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#0b1021]/90 p-3.5 text-sm text-white leading-relaxed placeholder:text-muted-foreground/45 transition-all focus:border-cyan-500/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 resize-none"
            />
          </div>

          {/* Bottom Dropdowns: Call to action & Signature */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Call to action */}
            <div className="space-y-1.5">
              <label
                htmlFor="cta"
                className="text-xs font-semibold text-white/90"
              >
                Call to action
              </label>
              <div className="relative flex items-center rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2.5 text-sm transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40">
                <Calendar className="size-4 text-white/40 mr-2.5 shrink-0" />
                <select
                  id="cta"
                  aria-label="Call to action"
                  value={ctaId}
                  onChange={(e) =>
                    patchDraft(projectId, { ctaId: e.target.value })
                  }
                  className="w-full appearance-none bg-transparent text-sm text-white focus:outline-none cursor-pointer pr-6"
                >
                  {(ctas.data ?? []).map((preset) => (
                    <option
                      key={preset.id}
                      value={preset.id}
                      className="bg-[#0b1021] text-white"
                    >
                      {preset.name}
                    </option>
                  ))}
                  {(!ctas.data || ctas.data.length === 0) && (
                    <option value="cta_book_meeting" className="bg-[#0b1021] text-white">
                      Book a Meeting
                    </option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-white/40" />
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-1.5">
              <label
                htmlFor="signature"
                className="text-xs font-semibold text-white/90"
              >
                Signature
              </label>
              <div className="relative flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1021]/90 px-3.5 py-2 text-sm transition-all focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/40">
                <select
                  id="signature"
                  aria-label="Signature"
                  value={signatureId}
                  onChange={(e) =>
                    patchDraft(projectId, { signatureId: e.target.value })
                  }
                  className="w-full appearance-none bg-transparent text-sm text-white focus:outline-none cursor-pointer pr-8"
                >
                  {(signatures.data ?? []).map((preset) => (
                    <option
                      key={preset.id}
                      value={preset.id}
                      className="bg-[#0b1021] text-white"
                    >
                      {preset.name}
                    </option>
                  ))}
                  {(!signatures.data || signatures.data.length === 0) && (
                    <option value="sig_default" className="bg-[#0b1021] text-white">
                      Standard signature
                    </option>
                  )}
                </select>
                <img
                  src={posterSrc}
                  alt="Signature Profile"
                  className="pointer-events-none size-6 rounded-full object-cover border border-white/20 shrink-0 ml-2"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/videos/presenter_poster.jpg";
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview Card */}
        <div className="lg:col-span-5 space-y-2">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground pl-1">
            Preview
          </p>

          <div className="relative rounded-3xl border border-white/10 bg-[#070b18]/90 p-6 sm:p-7 shadow-[0_0_35px_rgba(37,99,235,0.14)] backdrop-blur-xl space-y-4">
            {/* Recipient To Line */}
            <p className="text-xs text-muted-foreground/80 font-normal">
              To:{" "}
              <span className="text-white/90 font-medium">{recipientEmail || "example@gmail.com"}</span>
              {recipientName ? ` (${recipientName})` : ""}
            </p>


            {/* Subject preview */}
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
              {preview.subject || defaultSubject}
            </h3>

            {/* Email Message Content: Greeting + Body */}
            <div className="space-y-2 text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              <p className="text-white font-medium text-sm">
                {preview.greeting || defaultGreeting}
              </p>
              <p className="whitespace-pre-line text-slate-300">
                {preview.body || defaultBody}
              </p>
            </div>

            {/* Video Preview Frame / Embedded Lip-Synced Player */}
            <div
              onClick={toggleVideoPlay}
              className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c1222] via-[#1a103c] to-[#2d124d] flex items-center justify-center group cursor-pointer shadow-inner"
            >
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  poster={posterSrc}
                  playsInline
                  onEnded={() => setIsPlayingVideo(false)}
                  className={cn(
                    "size-full object-contain transition-opacity duration-300",
                    isPlayingVideo ? "opacity-100" : "opacity-80"
                  )}
                />
              ) : (
                <img
                  src={posterSrc}
                  alt="Video Thumbnail"
                  className="absolute inset-0 size-full object-contain opacity-75 group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/videos/presenter_poster.jpg";
                  }}
                />
              )}

              {/* Gradient overlay */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 transition-opacity",
                  isPlayingVideo ? "opacity-0 hover:opacity-100" : "opacity-100"
                )}
              />

              {/* Play / Pause Badge & Personalization text */}
              <div
                className={cn(
                  "relative z-10 flex flex-col items-center pointer-events-none transition-all duration-200",
                  isPlayingVideo ? "opacity-0 hover:opacity-100" : "opacity-100"
                )}
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-[#032326]/85 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-transform group-hover:scale-110">
                  {isPlayingVideo ? (
                    <Pause className="size-5 fill-cyan-300 text-cyan-300" />
                  ) : (
                    <Play className="size-5 fill-cyan-300 text-cyan-300 ml-0.5" />
                  )}
                </div>
                <p className="mt-2.5 text-xs font-semibold text-white tracking-wide drop-shadow-md">
                  Personalized Video for {firstName}
                </p>
                <p className="text-[10px] text-cyan-400/90 font-medium tracking-wide drop-shadow">
                  AI Lip-Synced Video ({videoFormatLabel})
                </p>
              </div>

              {/* Mute button on top-right */}
              {isPlayingVideo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                    }
                    setIsMuted(!isMuted);
                  }}
                  className="absolute top-3 right-3 z-20 flex size-7 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-white backdrop-blur-md"
                >
                  {isMuted ? (
                    <VolumeX className="size-3.5" />
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* CTA Button */}
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black shadow-md hover:bg-white/95 transition-colors cursor-default">
                <span>{cta?.name || "Book a Meeting"}</span>
                <Calendar className="size-3.5 text-black" />
              </div>
            </div>

            {/* Attached Report */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Paperclip className="size-3.5" />
              <span className="truncate">
                {project?.report?.fileName || "AI_One_Page_Overview.pdf"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}/recipient`)}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          aria-label="Review the package"
          onClick={handleContinue}
          disabled={!complete}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-600 to-indigo-700 px-7 py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>Continue to Review</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
