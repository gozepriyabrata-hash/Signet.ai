import { Navbar } from "@/components/shell/Navbar";
import { getCurrentAccount } from "@/lib/auth/dal";

/**
 * The workspace chrome — the navbar. The sidebar was removed by direct
 * instruction; New Chat is the logo link to /dashboard now.
 *
 * This is NOT a root layout. `app/(app)/layout.tsx` above it owns <html>,
 * <body>, the font and the providers; this group owns only the chrome, so that
 * the `(focus)` group beside it can render workflow routes without it.
 * See specs/003-dashboard.md §3.1.
 *
 * `async` for `getCurrentAccount()` — the navbar's account menu shows the
 * signed-in name on every `(shell)` route, which makes every one of them
 * dynamic (specs/015-dashboard-redesign.md §15). The read is memoised with
 * React's `cache()`, so `dashboard/page.tsx`'s own call is the same read.
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

      <Navbar accountName={account?.name ?? null} />

      <main id="workspace-main">{children}</main>
    </>
  );
}
