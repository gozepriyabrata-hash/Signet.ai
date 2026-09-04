import { cn } from "@/lib/utils";

/**
 * Vendored from shadcn/ui and edited — not wrapped (CLAUDE.md rule 7).
 * Same five edits as input.tsx; see that file's header for why each one.
 *
 * `field-sizing-content` is kept from the registry source: it lets the textarea
 * grow with its content, which matters here because the longest thing a user
 * edits in this product is an AI-written email body and a fixed four rows would
 * mean scrolling inside a box to read what you are about to send.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-24 w-full rounded-xs border border-border bg-surface px-3 py-2 text-sm font-light leading-relaxed tracking-[0.01em] text-foreground transition-colors duration-150 ease-out outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
