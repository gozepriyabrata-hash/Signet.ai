"use client";

import { CampaignRow } from "@/components/campaigns/CampaignRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePackages } from "@/hooks/use-packages";

/**
 * The campaigns table, and all four of its states (CLAUDE.md rule 9).
 *
 * A real <table> for the same reason `/projects` uses one: this screen exists
 * to scan and compare, where column headers give screen-reader users row and
 * column context a stack of list items cannot. It deliberately does not share
 * a row component with the projects table — the two diverge on their first
 * column and on their row targets, and a shared component grows a prop per
 * difference (specs/004 §3.5, applied again).
 *
 * Zero controls, unlike `/projects`, and the asymmetry is the point. A status
 * filter over a two-value set is a toggle pretending to be a filter, and a
 * search box here would be a search box over client names — the one control
 * rule 11 would have to be argued about rather than obeyed (specs/005 §3.9).
 */

const COLUMNS = ["Subject", "Recipient", "Sent", ""] as const;

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
        <Skeleton className="h-5 w-72" />
      </td>
      <td className="px-4 py-4">
        <Skeleton className="h-5 w-40" />
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

export function CampaignsTable() {
  const { data, isPending, isError, error, refetch, isFetching } = usePackages();

  if (isPending) {
    return (
      <div
        className="overflow-x-auto rounded-xs border border-border bg-surface"
        aria-busy="true"
      >
        <table className="w-full min-w-3xl border-collapse">
          <caption className="sr-only">Loading campaigns</caption>
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
          Could not load your campaigns.
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
    // One empty, and it is a genuine one rather than a filtered one, because
    // there are no filters. No create action either: the way to arrive here is
    // to finish a workflow, and "create a project" is an answer to a question
    // this screen did not ask.
    return (
      <EmptyState
        title="Nothing sent yet"
        description="Approved packages appear here once they have been sent, with a record of what went out and to whom."
      />
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xs border border-border bg-surface"
      aria-busy={isFetching}
    >
      <table className="w-full min-w-3xl border-collapse">
        <caption className="sr-only">
          Sent packages, most recently sent first
        </caption>
        <HeaderRow />
        <tbody>
          {data.map((pkg) => (
            <CampaignRow key={pkg.id} pkg={pkg} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
