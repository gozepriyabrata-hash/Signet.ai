"use client";

import { VoiceSettings } from "@/components/settings/VoiceSettings";
import { PresetChoiceStep } from "@/components/workflow/steps/PresetChoiceStep";

export function VoiceStep({ projectId }: { projectId: string }) {
  return (
    <PresetChoiceStep
      projectId={projectId}
      kind="voice"
      field="voiceId"
      title="Choose the voice"
      description="How the avatar sounds in this video."
      label="Voice"
      back="report"
      next="recipient"
    >
      <VoiceSettings />
    </PresetChoiceStep>
  );
}
