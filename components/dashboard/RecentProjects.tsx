"use client";

import { useId, useState } from "react";

import { ProjectRow } from "@/components/dashboard/ProjectRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { NewProjectButton } from "@/components/shared/NewProjectButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/use-projects";
import type { ProjectStatus } from "@/types";

/**
 * The recent-projects list, with a status filter.
 *
 * The filter is local `useState`, not a searchParams value: reading
 * searchParams is a runtime API and would take the route dynamic, trading the
 * static shell for a shareable filter URL on a screen nobody shares. It is not
 * a durable preference either, so it does not belong in Zustand — it dies with
 * the page, which is correct (specs/003-dashboard.md §3.7).
 *
 * A native <select> rather than a vendored dropdown-menu: eight options, and
 * the native control is keyboard- and screen-reader-correct for free.
 */

const FILTERS: ReadonlyArray<{ value: ProjectStatus | "all"; label: string }> = [
  { value: "all", label: "All projects" },
  { value: "draft", label: "Draft" },
  { value: "analysing", label: "Analysing" },
  { value: "video_pending", label: "Generating video" },
  { value: "email_pending", label: "Drafting email" },
  { value: "ready_for_review", label: "Ready for review" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

function RowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="mt-2 h-5 w-24" />
      </div>
      <Skeleton className="h-8 w-16 rounded-full" />
    </li>
  );
}

export function RecentProjects() {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const selectId = useId();

  const { data, isPending, isError, error, refetch, isFetching } = useProjects(
    filter === "all" ? undefined : { status: filter },
  );

  return (
    <section aria-labelledby="recent-projects-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2
          id="recent-projects-heading"
          className="text-2xl font-normal tracking-tight text-foreground"
        >
          Recent projects
        </h2>

        <div className="flex items-center gap-2">
          <label
            htmlFor={selectId}
            className="text-sm font-light text-body-foreground"
          >
            Status
          </label>
          <select
            id={selectId}
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ProjectStatus | "all")
            }
            className="rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="rounded-xs border border-border bg-surface"
        aria-live="polite"
        aria-busy={isPending}
      >
        {isPending ? (
          <ul aria-label="Loading projects">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </ul>
        ) : isError ? (
          <div role="alert" className="p-6">
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
        ) : data.length === 0 ? (
          filter === "all" ? (
            <EmptyState
              title="No projects yet"
              description="Upload a client report and we will turn it into a personalised video and email — for you to review before anything is sent."
              action={
                <NewProjectButton label="Create your first communication" />
              }
            />
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                No projects with this status.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => setFilter("all")}
              >
                Show all projects
              </Button>
            </div>
          )
        ) : (
          <ul>
            {data.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
