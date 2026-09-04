import Link from "next/link";

import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { SITE_NAME } from "@/lib/site";

/**
 * The workspace navbar. Server Component; only the theme switch is client.
 *
 * The logo links to /dashboard, not to /. Once a user is in the workspace, the
 * landing page is not a destination — and crossing back would be a full page
 * load across root layouts anyway.
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-(--nav-height) items-center justify-between gap-4 px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-base font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {SITE_NAME}
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
