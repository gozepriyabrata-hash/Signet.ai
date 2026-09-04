"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { ProjectsTable } from "@/components/projects/ProjectsTable";
import {
  ProjectsToolbar,
  STATUS_FILTERS,
  type StatusFilter,
} from "@/components/projects/ProjectsToolbar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

/**
 * Owns where each piece of list state lives — the whole point of specs/004.
 *
 * **Status goes in the URL.** `/projects?status=ready_for_review` is a real
 * address: shareable, bookmarkable, and restored by the Back button after
 * opening a project. It is a seven-value enum that identifies nobody.
 *
 * **The search query does not.** Project names in this product describe client
 * work — our own fixtures include "Q3 Portfolio Review — Meridian Capital" —
 * so a `?q=` parameter would put client identifiers into browser history and
 * into any URL someone pastes into a chat. Rule 11 exists to stop client
 * identity leaking through channels nobody audits, and a search box is such a
 * channel whether or not the string came from a Recipient record. The cost is
 * that a searched view cannot be shared. That is accepted, deliberately.
 *
 * This component must stay inside a <Suspense> boundary: `useSearchParams` on a
 * prerendered route client-renders the tree up to the nearest boundary, and a
 * static page that calls it without one FAILS `next build` — while appearing to
 * work in `next dev`, where routes render on demand.
 */
function isStatusFilter(value: string | null): value is StatusFilter {
  return STATUS_FILTERS.some((option) => option.value === value);
}

export function ProjectsBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawStatus = searchParams.get("status");
  const status: StatusFilter = isStatusFilter(rawStatus) ? rawStatus : "all";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const handleStatusChange = useCallback(
    (next: StatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("status");
      else params.set("status", next);

      const queryString = params.toString();

      // `replace`, not `push`: pushing would add a history entry per filter
      // change, so trying three filters would take four Back presses to leave
      // the page. Back should mean "the screen before this one".
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    handleStatusChange("all");
  }, [handleStatusChange]);

  return (
    <div className="space-y-6">
      <ProjectsToolbar
        status={status}
        onStatusChange={handleStatusChange}
        search={search}
        onSearchChange={setSearch}
      />
      <ProjectsTable
        status={status}
        query={debouncedSearch}
        isFiltered={status !== "all" || debouncedSearch.trim() !== ""}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
