import { StatCard } from "@/components/shared/StatCard";
import type { AnalyticsSummary } from "@/types";

/**
 * The hero figure and the four supporting tiles.
 *
 * Five of the seven figures on this screen are not charts, and that is the form
 * choice rather than a shortcut: a single current value is a stat tile and the
 * number a screen leads with is a hero figure — never a one-bar bar chart. The
 * type scale already specifies both (48px, weight 300, tabular numerals).
 *
 * ── Every number here is neutral ink, including the success rate ───────────
 * The first build tinted the success rate — green at 100%, `--danger` below
 * 90% — on the reasoning that a send is a job outcome. Looking at the screen
 * killed it: the seeded thirty-day window is 7 sent and 1 failed, so a healthy
 * demo landed on a red 88%, and the first instinct was to edit the fixtures
 * until the alarm stopped. That is fixing the evidence.
 *
 * A success RATE is not a job outcome, it is an aggregate of many, and
 * `docs/design-system.md` is explicit that semantic colour "means a job
 * succeeded — not 'this thing is good'". Tinting a ratio is exactly the
 * forbidden reading. The individual outcomes ARE coloured, on the `sent` and
 * `failed` bars in StatusBreakdown, where each bar is one.
 *
 * What tells a user something went wrong is the sentence under the hero
 * figure, which names the count rather than implying a verdict. `--accent`
 * appears nowhere on this screen either: nothing here is an AI action.
 * (Deviates from specs/006 §3.8; recorded in that spec's §8.)
 */

/** `—`, never `0%`. A zero success rate rendered from an absence reads as a
 *  catastrophe, which is why the seam types this field as nullable rather than
 *  defaulting it (specs/006 §4). */
function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "<1h";
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function MetricTiles({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xs border border-border bg-surface p-6">
        <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
          Packages sent
        </p>
        <p className="mt-3 text-[4.5rem] leading-[1.05] font-light tabular-nums tracking-[-0.022em] text-foreground">
          {summary.packagesSent}
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {summary.sendsFailed === 0
            ? "Every send in this period reached its recipient."
            : `${summary.sendsFailed} did not reach their recipient.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xs border border-border bg-surface p-6">
          <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
            Send success rate
          </p>
          <p className="mt-3 text-5xl font-light tabular-nums tracking-tight text-foreground">
            {formatRate(summary.successRate)}
          </p>
        </div>

        <StatCard
          label="Median time to send"
          value={formatHours(summary.medianHoursToSend)}
          delta="From creating the project"
        />
        <StatCard label="Videos generated" value={summary.videosGenerated} />
        <StatCard label="Emails sent" value={summary.emailsSent} />
      </div>
    </div>
  );
}

export function MetricTilesSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-[188px] rounded-xs border border-border bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-[140px] rounded-xs border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
