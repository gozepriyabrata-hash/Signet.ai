import { cn } from "@/lib/utils";

/**
 * Vendored from shadcn/ui and edited — not wrapped (CLAUDE.md rule 7).
 *
 * What changed from the registry source:
 *
 *  1. Every `dark:` utility removed. app/globals.css configures a `light`
 *     custom variant and no `dark` one, so Tailwind's built-in `dark:` falls
 *     back to prefers-color-scheme and would fire off the OS setting,
 *     independently of our `.light` class. Same edit as button.tsx.
 *  2. `--input` / `--ring` → `--border`, `--destructive` → `--danger`, to match
 *     the tokens this system actually defines.
 *  3. `rounded-md` → `rounded-xs`. An input is dense content, which is the 4px
 *     band (docs/design-system.md §3).
 *  4. Focus ring is a visible outline, not a ring — the same treatment every
 *     other interactive element in this app uses.
 *  5. `font-light`, because the type scale tops out at 400 and body text is 300.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light text-foreground transition-colors duration-150 ease-out outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-danger",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-light file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
