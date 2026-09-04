"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/** The dashboard's three headline numbers. Client-side, for the same reason as
 *  useProjects — see specs/003-dashboard.md §3.3. */
export function useStats() {
  return useQuery({
    queryKey: qk.stats(),
    queryFn: () => api.getStats(),
  });
}
