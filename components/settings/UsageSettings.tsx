"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsage } from "@/hooks/use-settings";
import { formatDate } from "@/lib/utils";
import type { Usage } from "@/types";

/**
 * `/settings/usage` — the one section with no controls at all.
 *
 * ── A settings section with no settings is the correct shape here ───────────
 * specs/008 §3.5: this section answers "what have I used", and the answer is
 * not editable. A control that changed a quota would be a billing action, and
 * this product has no billing. Adding one would be inventing a relationship
 * that does not exist.
 *
 * It is worth stating because a section with nothing to click looks like an
 * oversight, and the next person to open this file will otherwise add a button.
 *
 * ── The meters are not charts ───────────────────────────────────────────────
 * A ratio against a limit is a meter, not a bar chart of one value — the same
 * form reasoning spec 006 §3.8 applied when it made five of seven analytics
 * figures stat tiles rather than plots. `--foreground` fills them: usage is not
 * a job outcome, so semantic colour would be saying something the design system
 * reserves for something else.
 */
export function UsageSettings() {
  const { data, isPending, isError, error, refetch } = useUsage();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">
          Usage
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          What this workspace has used this period. Nothing here is editable —
          changing a quota is a billing action, and there is no billing to act
          on.
        </p>
      </div>

      {isPending ? (
        <div aria-busy="true" aria-label="Loading usage" className="space-y-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
          <p className="text-base font-normal text-foreground">
            Could not load your usage.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
            {formatDate(data.periodStart)} — {formatDate(data.periodEnd)}
          </p>

          <Meter
            label="Videos generated"
            used={data.videosGenerated}
            limit={data.videoQuota}
          />
          <Meter
            label="Emails sent"
            used={data.emailsSent}
            limit={data.emailQuota}
          />

          <div className="rounded-xs border border-border bg-surface p-6">
            <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
              Spend this period
            </p>
            <p className="mt-3 text-5xl font-light tabular-nums tracking-tight text-foreground">
              {formatMoney(data)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/** Minor units in, formatted money out. No floating-point arithmetic on money
 *  at any point — the type stores minor units for exactly that reason. */
function formatMoney({ spendMinorUnits, currency }: Usage): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(spendMinorUnits / 100);
}

function Meter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="rounded-xs border border-border bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
          {label}
        </p>
        <p className="text-sm font-light tabular-nums text-body-foreground">
          {used.toLocaleString("en-GB")} of {limit.toLocaleString("en-GB")}
        </p>
      </div>

      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={label}
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
      >
        {/* Neutral ink. Usage is not a job outcome, and --success/--danger are
            reserved for those (docs/design-system.md §1). */}
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
