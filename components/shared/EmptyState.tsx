/**
 * Centred, muted, exactly one primary action — docs/design-system.md §5. Used
 * for the zero-project dashboard, no recipients, and no analytics data.
 *
 * `action` is a node rather than a `{ label, href }` pair. It started as the
 * pair, which forced every empty state's action to be a link; the projects list
 * needs a button that runs a mutation (see NewProjectButton), and an empty
 * state should not care which of the two it is holding.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xs border border-border bg-surface px-6 py-16 text-center">
      {icon ? (
        <div aria-hidden="true" className="mb-5 text-body-foreground">
          {icon}
        </div>
      ) : null}

      <h3 className="text-base font-normal text-foreground">{title}</h3>

      {/* --muted-foreground on --surface is 4.30:1 and fails the 4.5:1 floor,
          so secondary text inside a card steps up (docs/design-system.md §1). */}
      <p className="mt-2 max-w-[48ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
        {description}
      </p>

      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
