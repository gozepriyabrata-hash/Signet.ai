import type { Metadata } from "next";

import { WorkspaceEntry } from "@/components/dashboard/WorkspaceEntry";

export const metadata: Metadata = { title: "Your Workspace" };

/**
 * `/dashboard` — still where sign-in, sign-up and the landing page's CTAs
 * land, but no longer a page of its own: `WorkspaceEntry` sends the user
 * straight into a project's workflow. `StatRow` and `RecentProjects` remain
 * un-rendered (specs/015-dashboard-redesign.md §8, §9).
 */
export default function DashboardPage() {
  return <WorkspaceEntry />;
}
