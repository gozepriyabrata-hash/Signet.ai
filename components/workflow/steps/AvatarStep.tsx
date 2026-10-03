"use client";

import { AvatarSettings } from "@/components/settings/AvatarSettings";
import { PresetChoiceStep } from "@/components/workflow/steps/PresetChoiceStep";

export function AvatarStep({ projectId }: { projectId: string }) {
  return (
    <PresetChoiceStep
      projectId={projectId}
      kind="avatar"
      field="avatarId"
      title="Choose the avatar"
      description="Who appears in this video."
      label="Avatar"
      next="report"
    >
      <AvatarSettings />
    </PresetChoiceStep>
  );
}
