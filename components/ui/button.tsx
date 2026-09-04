import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * Vendored from shadcn/ui and edited — not wrapped (CLAUDE.md rule 7).
 *
 * What changed from the registry source, and why. Every one of these would have
 * compiled and rendered untouched; none would have thrown.
 *
 *  1. `bg-accent` / `text-accent-foreground` → `bg-surface-raised` /
 *     `text-foreground`. shadcn uses `accent` as a neutral hover background;
 *     this design system reserves --accent for "AI is acting". Left alone, an
 *     ordinary ghost-button hover would have painted AI-blue.
 *  2. Every `dark:` utility removed. app/globals.css configures a `light`
 *     custom variant and no `dark` one, so Tailwind's built-in `dark:` falls
 *     back to prefers-color-scheme and would fire off the OS setting,
 *     independently of our `.light` class.
 *  3. `rounded-md` → `rounded-full`. The pill is the signature interactive
 *     shape; 8px radii on dense content are the documented way this system
 *     gets diluted.
 *  4. `font-medium` → `font-light`. The type scale tops out at 400.
 *  5. `--destructive` → `--danger`, `--secondary` → `--surface`,
 *     `--input`/`--ring` → `--border`.
 *  6. Focus ring matches the rest of the app: a visible outline, not a ring.
 *  7. `Slot` imported from @radix-ui/react-slot rather than pulling the whole
 *     `radix-ui` package for one primitive.
 *
 * `--primary` / `--primary-foreground` needed no remap: shadcn's meaning and
 * ours coincide, and a bone-white pill on near-black is already the intent.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-light whitespace-nowrap transition-all outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        danger: "bg-danger text-foreground hover:opacity-90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-surface",
        secondary: "bg-surface text-foreground hover:bg-surface-raised",
        ghost: "text-foreground hover:bg-surface",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-10 px-6 has-[>svg]:px-5",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
