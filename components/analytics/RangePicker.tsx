"use client";

import { useId } from "react";

import type { AnalyticsRange } from "@/types";

export const ANALYTICS_RANGES: ReadonlyArray<{
  value: AnalyticsRange;
  label: string;
}> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export function isAnalyticsRange(
  value: string | null,
): value is AnalyticsRange {
  return ANALYTICS_RANGES.some((option) => option.value === value);
}

/**
 * The screen's only control.
 *
 * One, deliberately. No metric picker, no comparison mode, no segment selector,
 * no goal setting, no export — a reporting screen is the most accretive surface
 * in any product, and every one of those is a preference wearing a chart's
 * clothing. Rule 1 sends preferences to Settings (specs/006 §3.11).
 *
 * A native <select>, for the reason the projects toolbar uses one: four options,
 * and the native control is keyboard- and screen-reader-correct for free.
 *
 * Presentational. Where the value lives — the URL — is AnalyticsBrowser's
 * decision, kept in one place so it cannot be accidentally reversed.
 */
export function RangePicker({
  range,
  onRangeChange,
}: {
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-light text-body-foreground">
        Period
      </label>
      <select
        id={id}
        value={range}
        onChange={(event) =>
          onRangeChange(event.target.value as AnalyticsRange)
        }
        className="rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        {ANALYTICS_RANGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Reserves the picker's height while the Suspense boundary resolves, so the
 *  page does not shift when the client tree hydrates. */
export function RangePickerFallback() {
  return <div aria-hidden="true" className="h-[70px]" />;
}
