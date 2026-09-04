import { Button } from "@/components/ui/button";

/**
 * The frame every workflow step renders inside.
 *
 * Guarantees an identical title block, max-width and footer, so six screens
 * built at six different times cannot drift into six slightly different
 * layouts. **Individual steps never render their own footer buttons** — the
 * moment one does, Back and Next start moving between steps.
 *
 * Back is a ghost pill on the left, Next a bone-white `--primary` pill on the
 * right (docs/design-system.md §5). Never tint the primary action: the action
 * layer is monochrome, and `--accent` here would read as "AI is acting" on a
 * button whose whole job is "I am done with this step".
 *
 * The footer is sticky rather than pinned to the page bottom. On the Analysis
 * and Email steps the content is taller than the viewport, and a Next the user
 * has to scroll to find is a Next they will hunt for on every project.
 */
export function StepShell({
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  isSubmitting = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
}) {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-10 pb-32 lg:px-8">
      <div>
        <h1 className="text-4xl font-light tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[68ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div className="mt-10">{children}</div>

      {onBack || onNext ? (
        <div className="sticky bottom-0 mt-12 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {onBack ? (
              <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
                ← Back
              </Button>
            ) : (
              <span />
            )}

            {onNext ? (
              <Button
                onClick={onNext}
                disabled={nextDisabled || isSubmitting}
                aria-disabled={nextDisabled || isSubmitting}
              >
                {isSubmitting ? "Working…" : `${nextLabel} →`}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
