import { cn } from "@/lib/utils";

/**
 * A determinate progress bar, written rather than vendored.
 *
 * shadcn's Progress wraps @radix-ui/react-progress, which exists to manage
 * indeterminate state, transitions and the ARIA attributes. This app has no
 * indeterminate progress by rule — CLAUDE.md rule 5 says every job reports a
 * numeric progress, so a spinner-shaped bar is a bug rather than a variant —
 * and the three ARIA attributes are one line each.
 *
 * `--accent` is correct here and nowhere near a decorative bar: this fills
 * while an AI job runs, which is precisely what that token means.
 *
 * Width is animated rather than the mark, which contradicts
 * docs/design-system.md §4's "animate transform and opacity only" — a bar whose
 * fill is a scaled child would need a counter-scale on anything inside it, and
 * there is nothing inside it. The rule exists to keep animation off the layout
 * path; a 200ms width transition on a 6px bar is not that.
 */
function Progress({
  value,
  label,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
      data-slot="progress"
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-raised",
        className,
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
