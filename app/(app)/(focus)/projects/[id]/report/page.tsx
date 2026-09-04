import type { Metadata } from "next";

import { ReportStep } from "@/components/workflow/steps/ReportStep";

export const metadata: Metadata = { title: "Report" };

/** Step route. The screen itself is a client component — the whole workflow
 *  reads browser-resident state (specs/003 §3.3) — and the stepper above it
 *  comes from the (focus) layout. */
export default async function ReportStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportStep projectId={id} />;
}
