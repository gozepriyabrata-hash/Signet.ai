import { BarChart3, FolderOpen, Megaphone, type LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * Three cards, each a real route — specs/015-dashboard-redesign.md §3.2.
 *
 * The wireframe this screen is modelled on has a fourth card, "Explore
 * templates." It is not here: specs/001-route-map.md §4 already dropped
 * `/templates` as a second configuration surface, which CLAUDE.md rule 1
 * forbids regardless of what links to it. No query, no store — these are
 * plain navigation, same treatment specs/003-dashboard.md §3.7 gave the
 * dashboard's status filter.
 *
 * Server Component: no interactivity here (CLAUDE.md rule 8).
 */

const ACTIONS: ReadonlyArray<{
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    href: "/projects",
    label: "Projects",
    description: "Browse every communication.",
    icon: FolderOpen,
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    description: "See what's been sent.",
    icon: Megaphone,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "See how it's performing.",
    icon: BarChart3,
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {ACTIONS.map(({ href, label, description, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="rounded-md border border-border bg-surface p-6 transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <Icon aria-hidden="true" className="size-4 shrink-0 text-body-foreground" />
          <p className="mt-4 text-base font-normal text-foreground">{label}</p>
          <p className="mt-1 text-sm font-light text-body-foreground">
            {description}
          </p>
        </Link>
      ))}
    </div>
  );
}
