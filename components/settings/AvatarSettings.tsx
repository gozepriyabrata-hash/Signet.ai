"use client";

import { PresetList } from "@/components/settings/PresetList";
import { UploadPanel } from "@/components/settings/UploadPanel";

/**
 * `/settings/avatar` — the first section built, and the one the other eight
 * were measured against.
 *
 * Everything here except the upload panel comes from `PresetList`. That held
 * for Voice, Video, AI and Email too, which is the evidence for specs/008
 * §3.1's claim that eight of the nine screens are the same screen — and the
 * reason rule 1's overflow has somewhere to go that stays navigable at
 * thirty-nine items.
 */
export function AvatarSettings() {
  return (
    <PresetList
      kind="avatar"
      title="Avatars"
      description="Who appears in the video. The Video step chooses between these; it cannot create one."
      createLabel="New avatar"
      emptyDescription="Avatars are the faces your videos are recorded with. Add one and it becomes selectable in the Video step."
    >
      <UploadPanel
        title="Custom avatar"
        blurb="Upload a portrait to have a custom avatar built from it. PNG, JPEG or WebP, up to 8MB."
        buttonLabel="Choose an image"
        accepted={{
          types: ["image/png", "image/jpeg", "image/webp"],
          extensions: [".png", ".jpg", ".jpeg", ".webp"],
          label: "an image",
          maxBytes: 8 * 1024 * 1024,
          maxLabel: "8MB",
        }}
        onAccepted={() => {}}
        note={(name) =>
          `${name} is ready. Building a custom avatar needs the generation backend, so nothing is uploaded yet.`
        }
      />
    </PresetList>
  );
}
