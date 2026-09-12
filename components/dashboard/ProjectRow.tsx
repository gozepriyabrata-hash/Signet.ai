import Link from "next/link";

import { formatDate } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types";

/**
 * One row in the recent-projects list.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Renders `Project.name` and `Project.status` and NOTHING ELSE.
 *
 * `Project.recipient` is client PII (CLAUDE.md rule 11). Do not add the
 * recipient's name, company or email to this row, however helpful it would
 * look, and do not put any recipient field into the href. A "recent activity"
 * list is the single most natural place for that to creep in.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * The date is absolute (`formatDate`), not relative ("2 hours ago"). `lib/utils.ts`
 * already ruled this out — a relative label is a `Date.now()` read wearing a
 * timestamp's clothes, and it goes silently stale on any tab left open
 * (specs/003-dashboard.md §2.3, specs/015-dashboard-redesign.md §3.3).
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

/** The action a row offers depends on where the project has got to. */
function actionLabel(status: ProjectStatus): string {
  if (status === "ready_for_review") return "Review";
  if (status === "sent") return "View";
  return "Open";
}

export function ProjectRow({ project }: { project: Project }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-normal text-foreground">
          {project.name}
        </p>
        <p
          className={`mt-1 flex items-center gap-2 text-sm font-light tracking-[0.01em] ${STATUS_TONE[project.status]}`}
        >
          {STATUS_LABEL[project.status]}
          {/* body-foreground, not muted-foreground: this row sits inside a
              --surface card, where muted-foreground's 4.30:1 falls under the
              rule-10 floor (docs/design-system.md §1, "Contrast — two
              measured traps"). Same <time>/tabular-nums treatment as the
              /projects table's date column (components/projects/ProjectTableRow.tsx),
              which already renders this exact field. */}
          <span aria-hidden="true" className="text-body-foreground">
            ·
          </span>
          <time dateTime={project.updatedAt} className="tabular-nums text-body-foreground">
            {formatDate(project.updatedAt)}
          </time>
        </p>
      </div>

      {/* The accessible name carries the project via aria-label rather than an
          sr-only span. A visually hidden copy of the name would duplicate it as
          a second text node — which reads fine but makes the row ambiguous to
          query, and gives screen readers the title twice in a row. */}
      <Link
        href={`/projects/${project.id}`}
        aria-label={`${actionLabel(project.status)} ${project.name}`}
        className="shrink-0 rounded-full px-3 py-1.5 text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <span aria-hidden="true">{actionLabel(project.status)} →</span>
      </Link>
    </li>
  );
}
