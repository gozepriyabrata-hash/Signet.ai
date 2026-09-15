import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { getCurrentAccount } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New Chat" };

/**
 * The dashboard — specs/015-dashboard-redesign.md. Still `/dashboard` and
 * still this file; only the sidebar's label and the browser tab title read
 * "New Chat" now (`components/shell/Sidebar.tsx`), because this is the
 * landing screen after sign-in and its whole content is the hero prompt
 * card below, not a stats overview.
 *
 * `async` now, and dynamic (`ƒ`, not `○`) as a result: `getCurrentAccount()`
 * reads the session cookie to resolve the greeting's name. specs/003-dashboard.md
 * §3.4 named this as the expected moment for the route to go dynamic — "the
 * dashboard is expected to become dynamic the moment authentication exists."
 * That was scoped to this route only until specs/015-dashboard-redesign.md
 * §15 gave `Sidebar`'s footer a real account name too: `ShellLayout`
 * (`app/(app)/(shell)/layout.tsx`) now makes the same call for every
 * `(shell)` route, so this page's own call is a `cache()`-memoised repeat,
 * not a second query — see that layout's comment for the full reasoning.
 *
 * The greeting itself is rendered by `DashboardHeader`, a client component:
 * the account name is correct from this server-rendered prop on first paint,
 * but the time-of-day half is resolved client-side after mount, because the
 * server's clock/timezone is not the visitor's (see that component's comment).
 *
 * The stat tiles and Recent Projects list are deliberately not rendered here
 * any more — direct instructions, not a design-system inference. `StatRow`
 * and `RecentProjects` are unchanged and still exported; nothing else in the
 * app renders them, so they are dead code until either this page uses them
 * again or someone removes them outright. See specs/015-dashboard-redesign.md
 * §8, §9. `QuickActions`, the third component in that dead-code set, was
 * removed outright — it existed only to link to `/campaigns` and
 * `/analytics`, both gone from the workspace.
 *
 * No `loading.tsx` — it is a Suspense fallback for server work, and the one
 * server read here (`getCurrentAccount()`) resolves before the client
 * components below it ever need one (specs/003-dashboard.md §3.6).
 */
export default async function DashboardPage() {
  const account = await getCurrentAccount();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 lg:px-8">
      <DashboardHeader accountName={account?.name ?? null} />
    </div>
  );
}
