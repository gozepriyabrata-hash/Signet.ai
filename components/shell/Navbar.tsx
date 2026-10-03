import Link from "next/link";

import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { SITE_NAME } from "@/lib/site";

/**
 * The workspace navbar. Server Component — no client leaves.
 *
 * The logo links to /dashboard, not to /. Once a user is in the workspace, the
 * landing page is not a destination — and crossing back would be a full page
 * load across root layouts anyway.
 *
 * The quick light/dark toggle that used to sit on the right is gone
 * (specs/015-dashboard-redesign.md §17) — `ProfileMenu`'s "Theme" swatches
 * are now the only theme control, so a second one here was a duplicate
 * surface for the same setting, and one that could not represent all three
 * themes besides.
 *
 * The account menu sits on the right, moved up from the sidebar footer by
 * direct instruction.
 */
export function Navbar({ accountName }: { accountName: string | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-(--nav-height) items-center justify-between px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="text-base font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {SITE_NAME}
        </Link>
        <ProfileMenu name={accountName} />
      </div>
    </header>
  );
}
