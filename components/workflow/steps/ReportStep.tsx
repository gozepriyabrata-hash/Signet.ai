"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { JobProgressCard } from "@/components/workflow/JobProgressCard";
import { StepShell } from "@/components/workflow/StepShell";
import { Button } from "@/components/ui/button";
import { useJobPolling } from "@/hooks/use-job-polling";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Report } from "@/types";

/**
 * Step 1 — get the source document in and parsed.
 *
 * ── Validation happens here, and is not a security control ──────────────────
 * CLAUDE.md rule 12 requires type and size to be checked before the file
 * reaches the service layer, and they are. What that buys is a user learning in
 * 50ms instead of after a 25MB upload.
 *
 * It buys nothing else, and reading rule 12 as a security boundary would be a
 * mistake. MDN is explicit that `accept` "doesn't validate the types of the
 * selected files", that a user can override it in the file chooser, and that it
 * "should be backed up by appropriate server-side validation" — and that some
 * operating systems report non-standard MIME types for common extensions, which
 * is why the extension is checked as a fallback rather than trusted alone. When
 * `lib/api/real/` becomes real, the same checks must exist on the far side.
 *
 * Rejections render inline on the dropzone, never as a toast: a message about
 * the file belongs where the file is.
 */

const MAX_BYTES = 25 * 1024 * 1024;

/** The IANA-registered types. `application/pdf` and the OOXML wordprocessing
 *  type; anything else is refused before the seam is called. */
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function rejectionFor(file: File): string | null {
  const name = file.name.toLowerCase();
  const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));

  // Either signal is enough to accept, because neither is reliable alone: the
  // browser's `type` can be empty or non-standard, and an extension is just a
  // string. Both wrong is a confident enough refusal.
  if (!ACCEPTED_TYPES.has(file.type) && !extensionOk) {
    return "That file is not a PDF or a Word document. Upload a .pdf or .docx.";
  }
  if (file.size > MAX_BYTES) {
    const mb = Math.round(file.size / 1_000_000);
    return `That file is ${mb}MB. The limit is 25MB.`;
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function ReportStep({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [rejection, setRejection] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // The job id lives in the store, not in this component: a refresh mid-job
  // would otherwise orphan it — nothing would poll it, so nothing would ever
  // observe it finishing and write its result to the project.
  const jobId = useWorkflowStore((state) => state.activeJobs[`${projectId}:parse`]);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);
  const clearActiveJob = useWorkflowStore((state) => state.clearActiveJob);

  const { data: project, isPending } = useProject(projectId);
  const { data: job } = useJobPolling<Report>(jobId, projectId);


  // Clear on SUCCESS only. A succeeded job's id has no further use, and leaving
  // it in a persisted store means a remount re-polls a finished job and flashes
  // its card.
  //
  // A FAILED job's id must stay: the card renders from it, and the Retry lives
  // inside that card. Clearing it would make the failure vanish and leave the
  // user with no way back — the dead end rule 5 exists to prevent.
  useEffect(() => {
    if (job?.status === "succeeded") clearActiveJob(projectId, "parse");
  }, [job?.status, projectId, clearActiveJob]);
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadReport(projectId, file),
    onSuccess: (started) => {
      setActiveJob(projectId, "parse", started.id);
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
    },
  });

  const accept = (file: File | undefined) => {
    if (!file) return;
    const problem = rejectionFor(file);
    setRejection(problem);
    if (problem) return;
    clearActiveJob(projectId, "parse");
    upload.mutate(file);
  };

  const report = project?.report;
  const parsed = report?.status === "parsed";

  return (
    <StepShell
      title="Upload the report"
      description="The client report this communication is built from. It is parsed for insights and attached to the package that goes out."
      onNext={parsed ? () => router.push(`/projects/${projectId}/recipient`) : undefined}
      nextDisabled={!parsed}
      nextLabel="Continue"
    >
      {isPending ? (
        <div
          aria-busy="true"
          aria-label="Loading project"
          className="h-48 rounded-xs border border-border bg-surface"
        />
      ) : (
        <div className="space-y-6">
          {/* The dropzone. A label wrapping a visually-hidden file input, so it
              is a real control: clickable, focusable and operable by keyboard
              without re-implementing any of that. */}
          {!report || rejection ? (
            <div>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  accept(event.dataTransfer.files[0]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xs border border-dashed px-6 py-16 text-center transition-colors duration-150 ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground ${
                  rejection
                    ? "border-danger bg-surface"
                    : dragging
                      ? "border-foreground bg-surface-raised"
                      : "border-border bg-surface hover:bg-surface-raised"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  // A hint to the file picker, nothing more — see the header.
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={(event) => accept(event.target.files?.[0])}
                />
                <span className="text-base font-normal text-foreground">
                  Drop a report here, or browse
                </span>
                <span className="mt-2 text-sm font-light tracking-[0.01em] text-body-foreground">
                  PDF or DOCX · up to 25MB
                </span>
              </label>

              {rejection ? (
                // Inline, on the dropzone. Never a toast.
                <p role="alert" className="mt-3 text-sm font-light text-danger">
                  {rejection}
                </p>
              ) : null}
            </div>
          ) : null}

          {upload.isError ? (
            <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
              <p className="text-base font-normal text-foreground">
                Could not upload that file.
              </p>
              <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                {upload.error instanceof Error
                  ? upload.error.message
                  : "Something went wrong."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => upload.reset()}
              >
                Try another file
              </Button>
            </div>
          ) : null}

          {job && !parsed ? (
            <JobProgressCard
              job={job}
              label="Reading the report"
              onRetry={() => {
                clearActiveJob(projectId, "parse");
                upload.reset();
              }}
            />
          ) : null}

          {/* Confirm the right file landed. A parsed report the user cannot
              recognise is a parsed report they will re-upload. */}
          {report ? (
            <div className="rounded-xs border border-border bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-normal text-foreground">
                    {report.fileName}
                  </p>
                  <p className="mt-1 text-sm font-light tracking-[0.01em] text-body-foreground">
                    {formatSize(report.sizeBytes)}
                    {report.pageCount ? ` · ${report.pageCount} pages` : ""}
                    {parsed ? " · parsed" : " · parsing"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearActiveJob(projectId, "parse");
                    upload.reset();
                    setRejection(null);
                    inputRef.current?.click();
                  }}
                >
                  Replace
                </Button>
              </div>

              {report.excerpt ? (
                <details className="mt-5 border-t border-border pt-4">
                  <summary className="cursor-pointer list-none text-sm font-light tracking-[0.01em] text-body-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                    What we read
                  </summary>
                  <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                    {report.excerpt}
                  </p>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </StepShell>
  );
}
