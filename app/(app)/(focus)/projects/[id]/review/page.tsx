import type { Metadata } from "next";

import { ReviewStep } from "@/components/workflow/steps/ReviewStep";

export const metadata: Metadata = { title: "Review" };

/** Step route. The screen itself is a client component — the whole workflow
 *  reads browser-resident state (specs/003 §3.3) — and the stepper above it
 *  comes from the (focus) layout. */
export default async function ReviewStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewStep projectId={id} />;
}
