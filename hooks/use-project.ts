"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/**
 * One project, with everything the workflow has produced for it so far.
 *
 * Every step reads this: it is what the stepper derives completion from, what
 * each step checks its entry condition against, and what a finished job
 * invalidates (see use-job-polling). Client-side only, for the reason every
 * read in this app is — the mock adapter's store lives in the browser.
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: qk.project(projectId),
    queryFn: () => api.getProject(projectId),
  });
}
