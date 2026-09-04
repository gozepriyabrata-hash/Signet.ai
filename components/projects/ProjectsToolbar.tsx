"use client";

import { useId } from "react";

import type { ProjectStatus } from "@/types";

export type StatusFilter = ProjectStatus | "all";

export const STATUS_FILTERS: ReadonlyArray<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "all", label: "All projects" },
  { value: "draft", label: "Draft" },
  { value: "analysing", label: "Analysing" },
  { value: "video_pending", label: "Generating video" },
  { value: "email_pending", label: "Drafting email" },
  { value: "ready_for_review", label: "Ready for review" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

/**
 * The list's two controls, both fully controlled by ProjectsBrowser.
 *
 * Presentational on purpose: the decision about *where each value lives* —
 * status in the URL, search in component state — belongs in one place, and
 * splitting it across two components is how it gets accidentally reversed.
 *
 * A native <select> rather than a vendored dropdown-menu, for the same reason
 * the dashboard uses one: eight options, and the native control is keyboard-
 * and screen-reader-correct for free.
 */
export function ProjectsToolbar({
  status,
  onStatusChange,
  search,
  onSearchChange,
}: {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
}) {
  const statusId = useId();
  const searchId = useId();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-64 flex-1 flex-col gap-2">
        <label
          htmlFor={searchId}
          className="text-sm font-light text-body-foreground"
        >
          Search
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search project names"
          className="rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={statusId}
          className="text-sm font-light text-body-foreground"
        >
          Status
        </label>
        <select
          id={statusId}
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as StatusFilter)
          }
          className="rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Reserves the toolbar's height while the Suspense boundary resolves, so the
 * page does not shift when the client tree hydrates.
 */
export function ProjectsToolbarFallback() {
  return <div aria-hidden="true" className="h-[70px]" />;
}
