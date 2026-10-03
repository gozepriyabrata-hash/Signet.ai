import type { Metadata } from "next";

import { AvatarStep } from "@/components/workflow/steps/AvatarStep";

export const metadata: Metadata = { title: "Avatar" };

/** Step route. The screen itself is a client component — the whole workflow
 *  reads browser-resident state (specs/003 §3.3) — and the stepper above it
 *  comes from the (focus) layout. */
export default async function AvatarStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AvatarStep projectId={id} />;
}
