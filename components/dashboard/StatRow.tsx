"use client";

import { StatCard, StatCardSkeleton } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/use-stats";

/**
 * The three headline numbers.
 *
 * Client-side because the mock adapter lives in the browser's sessionStorage
 * and the server cannot read it (specs/003-dashboard.md §3.3).
 *
 * All four states ship (CLAUDE.md rule 9). There is no empty state here — three
 * zeroes are a legitimate success result, not an absence.
 */
export function StatRow() {
  const { data, isPending, isError, error, refetch, isFetching } = useStats();

  if (isPending) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-3"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading statistics"
      >
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
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
          Could not load your statistics.
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        {/* Recoverable in place — never a dead end (CLAUDE.md rule 5). */}
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

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Active projects" value={data.activeProjects} />
      <StatCard label="Videos generated" value={data.videosGenerated} />
      <StatCard label="Emails sent" value={data.emailsSent} />
    </div>
  );
}
