"use client";

import { useState } from "react";

import { ChartFigure } from "@/components/analytics/ChartFigure";
import type { AnalyticsSummary, ProjectStatus } from "@/types";

/**
 * Where work is sitting — one horizontal bar per project status.
 *
 * ── Why this is a sequential chart, not a categorical one ───────────────────
 * The reader compares lengths; the status is named in a label beside its bar
 * rather than encoded in a hue. So every bar is drawn in one ink and the screen
 * needs no categorical palette — which is the whole reason `/analytics` could
 * ship before the design system grew one (specs/006 §3.8).
 *
 * The one exception is at the bottom of the workflow: `sent` and `failed` are
 * job outcomes, and `docs/design-system.md` reserves the semantic colours for
 * exactly that. Everything mid-flight stays neutral, matching the discipline
 * `ProjectTableRow` already follows.
 *
 * ── Why this chart ignores the date range ───────────────────────────────────
 * "Where is work sitting" is a present-tense question. Filtering it through the
 * range would make the chart answer something nobody asked — the adapter
 * deliberately counts across all projects, and this is the one figure on the
 * screen the picker does not move.
 */

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  analysing: "Analysing",
  video_pending: "Generating video",
  email_pending: "Drafting email",
  ready_for_review: "Ready for review",
  sent: "Sent",
  failed: "Failed",
};

/** Semantic colour is reserved for job outcomes (docs/design-system.md §1), so
 *  only the two terminal states are tinted. Everything else is neutral ink. */
const STATUS_FILL: Record<ProjectStatus, string> = {
  draft: "fill-foreground",
  analysing: "fill-foreground",
  video_pending: "fill-foreground",
  email_pending: "fill-foreground",
  ready_for_review: "fill-foreground",
  sent: "fill-success",
  failed: "fill-danger",
};

const ROW_H = 34;
const BAR_H = 18;
const LABEL_W = 160;
const VALUE_W = 40;
const VIEW_W = 720;

export function StatusBreakdown({ summary }: { summary: AnalyticsSummary }) {
  const [hovered, setHovered] = useState<ProjectStatus | null>(null);

  const rows = summary.projectsByStatus;
  const max = Math.max(1, ...rows.map((row) => row.count));
  const trackW = VIEW_W - LABEL_W - VALUE_W;
  const viewH = rows.length * ROW_H;

  return (
    <ChartFigure
      title="Where work is sitting"
      description="Every project by its current step. Not filtered by the date range — this is where things stand now."
      columns={["Status", "Projects"]}
      rows={rows.map((row) => ({
        label: STATUS_LABEL[row.status],
        value: String(row.count),
      }))}
    >
      {(captionId) => (
        <svg
          role="img"
          aria-labelledby={captionId}
          viewBox={`0 0 ${VIEW_W} ${viewH}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
        >
          {rows.map((row, index) => {
            const y = index * ROW_H;
            const width = (row.count / max) * trackW;
            const isHovered = hovered === row.status;

            return (
              <g
                key={row.status}
                onMouseEnter={() => setHovered(row.status)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Hit target spanning the whole row, so the pointer does not
                    have to find an 18px bar — and so a zero-count row is still
                    hoverable. */}
                <rect
                  x={0}
                  y={y}
                  width={VIEW_W}
                  height={ROW_H}
                  fill="transparent"
                />

                <text
                  x={LABEL_W - 12}
                  y={y + ROW_H / 2 + 4}
                  textAnchor="end"
                  className={`text-[12px] font-light ${
                    isHovered ? "fill-foreground" : "fill-body-foreground"
                  }`}
                >
                  {STATUS_LABEL[row.status]}
                </text>

                {/* The track, so a zero-count status still reads as a row that
                    exists rather than as a missing one. */}
                <rect
                  x={LABEL_W}
                  y={y + (ROW_H - BAR_H) / 2}
                  width={trackW}
                  height={BAR_H}
                  rx={4}
                  className="fill-surface-raised"
                />

                {row.count > 0 ? (
                  <rect
                    x={LABEL_W}
                    y={y + (ROW_H - BAR_H) / 2}
                    width={Math.max(width, 4)}
                    height={BAR_H}
                    rx={4}
                    className={`${STATUS_FILL[row.status]} ${
                      isHovered ? "opacity-100" : "opacity-80"
                    }`}
                  />
                ) : null}

                <text
                  x={VIEW_W}
                  y={y + ROW_H / 2 + 4}
                  textAnchor="end"
                  className="fill-foreground text-[12px] font-light tabular-nums"
                >
                  {row.count}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </ChartFigure>
  );
}
