import type { Metadata } from "next";

import { CampaignDetail } from "@/components/campaigns/CampaignDetail";

/** Static, and deliberately not the recipient's name — see the note on the
 *  campaigns list page and specs/005 §3.7. */
export const metadata: Metadata = { title: "Campaign" };

/**
 * One sent package, keyed by `CommunicationPackage.id` — NOT by project id
 * (specs/005 §3.2). The package is the thing that was sent, and a project that
 * one day produces a second package would silently break a project-keyed URL.
 *
 * The lookup itself happens in the browser; `CampaignDetail`'s header explains
 * why, and why `notFound()` is not available to it.
 */
export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignDetail packageId={id} />;
}
