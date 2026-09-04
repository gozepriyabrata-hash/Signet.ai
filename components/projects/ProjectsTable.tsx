"use client";

import { ProjectTableRow } from "@/components/projects/ProjectTableRow";
import type { StatusFilter } from "@/components/projects/ProjectsToolbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { NewProjectButton } from "@/components/shared/NewProjectButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";

/**
 * The table, and all four of its states (CLAUDE.md rule 9).
 *
 * A real <table> rather than the dashboard's list of rows, because the two
 * screens do different jobs. The dashboard shows three to five rows as a
 * summary; this one exists to scan and compare an unbounded set, where column
 * headers give screen-reader users row and column context a stack of list
 * items cannot — and where adding sorting later is a small change rather than
 * a rewrite.
 */

const COLUMNS = ["Project", "Status", "Last updated", ""] as const;

function HeaderRow() {
  return (
    <thead>
      <tr className="border-b border-border">
        {COLUMNS.map((column, index) => (
          <th
            key={column || "actions"}
            scope="col"
            className={`px-4 py-3 text-sm font-normal text-body-foreground ${
              index === COLUMNS.length - 1 ? "text-right" : "text-left"
            }`}
          >
            {column || <span className="sr-only">Actions</span>}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function RowSkeleton() {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-4">
        <Skeleton className="h-5 w-64" />
      </td>
      <td className="px-4 py-4">
        <Skeleton className="h-5 w-28" />
      </td>
      <td className="px-4 py-4">
        <Skeleton className="h-5 w-24" />
      </td>
      <td className="px-4 py-4">
        <Skeleton className="ml-auto h-8 w-16 rounded-full" />
      </td>
    </tr>
  );
}

export function ProjectsTable({
  status,
  query,
  isFiltered,
  onClearFilters,
}: {
  status: StatusFilter;
  query: string;
  isFiltered: boolean;
  onClearFilters: () => void;
}) {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useProjects({
    status: status === "all" ? undefined : status,
    query: query.trim() || undefined,
  });

  if (isPending) {
    return (
      <div
        className="overflow-x-auto rounded-xs border border-border bg-surface"
        aria-busy="true"
      >
        <table className="w-full min-w-3xl border-collapse">
          <caption className="sr-only">Loading projects</caption>
          <HeaderRow />
          <tbody>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </tbody>
        </table>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xs border border-danger bg-surface p-6"
      >
        <p className="text-base font-normal text-foreground">
          Could not load your projects.
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    // Two different empties. "Nothing here yet" needs a way forward; "nothing
    // matches" needs a way back, and offering "create a project" to someone who
    // simply mistyped a search is answering a question they did not ask.
    return isFiltered ? (
      <div className="rounded-xs border border-border bg-surface px-6 py-16 text-center">
        <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          No projects match these filters.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    ) : (
      <EmptyState
        title="No projects yet"
        description="Upload a client report and we will turn it into a personalised video and email — for you to review before anything is sent."
        action={<NewProjectButton label="Create your first communication" />}
      />
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xs border border-border bg-surface"
      aria-busy={isFetching}
    >
      {/* Rows stay on screen while a changed filter loads, dimmed rather than
          removed. Without keepPreviousData in use-projects, every filter change
          would blank the table back to skeletons. */}
      <table
        className={`w-full min-w-3xl border-collapse transition-opacity duration-150 ease-out ${
          isPlaceholderData ? "opacity-60" : "opacity-100"
        }`}
      >
        <caption className="sr-only">
          Projects, most recently updated first
        </caption>
        <HeaderRow />
        <tbody>
          {data.map((project) => (
            <ProjectTableRow key={project.id} project={project} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
