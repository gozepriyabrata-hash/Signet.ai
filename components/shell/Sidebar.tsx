import {
  BarChart3,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { SidebarToggle } from "@/components/shell/SidebarToggle";
import { SignOutButton } from "@/components/shell/SignOutButton";

/**
 * The workspace sidebar. Server Component; only the collapse toggle is client.
 *
 * Destinations are the ones specs/001 resolved to real routes. Templates,
 * Reports and Videos were deliberately not built — Templates because video and
 * email templates already live under Settings and a second configuration
 * surface violates rule 1, the other two because everything is reachable
 * through a Project.
 *
 * Collapsed, this shows icons only — docs/screens.md specifies "collapses to
 * icons", and a collapsed rail of truncated words ("D…", "P…") is not that.
 * The label stays in the DOM and is hidden with `sr-only`, so the link keeps
 * its accessible name at both widths and no `aria-label` has to be maintained
 * in parallel with the visible text.
 *
 * Width comes from --sidebar-width, which the pre-paint script in the root
 * layout has already resolved. The active route is marked with a neutral
 * filled background, never accent (docs/screens.md).
 */
const DESTINATIONS: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const ITEM_CLASS =
  "flex items-center gap-3 rounded-xs px-3 py-2 text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** Hidden when the rail is collapsed, still readable by assistive tech. */
const LABEL_CLASS =
  "truncate group-data-[sidebar=collapsed]/shell:sr-only";

export function Sidebar() {
  return (
    <aside
      id="workspace-sidebar"
      className="hidden w-(--sidebar-width) shrink-0 border-r border-border transition-[width] duration-150 ease-out md:block"
    >
      <div className="sticky top-(--nav-height) flex h-[calc(100dvh-var(--nav-height))] flex-col justify-between overflow-hidden p-3">
        <nav aria-label="Workspace">
          <ul className="space-y-1">
            {DESTINATIONS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={ITEM_CLASS}>
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className={LABEL_CLASS}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3 group-data-[sidebar=collapsed]/shell:flex-col">
          <Link href="/settings" className={ITEM_CLASS}>
            <Settings aria-hidden="true" className="size-4 shrink-0" />
            <span className={LABEL_CLASS}>Settings</span>
          </Link>
          <SidebarToggle />
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
