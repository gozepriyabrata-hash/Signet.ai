import type { Metadata } from "next";

import { CampaignsTable } from "@/components/campaigns/CampaignsTable";

/**
 * A static title, never a generated one.
 *
 * `generateMetadata` is unreachable here anyway — it is Server-Components-only
 * and the package data lives in the browser — but the rule outlives that
 * constraint. A <title> is the browser history label, the tab text, the OS
 * window title and the default bookmark name, so a client's name in it reaches
 * more surfaces than the page it describes (specs/005 §3.7).
 */
export const metadata: Metadata = { title: "Campaigns" };

/**
 * The campaigns list — sent-package history.
 *
 * A Server Component with no runtime API, so the route prerenders and the table
 * hydrates into it. No <Suspense> boundary, unlike /projects: nothing here
 * calls `useSearchParams`, because specs/005 §3.9 gives the screen no URL
 * state. No `dynamic = "error"` guard either, for specs/003 §3.4's reason —
 * this route becomes dynamic when authentication lands.
 */
export default function CampaignsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 lg:px-8">
      <div>
        <h1 className="text-4xl font-light tracking-tight text-foreground">
          Campaigns
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          Every package that has been approved and sent, and who it went to.
        </p>
      </div>

      <CampaignsTable />
    </div>
  );
}
