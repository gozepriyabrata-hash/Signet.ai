import { cn } from "@/lib/utils";

/**
 * Vendored from shadcn/ui and edited — not wrapped (CLAUDE.md rule 7).
 *
 * The registry source is `bg-accent animate-pulse rounded-md`. Two changes:
 *
 *  1. `bg-accent` → `bg-surface-raised`. shadcn's `accent` is a neutral tint,
 *     but --accent here is the AI-action blue: dropped in untouched, every
 *     loading skeleton would render solid blue, which in this design system
 *     reads as "a job is running" — the exact wrong signal for a list that is
 *     merely fetching. It compiles; it is just wrong.
 *
 *     `--surface-raised` rather than `--surface`, which was the first attempt:
 *     skeletons sit inside `bg-surface` cards and tables, so a `bg-surface`
 *     skeleton is invisible against its own container. One step up the surface
 *     ramp is the whole point of having one.
 *  2. `rounded-md` → `rounded-xs`. Skeletons stand in for dense content, and
 *     dense content is 4px.
 *
 * The pulse is kept: it is a loading affordance, not the accent-glow
 * "generation pulse" reserved for JobProgressCard. Under
 * prefers-reduced-motion the global rule in app/globals.css collapses it.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-xs bg-surface-raised", className)}
      {...props}
    />
  );
}

export { Skeleton };
