import type { Metadata } from "next";

import { ProjectResumeRedirect } from "@/components/workflow/ProjectResumeRedirect";

export const metadata: Metadata = { title: "Opening project…" };

/**
 * `/projects/[id]` — redirect only, per specs/001 §3.
 *
 * It renders no workflow of its own. It resolves the project's `ProjectStatus`
 * to a step and replaces itself with `/projects/[id]/<step>`, which is what
 * makes "Open →" on the dashboard and the projects list a single link that
 * always lands a user where they left off.
 *
 * The resolve happens in the browser rather than here, and the reason is worth
 * reading before anyone "fixes" it into a server `redirect()`: see the header
 * of ProjectResumeRedirect.
 */
export default async function ProjectResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectResumeRedirect projectId={id} />;
}
