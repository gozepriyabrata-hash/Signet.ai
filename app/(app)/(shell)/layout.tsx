import { Navbar } from "@/components/shell/Navbar";
import { Sidebar } from "@/components/shell/Sidebar";

/**
 * The workspace chrome — navbar and collapsible sidebar.
 *
 * This is NOT a root layout. `app/(app)/layout.tsx` above it owns <html>,
 * <body>, the font and the providers; this group owns only the chrome, so that
 * the `(focus)` group beside it can render workflow routes with no sidebar at
 * all rather than hiding one conditionally. See specs/003-dashboard.md §3.1.
 *
 * Server Component. Only the theme switch and the sidebar toggle are client.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Sidebar />
        <main id="workspace-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </>
  );
}
