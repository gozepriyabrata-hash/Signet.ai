import { cn } from "@/lib/utils";

/**
 * Vendored from shadcn/ui and edited — not wrapped (CLAUDE.md rule 7).
 *
 * The `ai` variant is the one addition to the registry's set, and it is the
 * only place in this component where `--accent` appears. `--accent` means "AI
 * is doing something, or is about to" (docs/design-system.md §1), so it is
 * correct on the "AI generated" badge and wrong everywhere else — do not add a
 * variant that uses it for emphasis.
 *
 * `rounded-full`: the pill is the signature shape, and a badge is a pill.
 */
function Badge({
  className,
  variant = "neutral",
  ...props
}: React.ComponentProps<"span"> & { variant?: "neutral" | "ai" | "success" | "danger" }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-light whitespace-nowrap",
        variant === "neutral" && "border-border bg-surface text-body-foreground",
        variant === "ai" && "border-accent/40 bg-surface text-accent",
        variant === "success" && "border-success/40 bg-surface text-success",
        variant === "danger" && "border-danger/40 bg-surface text-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
