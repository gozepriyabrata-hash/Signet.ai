import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard metric tile — docs/design-system.md §5.
 *
 * Large thin tabular numeral with a muted label above. `rounded-xs`, hairline.
 * No sparkline unless the data is real, and no gradients.
 */
export function StatCard({
  label,
  value,
  delta,
  href,
}: {
  label: string;
  value: string | number;
  delta?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm font-light tracking-[0.01em] text-body-foreground">
        {label}
      </p>
      <p className="mt-3 text-5xl font-light tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {delta ? (
        <p className="mt-2 text-sm font-light text-body-foreground">{delta}</p>
      ) : null}
    </>
  );

  const className =
    "block rounded-xs border border-border bg-surface p-6 transition-colors duration-150 ease-out";

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground`}
      >
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

/**
 * The loading state, kept beside the component it stands in for so the two
 * cannot drift apart. Dimensions match the real tile — same padding, same
 * label and numeral heights — so nothing shifts when the value lands.
 */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xs border border-border bg-surface p-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="mt-3 h-12 w-20" />
    </div>
  );
}
