"use client";

import { useState } from "react";

import { PresetList } from "@/components/settings/PresetList";
import { UploadPanel } from "@/components/settings/UploadPanel";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * `/settings/voice` — voices, and the one upload in this product that asks
 * before it happens.
 *
 * ── Why cloning confirms, and the other uploads do not ──────────────────────
 * specs/008 §3.10: cloning a voice is the most personal thing this product
 * does, and it is the one upload where the person providing the sample and the
 * person clicking may not be the same. A custom avatar is a picture of someone
 * who chose to be in a video; a cloned voice can be made to say anything.
 *
 * The confirmation asks for the name of the person in the recording. That is
 * the point rather than a form field: someone who cannot say whose voice it is
 * should not be cloning it. It is a different job from the send confirmation,
 * which guards an irreversible outward action — this one guards a claim about
 * consent.
 */
export function VoiceSettings() {
  const [pending, setPending] = useState<File | null>(null);
  const [subject, setSubject] = useState("");

  const close = () => {
    setPending(null);
    setSubject("");
  };

  return (
    <PresetList
      kind="voice"
      title="Voices"
      description="How the avatar sounds. The Video step chooses between these; it cannot create one."
      createLabel="New voice"
      emptyDescription="Voices are what your videos are narrated with. Add one and it becomes selectable in the Video step."
    >
      <UploadPanel
        title="Clone a voice"
        blurb="Upload a clear sample of at least thirty seconds. WAV, MP3 or M4A, up to 25MB."
        buttonLabel="Choose a sample"
        accepted={{
          types: ["audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"],
          extensions: [".wav", ".mp3", ".m4a"],
          label: "an audio file",
          maxBytes: 25 * 1024 * 1024,
          maxLabel: "25MB",
        }}
        onAccepted={(file) => {
          setSubject("");
          setPending(file);
        }}
      />

      <Dialog
        open={pending !== null}
        onClose={close}
        title="Whose voice is this?"
        description="Cloning uploads the sample and builds a voice from it. Only do this for a voice you have permission to use."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="voice-subject">
              Name of the person in the recording
            </Label>
            <Input
              id="voice-subject"
              autoFocus
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {pending?.name} would be uploaded. Building the voice needs the
            generation backend, so nothing leaves this browser yet.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={subject.trim() === ""} onClick={close}>
              Clone this voice
            </Button>
          </div>
        </div>
      </Dialog>
    </PresetList>
  );
}
