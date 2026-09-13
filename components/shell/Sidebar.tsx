import {
  BarChart3,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { SidebarToggle } from "@/components/shell/SidebarToggle";
import { NewProjectButton } from "@/components/shared/NewProjectButton";

/**
 * The workspace sidebar. Server Component; the collapse toggle and the
 * account menu (`ProfileMenu`) are the client leaves.
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
 * Settings is deliberately not one of the footer links (specs/015 §13) — it
 * moved to the third item of the dashboard hero's "+" menu
 * (`components/dashboard/DashboardHeader.tsx`). The footer's own sign-out
 * icon moved too (specs/015 §15): it is now inside `ProfileMenu`, alongside
 * the theme picker, behind one avatar + name trigger. The footer keeps only
 * that and the collapse toggle.
 *
 * `accountName` arrives as a prop, read by `ShellLayout`
 * (`app/(app)/(shell)/layout.tsx`) via `getCurrentAccount()`, the same shape
 * `DashboardHeader` already uses — not read here directly. Two reasons: this
 * component is unit-tested with a synchronous `render()`, which cannot
 * execute an `async` Server Component the way Next's own renderer can; and
 * keeping the DB read at the layout is one call, not one per leaf, dressed up
 * as a `cache()` memoisation. (That read now runs for every `(shell)` route,
 * not just `/dashboard` — see `ShellLayout`'s own comment for why that
 * tradeoff is a direct consequence of the sidebar showing a real name on
 * every page, not an oversight.)
 *
 * Width comes from --sidebar-width, which the pre-paint script in the root
 * layout has already resolved. The active route is *documented* as a neutral
 * filled background, never accent (docs/screens.md) — but no active-route
 * detection is actually wired up below (it would need `usePathname`, a
 * client hook, on what is otherwise a Server Component). That gap predates
 * specs/015-dashboard-redesign.md and is not this file's to close; ITEM_CLASS
 * below applies uniformly, pending that follow-up.
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

/** rounded-md, not rounded-xs: specs/015-dashboard-redesign.md §3.5's step up
 *  in visual weight, kept inside the "dense content" radius band
 *  (docs/design-system.md §3 — rounded-lg+ is floated/artwork only). */
const ITEM_CLASS =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** Hidden when the rail is collapsed, still readable by assistive tech. */
const LABEL_CLASS =
  "truncate group-data-[sidebar=collapsed]/shell:sr-only";

export function Sidebar({ accountName }: { accountName: string | null }) {
  return (
    <aside
      id="workspace-sidebar"
      className="hidden w-(--sidebar-width) shrink-0 border-r border-border transition-[width] duration-150 ease-out md:block"
    >
      <div className="sticky top-(--nav-height) flex h-[calc(100dvh-var(--nav-height))] flex-col justify-between overflow-hidden p-3">
        <nav aria-label="Workspace">
          {/* Second entry point to the same createProject mutation the
              dashboard's hero CTA calls — specs/015-dashboard-redesign.md
              §3.5. No new capability, and no store: identical to that CTA's
              own "no query behind it" treatment. */}
          <div className="mb-3 group-data-[sidebar=collapsed]/shell:hidden">
            <NewProjectButton label="New Project" variant="outline" />
          </div>

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

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <ProfileMenu name={accountName} />
          <div className="group-data-[sidebar=collapsed]/shell:flex group-data-[sidebar=collapsed]/shell:justify-center">
            <SidebarToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
