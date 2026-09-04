import Link from "next/link";

import { formatDate } from "@/lib/utils";
import type { CommunicationPackage } from "@/types";

/**
 * One row of the campaigns table.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THIS ROW MAY SHOW A RECIPIENT. That is the opposite of the warning on
 * components/projects/ProjectTableRow.tsx and components/dashboard/ProjectRow.tsx,
 * so read the boundary rather than pattern-matching on either.
 *
 * `Recipient.name` and `Recipient.company` are rendered here on purpose: a sent-
 * mail history whose rows do not say who the mail went to is not a history of
 * anything (specs/005 §3.4). Rule 11 forbids logging recipient data, putting it
 * in a URL, and sending it to a third party — not showing a user their own
 * client.
 *
 * `Recipient.email` is NOT rendered here, and must not be added. A list is the
 * artefact that gets exported, screenshotted and pasted; a column of client
 * addresses is a mailing list one selection away from leaving the UI. The same
 * addresses one per page, behind a click, are a record. The detail page shows
 * the full address for exactly that reason.
 *
 * Nothing recipient-derived goes in the href. Both targets are opaque ids.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Where a row goes depends on whether the send worked.
 *
 * A failed package links to its project's Review step, not to the read-only
 * campaign detail. Rule 5 requires a failure to be recoverable in place, and
 * rule 2 puts the only Retry that may re-send on Review. Sending someone to a
 * detail page for a failure they can do nothing about satisfies the letter of
 * "no dead end" and none of its purpose (specs/005 §3.6).
 */
function rowTarget(pkg: CommunicationPackage): { href: string; label: string } {
  return pkg.status === "failed"
    ? { href: `/projects/${pkg.projectId}/review`, label: "Open in Review" }
    : { href: `/campaigns/${pkg.id}`, label: "View" };
}

export function CampaignRow({ pkg }: { pkg: CommunicationPackage }) {
  const { href, label } = rowTarget(pkg);
  const failed = pkg.status === "failed";

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-4">
        <span className="text-sm font-normal text-foreground">
          {pkg.email.subject}
        </span>
        {/* A send is a job outcome, which is the one thing semantic colour is
            reserved for (docs/design-system.md §1). It appears once per row and
            only on a failure. */}
        {failed ? (
          <span className="mt-1 block text-sm font-light tracking-[0.01em] text-danger">
            Send failed
          </span>
        ) : null}
      </td>

      <td className="px-4 py-4">
        <span className="text-sm font-light tracking-[0.01em] text-foreground">
          {pkg.recipient.name}
        </span>
        <span className="mt-1 block text-sm font-light tracking-[0.01em] text-body-foreground">
          {pkg.recipient.company}
        </span>
      </td>

      <td className="px-4 py-4">
        {pkg.sentAt ? (
          <time
            dateTime={pkg.sentAt}
            className="text-sm font-light tabular-nums text-body-foreground"
          >
            {formatDate(pkg.sentAt)}
          </time>
        ) : (
          <span className="text-sm font-light text-body-foreground">—</span>
        )}
      </td>

      <td className="px-4 py-4 text-right">
        <Link
          href={href}
          // The accessible name uses the subject, never the recipient: a screen
          // reader announcing "View, Jane Fairweather" reads client identity
          // aloud on every row of the list.
          aria-label={`${label}: ${pkg.email.subject}`}
          className="inline-flex rounded-full px-3 py-1.5 text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span aria-hidden="true">{label} →</span>
        </Link>
      </td>
    </tr>
  );
}
