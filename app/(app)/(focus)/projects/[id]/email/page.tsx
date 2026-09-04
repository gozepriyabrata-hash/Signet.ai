import type { Metadata } from "next";

import { EmailStep } from "@/components/workflow/steps/EmailStep";

export const metadata: Metadata = { title: "Email" };

/** Step route. The screen itself is a client component — the whole workflow
 *  reads browser-resident state (specs/003 §3.3) — and the stepper above it
 *  comes from the (focus) layout. */
export default async function EmailStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmailStep projectId={id} />;
}
