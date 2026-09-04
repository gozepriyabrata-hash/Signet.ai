"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/**
 * The sent-package history behind `/campaigns`.
 *
 * Client-side only, for the reason every list in this app is: the mock
 * adapter's state lives in the browser's sessionStorage, so a server prefetch
 * would dehydrate seed data the browser disagrees with (specs/003 §3.3).
 *
 * No `placeholderData: keepPreviousData`, unlike `useProjects`. That option
 * exists there to stop a *filter change* blanking the table back to skeletons;
 * this list has no filters (specs/005 §3.9), so there is no subsequent fetch
 * for it to smooth over.
 */
export function usePackages() {
  return useQuery({
    queryKey: qk.packages(),
    queryFn: () => api.listPackages(),
  });
}
