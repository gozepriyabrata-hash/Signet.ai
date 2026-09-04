"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ListProjectsOptions } from "@/lib/api/types";
import { qk } from "@/lib/query-keys";

/**
 * The project list, used by both the dashboard's recent list and /projects.
 *
 * Client-side only, deliberately. The mock adapter's state lives in the
 * browser's sessionStorage, so a server prefetch would dehydrate seed data the
 * browser disagrees with and the user would watch their own projects flicker
 * out and back (specs/003-dashboard.md §3.3).
 *
 * `keepPreviousData` keeps the current rows on screen while a changed filter
 * loads. Without it, every filter change is treated as a brand new query and
 * the list blanks back to skeletons — the "jumps in and out of the success and
 * pending states" the TanStack docs describe. Callers use `isPlaceholderData`
 * to mark those rows as stale rather than pretending they are current.
 */
export function useProjects(options?: ListProjectsOptions) {
  const { status, query } = options ?? {};

  return useQuery({
    queryKey: qk.projects(status, query),
    queryFn: () => api.listProjects({ status, query }),
    placeholderData: keepPreviousData,
  });
}
