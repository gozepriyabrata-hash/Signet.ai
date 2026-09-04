"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Job } from "@/types";

const POLL_MS = 2_000;

/**
 * CLAUDE.md rule 5, made real: one hook owns all job polling, and nothing else
 * calls `getJob`.
 *
 * ── Polling stops on a terminal status ──────────────────────────────────────
 * `refetchInterval` returns `false` once a job is `succeeded` or `failed`.
 * `docs/data-model.md` is blunt about why: "Never poll a succeeded or failed
 * job — that is a bug, not a safety net." A job that keeps polling after it
 * finishes is invisible in the UI and costs a request every two seconds
 * forever, so it is the one behaviour here with a dedicated test.
 *
 * ── A failed job is not an error state ──────────────────────────────────────
 * The query *succeeds* and returns a job whose status is `failed`. That is the
 * shape rule 5 requires — "failures are recoverable in place with a Retry,
 * never a dead end or a full-page error" — so nothing here throws to an error
 * boundary. `isError` on this hook means the poll itself could not be made;
 * `data.status === "failed"` means the work did not succeed. They are different
 * facts and the UI treats them differently.
 *
 * ── The background-tab problem ──────────────────────────────────────────────
 * TanStack's `refetchIntervalInBackground` defaults to `false`, so polling
 * pauses while the tab is hidden. That is correct — polling what nobody is
 * watching is waste — but a video render is the longest job in this product and
 * is exactly what a user switches away from, so they return to a bar frozen
 * wherever it was. The effect below refetches once on regaining visibility, so
 * the first thing they see is the truth rather than a stale number that jumps
 * two seconds later.
 */
export function useJobPolling<T>(
  jobId: string | undefined,
  projectId: string | undefined,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.job(jobId ?? "none"),
    queryFn: () => api.getJob<T>(jobId as string),
    enabled: Boolean(jobId),
    // A job's progress is stale the moment it is read, so there is no window in
    // which a cached value is preferable to a fresh one.
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? POLL_MS : false;
    },
  });

  const status = query.data?.status;

  // On a terminal success the project has gained an asset — the parsed report,
  // the analysis, the rendered video. Invalidating it is what makes the stepper
  // advance, because the stepper derives completion from the project rather
  // than from the job (lib/workflow.ts).
  useEffect(() => {
    if (status !== "succeeded" || !projectId) return;
    void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  }, [status, projectId, queryClient]);

  useEffect(() => {
    if (!jobId) return;
    if (status !== "queued" && status !== "running") return;

    const onVisible = () => {
      if (document.visibilityState === "visible") void query.refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // `query.refetch` is stable per query instance; depending on the whole
    // query object would re-subscribe on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, status]);

  return query;
}

/** True when a job is still doing something. Exported so callers do not each
 *  write their own version of the same two-status check. */
export function isJobRunning(job: Job<unknown> | undefined): boolean {
  return job?.status === "queued" || job?.status === "running";
}
