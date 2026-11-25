"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  RotateCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  UploadCloud,
} from "lucide-react";

import { useJobPolling } from "@/hooks/use-job-polling";
import { usePresets } from "@/hooks/use-presets";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
  REPORT_INPUT_ACCEPT,
  rejectionForReportFile,
} from "@/lib/report-validation";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Report } from "@/types";

function formatSize(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function ReportStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [rejection, setRejection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isWhatWeReadOpen, setIsWhatWeReadOpen] = useState(true);

  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const draft = useWorkflowStore((state) => state.drafts[projectId]);

  const jobId = useWorkflowStore((state) => state.activeJobs[`${projectId}:parse`]);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);
  const clearActiveJob = useWorkflowStore((state) => state.clearActiveJob);

  const { data: project } = useProject(projectId);
  const { data: job } = useJobPolling<Report>(jobId, projectId);
  const { presets: avatarPresets } = usePresets("avatar");

  const selectedAvatar = avatarPresets?.find((a: { id: string }) => a.id === draft?.avatarId);
  const defaultPresenter =
    (selectedAvatar?.name
      ? selectedAvatar.name.replace(/—.*$/, "").replace(/Photo.*$/, "").trim()
      : "") || "Priyabrata Goze";

  const [presenterName, setPresenterName] = useState(defaultPresenter);
  const [subject, setSubject] = useState(draft?.subject || "");
  const [scriptText, setScriptText] = useState(draft?.script || "");
  const [insightsList, setInsightsList] = useState<string[]>([]);
  const hasAutoTriggeredRef = useRef(false);

  useEffect(() => {
    if (selectedAvatar?.name && presenterName === "Priyabrata Goze") {
      const clean = selectedAvatar.name
        .replace(/—.*$/, "")
        .replace(/Photo.*$/, "")
        .trim();
      if (clean) setPresenterName(clean);
    }
  }, [selectedAvatar?.name, presenterName]);

  // Gemini AI Script Generator Mutation
  const generateScriptMutation = useMutation({
    mutationFn: () => api.generateScriptFromReport(projectId, presenterName),
    onSuccess: (data) => {
      setSubject(data.subject);
      setScriptText(data.script);
      setInsightsList(data.insights);
      patchDraft(projectId, {
        subject: data.subject,
        script: data.script,
      });
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
    },
  });

  // Upload Mutation
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadReport(projectId, file),
    onSuccess: (started) => {
      setActiveJob(projectId, "parse", started.id);
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
    },
  });

  // When parse job finishes, clear active job and refresh
  useEffect(() => {
    if (job?.status === "succeeded") {
      clearActiveJob(projectId, "parse");
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
      // Trigger Gemini script generation to ensure the latest report is scanned
      generateScriptMutation.mutate();
    }
  }, [job?.status, projectId, clearActiveJob]);

  // Sync state from project when loaded
  useEffect(() => {
    if (!project) return;

    if (project.analysis?.executiveSummary && !subject) {
      setSubject(project.analysis.executiveSummary);
    }
    if (project.script?.body && !scriptText) {
      setScriptText(project.script.body);
    }
    if (
      project.analysis?.keyInsights &&
      project.analysis.keyInsights.length > 0 &&
      insightsList.length === 0
    ) {
      setInsightsList(project.analysis.keyInsights.map((i) => i.title));
    }

    // If report is parsed but no script is available yet, scan report automatically
    if (
      project.report &&
      project.report.status === "parsed" &&
      !project.script?.body &&
      !scriptText &&
      !generateScriptMutation.isPending &&
      !hasAutoTriggeredRef.current
    ) {
      hasAutoTriggeredRef.current = true;
      generateScriptMutation.mutate();
    }
  }, [project, subject, scriptText, insightsList, generateScriptMutation]);

  const accept = (file: File | undefined) => {
    if (!file) return;
    const problem = rejectionForReportFile(file);
    setRejection(problem);
    if (problem) return;
    clearActiveJob(projectId, "parse");
    upload.mutate(file);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${scriptText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    generateScriptMutation.mutate();
  };

  const handleContinue = () => {
    patchDraft(projectId, {
      script: scriptText,
      subject: subject,
    });
    if (scriptText && typeof api.updateScript === "function") {
      void api.updateScript(projectId, scriptText);
    }
    router.push(`/projects/${projectId}/voice`);
  };

  const report = project?.report;
  const isParsing =
    upload.isPending ||
    (job && job.status !== "succeeded") ||
    generateScriptMutation.isPending;

  const fileName = report?.fileName || "Uploaded Report";
  const fileSizeStr = report ? formatSize(report.sizeBytes) : "";
  const pageCountStr = report?.pageCount ? `${report.pageCount} pages` : "";
  const isDocx =
    fileName.toLowerCase().endsWith(".docx") ||
    fileName.toLowerCase().endsWith(".doc");

  const displayInsights =
    insightsList.length > 0
      ? insightsList
      : project?.analysis?.keyInsights && project.analysis.keyInsights.length > 0
      ? project.analysis.keyInsights.map((i) => i.title)
      : isParsing
      ? ["Analyzing document with Gemini AI...", "Extracting key findings..."]
      : ["Document processed and ready for script synthesis."];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={REPORT_INPUT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {/* Header Block */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Upload the report
        </h1>
        <p className="mt-2 text-sm font-light text-muted-foreground">
          The client report this communication is built from. It is parsed for
          insights and attached to the package that goes out.
        </p>
      </div>

      {/* Error alert if any */}
      {rejection ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200"
        >
          {rejection}
        </div>
      ) : null}

      {/* Document Upload Area or Document Card */}
      {!report && !upload.isPending ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            accept(e.dataTransfer.files?.[0]);
          }}
          className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-[#0d1322]/70 p-12 text-center backdrop-blur-md transition-all hover:border-cyan-500/60 hover:bg-[#0d1322]/90 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
            <UploadCloud className="size-7" />
          </div>
          <p className="mt-4 text-base font-medium text-white">
            Drop a report here, or browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF or DOCX · up to 25MB
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0d1322]/90 p-5 sm:p-6 shadow-[0_0_35px_rgba(6,182,212,0.12)] backdrop-blur-md transition-all">
          {/* Document Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Word / PDF Icon */}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-sm shadow-inner">
                {isDocx ? "W" : <FileText className="size-5 text-teal-300" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold text-white tracking-tight">
                    {fileName}
                  </span>
                  {isParsing ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300 border border-cyan-500/30 animate-pulse">
                      <Loader2 className="size-3 animate-spin text-cyan-400" />
                      Scanning with Gemini AI...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      parsed
                    </span>
                  )}
                </div>
                <p className="text-xs font-light text-muted-foreground mt-0.5">
                  {fileSizeStr} {pageCountStr ? `• ${pageCountStr}` : ""}
                </p>
              </div>
            </div>

            {/* Replace Button */}
            <button
              type="button"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Replace <RotateCw className="size-3 text-white/60" />
            </button>
          </div>

          {/* What We Read Accordion */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setIsWhatWeReadOpen(!isWhatWeReadOpen)}
              className="flex w-full items-center justify-between text-xs font-medium text-white/90 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                What we read
                {isParsing && (
                  <Loader2 className="size-3 animate-spin text-cyan-400" />
                )}
              </span>
              {isWhatWeReadOpen ? (
                <ChevronUp className="size-4 text-white/60" />
              ) : (
                <ChevronDown className="size-4 text-white/60" />
              )}
            </button>

            {isWhatWeReadOpen ? (
              <ul className="mt-3 space-y-1.5 pl-2 text-xs font-light text-muted-foreground">
                {displayInsights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-400/80" />
                    <span className="leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}

      {/* Lower Section: 2 Columns */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10 pt-2">
        {/* Left Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="size-4 text-purple-400" />
            <span>Generated Script</span>
          </div>
          <p className="text-xs font-light leading-relaxed text-muted-foreground">
            Insights from your report have been scanned with Gemini AI to generate
            the personalized briefing script for your avatar.
          </p>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}/avatar`)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Right Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#121626]/90 p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-sm">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-light text-muted-foreground/70 flex items-center gap-1.5">
                {generateScriptMutation.isPending ? (
                  <>
                    <Loader2 className="size-3 animate-spin text-cyan-400" />
                    <span>Gemini AI is generating your script...</span>
                  </>
                ) : (
                  <span>Generated by Gemini AI</span>
                )}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 text-white/60" />
                      <span>Copy Script</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={generateScriptMutation.isPending || !report}
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-40"
                >
                  <RotateCw
                    className={`size-3 ${
                      generateScriptMutation.isPending ? "animate-spin" : ""
                    }`}
                  />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Presenter & Subject Line */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white/80 shrink-0">Presenter:</span>
                <input
                  type="text"
                  placeholder="Account user / presenter name..."
                  value={presenterName}
                  onChange={(e) => setPresenterName(e.target.value)}
                  className="flex-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white/80 shrink-0">Subject:</span>
                <input
                  type="text"
                  placeholder="Subject title generated from document..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Script Text Body */}
            <div className="relative">
              <textarea
                rows={8}
                placeholder={
                  generateScriptMutation.isPending
                    ? "Gemini AI is scanning your report and drafting your spoken video briefing script..."
                    : "Spoken video script will appear here once the report is uploaded..."
                }
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0c101c] p-4 text-xs font-light leading-relaxed text-white/90 placeholder:text-muted-foreground/60 focus:border-cyan-500 focus:outline-none transition-colors"
              />
              {generateScriptMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-[#0d1322]/90 px-4 py-2 text-xs text-cyan-300 shadow-lg">
                    <Loader2 className="size-4 animate-spin text-cyan-400" />
                    <span>Gemini AI is writing your briefing script...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Sparkles className="size-4 text-cyan-400" />
            <button
              type="button"
              onClick={handleContinue}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 px-7 py-2.5 text-xs font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all hover:opacity-95"
            >
              <span>Continue</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
