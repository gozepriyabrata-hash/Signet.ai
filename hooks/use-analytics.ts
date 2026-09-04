"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { AnalyticsRange } from "@/types";

/**
 * The `/analytics` figures for one range.
 *
 * Client-side only, for the reason every read in this app is: the mock
 * adapter's state lives in the browser's sessionStorage and the server cannot
 * see it (specs/003 §3.3).
 *
 * `keepPreviousData` here but NOT in `use-packages`, and the difference is the
 * filter. Changing the range is a subsequent fetch on a screen that is already
 * showing something, and without this the whole page — five tiles and two
 * charts — blanks back to skeletons on every change. `/campaigns` has no filter,
 * so it has no subsequent fetch to smooth over. Callers use `isPlaceholderData`
 * to dim rather than pretend the old numbers are current (specs/004 §3.4).
 */
export function useAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: qk.analytics(range),
    queryFn: () => api.getAnalytics(range),
    placeholderData: keepPreviousData,
  });
}
