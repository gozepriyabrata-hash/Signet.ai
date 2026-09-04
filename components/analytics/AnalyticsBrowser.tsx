"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { MetricTiles, MetricTilesSkeleton } from "@/components/analytics/MetricTiles";
import {
  RangePicker,
  isAnalyticsRange,
} from "@/components/analytics/RangePicker";
import { SentOverTimeChart } from "@/components/analytics/SentOverTimeChart";
import { StatusBreakdown } from "@/components/analytics/StatusBreakdown";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import type { AnalyticsRange } from "@/types";

/**
 * Owns the one piece of state this screen has, and all four of its states.
 *
 * ── The range lives in the URL ──────────────────────────────────────────────
 * `/analytics?range=30d` is a real address: someone who narrows to 7 days and
 * sends the link means to send that view, and Back after following a link out
 * should return to it. `AnalyticsRange` is a four-value enum that identifies
 * nobody, so rule 11 has no objection — the same test that let the projects
 * list's status filter into the URL while keeping its search box out
 * (specs/004 §4, specs/006 §3.6).
 *
 * Written with `router.replace`, not `push`: pushing would add a history entry
 * per range change, so trying three periods would take four Back presses to
 * leave the page.
 *
 * This component must stay inside a <Suspense> boundary. `useSearchParams` on a
 * prerendered route client-renders the tree up to the nearest one, and a static
 * page that calls it without a boundary FAILS `next build` — while appearing to
 * work in `next dev`, where routes render on demand.
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 * No open rate, no click-through rate, no engagement score. Not squeamishness:
 * a pixel-derived open rate is unmeasurable for a large share of recipients,
 * and collecting one means instrumenting a named client — `/settings/analytics`
 * decides that, and this screen may only display what that gate allows
 * (specs/006 §3.2 and §3.3).
 *
 * And no per-recipient row, ever. Aggregates are the only shape this screen
 * renders, which is also why the seam hands it counts rather than records
 * (§3.4, §3.5).
 */
export function AnalyticsBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawRange = searchParams.get("range");
  const range: AnalyticsRange = isAnalyticsRange(rawRange) ? rawRange : "30d";

  const handleRangeChange = useCallback(
    (next: AnalyticsRange) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "30d") params.delete("range");
      else params.set("range", next);

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useAnalytics(range);

  return (
    <div className="space-y-8">
      <RangePicker range={range} onRangeChange={handleRangeChange} />

      {isPending ? (
        <div aria-busy="true" aria-live="polite" aria-label="Loading analytics">
          <MetricTilesSkeleton />
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-xs border border-danger bg-surface p-6"
        >
          <p className="text-base font-normal text-foreground">
            Could not load your analytics.
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
      ) : (
        // Two empties, not one. "Nothing sent yet" needs no way back; "nothing
        // in this period" does, and offering a wider period to someone who
        // simply picked seven days is answering the question they asked
        // (specs/004 §3.4 established the distinction).
        <div
          className={`space-y-8 transition-opacity duration-150 ease-out ${
            isPlaceholderData ? "opacity-60" : "opacity-100"
          }`}
        >
          {data.packagesSent === 0 && data.sendsFailed === 0 ? (
            range === "all" ? (
              <EmptyState
                title="Nothing sent yet"
                description="Once you have approved and sent a package, this is where its record and the numbers around it appear."
              />
            ) : (
              <div className="rounded-xs border border-border bg-surface px-6 py-16 text-center">
                <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                  Nothing was sent in this period.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleRangeChange("all")}
                >
                  Show all time
                </Button>
              </div>
            )
          ) : (
            <>
              <MetricTiles summary={data} />
              <SentOverTimeChart summary={data} />
            </>
          )}

          {/* Outside the empty branch on purpose: "where work is sitting" is a
              present-tense question about every project, so it stays useful in
              a period with no sends — and it is the figure the picker does not
              move. */}
          <StatusBreakdown summary={data} />
        </div>
      )}
    </div>
  );
}
