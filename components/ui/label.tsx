import { cn } from "@/lib/utils";

/**
 * A plain `<label>`, not shadcn's Radix wrapper.
 *
 * The registry version pulls in @radix-ui/react-label for one behaviour: the
 * label forwards clicks to its control. A native `<label htmlFor>` already does
 * that, in every browser, with no dependency — and this repo has twice chosen
 * the native control for the same reason (see ProjectsToolbar and RangePicker).
 * A package for a behaviour the platform ships is more surface than it removes.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-sm font-light tracking-[0.01em] text-body-foreground select-none",
        "peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
