import Link from "next/link";

import { formatDate } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types";

/**
 * One row of the projects table.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Renders `Project.name`, `Project.status` and `Project.updatedAt`. Nothing
 * else.
 *
 * `Project.recipient` is client PII (CLAUDE.md rule 11). Do not add a
 * "Recipient" or "Client" column, however obviously useful it looks on a table
 * that already has room for one, and do not put any recipient field in the
 * href. The same warning is on components/dashboard/ProjectRow.tsx, because
 * this is the second of two places the temptation arises.
 * ────────────────────────────────────────────────────────────────────────────
 */

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  analysing: "Analysing",
  video_pending: "Generating video",
  email_pending: "Drafting email",
  ready_for_review: "Ready for review",
  sent: "Sent",
  failed: "Failed",
};

/** Semantic colour is reserved for job outcomes, not decoration
 *  (docs/design-system.md §1). Everything mid-flight stays neutral. */
const STATUS_TONE: Record<ProjectStatus, string> = {
  draft: "text-body-foreground",
  analysing: "text-body-foreground",
  video_pending: "text-body-foreground",
  email_pending: "text-body-foreground",
  ready_for_review: "text-foreground",
  sent: "text-success",
  failed: "text-danger",
};

function actionLabel(status: ProjectStatus): string {
  if (status === "ready_for_review") return "Review";
  if (status === "sent") return "View";
  return "Open";
}

export function ProjectTableRow({ project }: { project: Project }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-4">
        <span className="text-sm font-normal text-foreground">
          {project.name}
        </span>
      </td>

      <td className="px-4 py-4">
        <span
          className={`text-sm font-light tracking-[0.01em] ${STATUS_TONE[project.status]}`}
        >
          {STATUS_LABEL[project.status]}
        </span>
      </td>

      <td className="px-4 py-4">
        <time
          dateTime={project.updatedAt}
          className="text-sm font-light tabular-nums text-body-foreground"
        >
          {formatDate(project.updatedAt)}
        </time>
      </td>

      <td className="px-4 py-4 text-right">
        <Link
          href={`/projects/${project.id}`}
          aria-label={`${actionLabel(project.status)} ${project.name}`}
          className="inline-flex rounded-full px-3 py-1.5 text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span aria-hidden="true">{actionLabel(project.status)} →</span>
        </Link>
      </td>
    </tr>
  );
}
