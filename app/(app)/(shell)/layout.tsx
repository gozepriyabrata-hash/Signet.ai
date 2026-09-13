import { Navbar } from "@/components/shell/Navbar";
import { Sidebar } from "@/components/shell/Sidebar";
import { getCurrentAccount } from "@/lib/auth/dal";

/**
 * The workspace chrome — navbar and collapsible sidebar.
 *
 * This is NOT a root layout. `app/(app)/layout.tsx` above it owns <html>,
 * <body>, the font and the providers; this group owns only the chrome, so that
 * the `(focus)` group beside it can render workflow routes with no sidebar at
 * all rather than hiding one conditionally. See specs/003-dashboard.md §3.1.
 *
 * `async` now, for `getCurrentAccount()` — `Sidebar`'s footer shows the
 * signed-in account's real name (specs/015-dashboard-redesign.md §15), and
 * `Sidebar` renders here, once, for every `(shell)` route. Until §15,
 * `dashboard/page.tsx` was the only place in the shell that read the session
 * and went dynamic as a result; that read now happens here instead, which
 * means every `(shell)` route is dynamic, not just `/dashboard`. That is a
 * direct, accepted consequence of a real name on every page rather than an
 * oversight — see §15 for the full reasoning. `getCurrentAccount` is wrapped
 * in React's `cache()` (`lib/auth/dal.ts`), so `dashboard/page.tsx`'s own
 * call for `DashboardHeader`'s greeting is still the same one memoised read,
 * not a second query.
 *
 * Server Component. Only the theme switch, the sidebar toggle and the
 * account menu are client.
 */
export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getCurrentAccount();

  return (
    <>
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-light focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <Navbar />

      <div className="flex">
        <Sidebar accountName={account?.name ?? null} />
        <main id="workspace-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </>
  );
}
