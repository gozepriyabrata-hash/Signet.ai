import type { Metadata } from "next";

import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { StatRow } from "@/components/dashboard/StatRow";
import { NewProjectButton } from "@/components/shared/NewProjectButton";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The dashboard.
 *
 * A Server Component that touches no runtime API, so the page prerenders a
 * static shell and the two client children fetch after hydration. There is
 * deliberately no `dynamic = "error"` guard here, unlike the landing page: this
 * route is expected to become dynamic the moment authentication exists, and a
 * guard that gets removed one spec later teaches the next reader that the guard
 * is negotiable (specs/003-dashboard.md §3.4).
 *
 * No greeting. docs/screens.md opens this page with "Good morning, {name}", and
 * neither half can be rendered: there is no name until auth exists, and the
 * time of day would be evaluated once at build in a prerendered component, so
 * every visitor would be told good morning (§3.10).
 *
 * No `loading.tsx` either — it is a Suspense fallback for server work, and
 * there is none here, so it would flash for ~0ms before the real skeletons
 * appear (§3.6).
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            Create personalised client communications.
          </p>
        </div>

        <NewProjectButton />
      </div>

      <StatRow />
      <RecentProjects />
    </div>
  );
}
