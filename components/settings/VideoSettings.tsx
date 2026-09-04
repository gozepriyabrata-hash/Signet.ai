"use client";

import { PresetList } from "@/components/settings/PresetList";

/**
 * `/settings/video` — templates and branding, two preset kinds on one screen.
 *
 * Branding lives here and NOWHERE in the workflow. `types/domain.ts` says it is
 * "applied from the active brand preset, not chosen here", and the Video step
 * renders it as a read-only line for exactly that reason: a branding picker
 * there would be a sixth control and rule 1 would have started sliding.
 *
 * Two `PresetList`s rather than one component with a tab bar. A section holding
 * two kinds is still two lists; giving it a bespoke shell is how nine screens
 * stop being variations of one screen (specs/008 §3.1).
 */
export function VideoSettings() {
  return (
    <div className="space-y-12">
      <PresetList
        kind="videoTemplate"
        title="Video templates"
        description="Layout, captions and framing. The Video step picks a format; the template is what that format renders into."
        createLabel="New template"
        emptyDescription="Templates decide how the avatar and captions are arranged in the frame."
      />

      <PresetList
        kind="branding"
        title="Branding"
        description="Applied automatically to every video. The Video step shows which brand is active and cannot change it — that is deliberate."
        createLabel="New brand"
        emptyDescription="A brand is the logo, colours and end-card applied to every video you generate."
      />
    </div>
  );
}
