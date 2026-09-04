"use client";

import { useState } from "react";

import { ChartFigure, ChartTooltip } from "@/components/analytics/ChartFigure";
import { formatDate } from "@/lib/utils";
import type { AnalyticsSummary } from "@/types";

/**
 * Packages sent over time — one series, one area.
 *
 * ── Why this is hand-written SVG ────────────────────────────────────────────
 * Rule 6 forbids hardcoded colour values, and every charting library is
 * configured with them: giving one this project's palette means either passing
 * `var(--…)` strings it was not designed to receive, or resolving computed
 * styles to hex, which is rule 6 defeated at one remove and breaks on the theme
 * switch. An inline `<path>` takes `fill-foreground` and `stroke-border` like
 * any other element, in both themes, from the same tokens (specs/006 §3.7).
 *
 * ── Why there is no legend and no series colour ─────────────────────────────
 * One series. The caption names it, so a legend would be a box explaining the
 * only thing on screen, and no categorical hue is needed — which is how this
 * screen ships without the design system having a categorical palette at all
 * (§3.8). `--accent` appears nowhere here: nothing on this screen is an AI
 * action.
 */

const VIEW_W = 720;
const VIEW_H = 220;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;

const PLOT_W = VIEW_W - PAD_L - PAD_R;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

/** A y-axis that ends on a round number. A max of 7 becomes 8, not 7, so the
 *  gridlines land on integers a reader can name. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function SentOverTimeChart({
  summary,
}: {
  summary: AnalyticsSummary;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const points = summary.sentOverTime;
  const unit = summary.bucket === "day" ? "day" : "week";
  const max = niceMax(Math.max(1, ...points.map((point) => point.count)));

  // A single bucket has no width to draw across, so it is pinned to the middle
  // rather than dividing by zero. It happens on a brand-new account.
  const xFor = (index: number) =>
    points.length === 1
      ? PAD_L + PLOT_W / 2
      : PAD_L + (index / (points.length - 1)) * PLOT_W;
  const yFor = (count: number) => PAD_T + PLOT_H - (count / max) * PLOT_H;

  const line = points
    .map((point, index) => `${xFor(index)},${yFor(point.count)}`)
    .join(" L ");
  const linePath = `M ${line}`;
  const areaPath = `${linePath} L ${xFor(points.length - 1)},${PAD_T + PLOT_H} L ${xFor(0)},${PAD_T + PLOT_H} Z`;

  const gridValues = [0, max / 2, max];
  const active = hovered === null ? null : points[hovered];

  return (
    <ChartFigure
      title="Packages sent over time"
      description={`One point per ${unit}, ${formatDate(summary.from)} to ${formatDate(summary.to)}.`}
      columns={[unit === "day" ? "Day" : "Week beginning", "Sent"]}
      rows={points.map((point) => ({
        label: formatDate(point.bucketStart),
        value: String(point.count),
      }))}
    >
      {(captionId) => (
        <div className="relative">
          {active ? (
            <ChartTooltip
              visible
              label={formatDate(active.bucketStart)}
              value={`${active.count} sent`}
              leftPct={(xFor(hovered ?? 0) / VIEW_W) * 100}
            />
          ) : null}

          <svg
            role="img"
            aria-labelledby={captionId}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-auto w-full"
          >
            {/* Recessive grid — border weight, never a series weight. */}
            {gridValues.map((value) => (
              <g key={value}>
                <line
                  x1={PAD_L}
                  x2={VIEW_W - PAD_R}
                  y1={yFor(value)}
                  y2={yFor(value)}
                  className="stroke-border"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={PAD_L - 8}
                  y={yFor(value) + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] font-light tabular-nums"
                >
                  {Math.round(value)}
                </text>
              </g>
            ))}

            <path d={areaPath} className="fill-foreground opacity-10" />
            <path
              d={linePath}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-foreground"
            />

            {/* Only the hovered point gets a marker. A dot on every point is
                noise on a twelve-week series. */}
            {hovered !== null ? (
              <circle
                cx={xFor(hovered)}
                cy={yFor(points[hovered].count)}
                r={4}
                className="fill-foreground"
              />
            ) : null}

            {/* First and last labels only — the rest would collide, and the
                disclosure table carries every value anyway. */}
            {points.length > 0 ? (
              <>
                <text
                  x={PAD_L}
                  y={VIEW_H - 8}
                  textAnchor="start"
                  className="fill-muted-foreground text-[11px] font-light"
                >
                  {formatDate(points[0].bucketStart)}
                </text>
                {points.length > 1 ? (
                  <text
                    x={VIEW_W - PAD_R}
                    y={VIEW_H - 8}
                    textAnchor="end"
                    className="fill-muted-foreground text-[11px] font-light"
                  >
                    {formatDate(points[points.length - 1].bucketStart)}
                  </text>
                ) : null}
              </>
            ) : null}

            {/* Invisible hit targets, one per bucket and wider than the mark.
                Mouse and focus only: the disclosure table is the keyboard and
                screen-reader path, so this layer is enhancement and its absence
                breaks nothing. */}
            {points.map((point, index) => {
              const width = PLOT_W / Math.max(points.length, 1);
              return (
                <rect
                  key={point.bucketStart}
                  x={xFor(index) - width / 2}
                  y={PAD_T}
                  width={width}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </svg>
        </div>
      )}
    </ChartFigure>
  );
}
