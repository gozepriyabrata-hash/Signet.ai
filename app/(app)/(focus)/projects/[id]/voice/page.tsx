import type { Metadata } from "next";

import { VoiceStep } from "@/components/workflow/steps/VoiceStep";

export const metadata: Metadata = { title: "Voice" };

/** Step route. The screen itself is a client component — the whole workflow
 *  reads browser-resident state (specs/003 §3.3) — and the stepper above it
 *  comes from the (focus) layout. */
export default async function VoiceStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VoiceStep projectId={id} />;
}
