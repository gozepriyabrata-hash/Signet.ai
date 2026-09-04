import type { Metadata } from "next";

import { AnalysisStep } from "@/components/workflow/steps/AnalysisStep";

export const metadata: Metadata = { title: "Analysis" };

/** Step route. The screen itself is a client component — the whole workflow
 *  reads browser-resident state (specs/003 §3.3) — and the stepper above it
 *  comes from the (focus) layout. */
export default async function AnalysisStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnalysisStep projectId={id} />;
}
