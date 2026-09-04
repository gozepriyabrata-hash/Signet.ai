"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Job } from "@/types";

/**
 * The canonical long-running-AI surface — CLAUDE.md rule 5, made concrete.
 *
 * ── Why this component exists at all ────────────────────────────────────────
 * Rule 5: "Generation is a job, not a spinner… Render real progress and a stage
 * label. Failures are recoverable in place with a Retry — never a dead end or a
 * full-page error." Every one of those clauses is a line in this file, and the
 * reason it is one component rather than a pattern is that a pattern would be
 * followed four times and diverge by the fourth.
 *
 * ── A failure is a state of this card, not of the screen ────────────────────
 * `failed` renders here, inside the card, with the message and a Retry. It does
 * not throw, it does not replace the step, and it does not become an error
 * boundary. That is the difference between "the video did not render" and "the
 * app broke", and users can tell.
 *
 * A cancellation is the same status with a different code (specs/007 §3.7), so
 * the card reads `error.retryable` rather than the status to decide whether to
 * offer Retry. Offering "try again" as the answer to "stop" is an argument.
 *
 * It also reads it to decide the border and the ARIA role: a stopped job is a
 * neutral `status`, not a danger `alert`. Sharing a JobStatus is a data-model
 * compromise; sharing the visual language would be telling the user something
 * broke when they are the one who stopped it.
 *
 * ── The pulse ──────────────────────────────────────────────────────────────
 * `--accent` and the generation pulse are correct here and almost nowhere else:
 * this is a job running, which is literally what that token means. The pulse is
 * a CSS keyframe in globals.css, and the global prefers-reduced-motion rule
 * collapses it.
 */

function useElapsed(startedAt: string, isRunning: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [isRunning]);

  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function JobProgressCard({
  job,
  label,
  onRetry,
  onCancel,
}: {
  job: Job<unknown>;
  label: string;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  const isRunning = job.status === "queued" || job.status === "running";
  const elapsed = useElapsed(job.startedAt, isRunning);

  if (job.status === "succeeded") {
    return (
      <div className="rounded-xs border border-border bg-surface p-6">
        {/* Collapses to a one-line summary. A finished job that keeps a full
            progress card is taking up the room the next step needs. */}
        <p className="flex items-center gap-2 text-sm font-light tracking-[0.01em] text-body-foreground">
          <span aria-hidden="true" className="text-success">
            ✓
          </span>
          <span>
            {label} — done in {formatElapsed(elapsed)}.
          </span>
        </p>
      </div>
    );
  }

  if (job.status === "failed") {
    const cancelled = job.error?.code === "CANCELLED";
    return (
      // A cancellation shares the `failed` status as an implementation
      // compromise — specs/007 §3.7 declined to widen JobStatus for it — but it
      // must not share the presentation. Nothing went wrong when a user presses
      // Cancel, and a danger border announced as an alert says something did.
      //
      // This was caught by looking at the rendered card, not by a test: the
      // colour resolved perfectly in both themes and was still the wrong colour
      // to use. specs/006 §10 is the same lesson.
      <div
        role={cancelled ? "status" : "alert"}
        className={
          cancelled
            ? "rounded-xs border border-border bg-surface p-6"
            : "rounded-xs border border-danger bg-surface p-6"
        }
      >
        <p className="text-base font-normal text-foreground">
          {cancelled ? `${label} stopped` : `${label} did not finish`}
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {job.error?.message ?? "Something went wrong."}
        </p>

        {/* Retry lives INSIDE the card. Rule 5 says a failed generation must
            never become a dead end, and a Retry somewhere else on the page is
            a dead end with a button near it.
            
            A cancellation carries retryable: false, so no Retry appears — the
            user chose to stop, and the step's own Generate control is still
            there if they change their mind. Pushing "try again" at someone who
            just pressed Cancel is an argument. */}
        {onRetry && job.error?.retryable ? (
          <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xs border border-border bg-surface p-6">
      <div className="flex items-baseline justify-between gap-4">
        {/* aria-live so a screen reader hears the stage change rather than
            only the bar's value, which announces as a bare number. */}
        <p
          aria-live="polite"
          className="text-sm font-light tracking-[0.01em] text-body-foreground"
        >
          <span className="text-foreground">{label}</span>
          {" — "}
          {job.stage}
        </p>
        <p className="text-sm font-light tabular-nums text-muted-foreground">
          {formatElapsed(elapsed)}
        </p>
      </div>

      <div className="mt-4 generation-pulse">
        <Progress value={job.progress} label={`${label}: ${job.stage}`} />
      </div>

      {onCancel ? (
        <Button variant="ghost" size="sm" className="mt-5" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
