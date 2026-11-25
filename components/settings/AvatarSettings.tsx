"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PresetList } from "@/components/settings/PresetList";
import { UploadPanel } from "@/components/settings/UploadPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";

export function AvatarSettings({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const [prompt, setPrompt] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: (preset) => {
      void queryClient.invalidateQueries({ queryKey: qk.presets("avatar") });
      if (projectId) {
        patchDraft(projectId, { avatarId: preset.id });
      }
      setStatusMessage(`Avatar "${preset.name}" uploaded and set as active avatar!`);
    },
    onError: (err: unknown) => {
      const errorObj = err as { detail?: string; message?: string };
      setStatusMessage(`Upload failed: ${errorObj?.detail || errorObj?.message || "Server error"}`);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (promptText: string) => api.generateAvatar(promptText),
    onSuccess: (preset) => {
      void queryClient.invalidateQueries({ queryKey: qk.presets("avatar") });
      if (projectId) {
        patchDraft(projectId, { avatarId: preset.id });
      }
      setPrompt("");
      setStatusMessage(`Avatar "${preset.name}" generated with inclusionai/ling-3.2-flash:free!`);
    },
    onError: (err: unknown) => {
      const errorObj = err as { detail?: string; message?: string };
      setStatusMessage(`Generation failed: ${errorObj?.detail || errorObj?.message || "Server error"}`);
    },
  });

  return (
    <PresetList
      kind="avatar"
      title="Avatars"
      description="Who appears in the video. Choose one for this project or add a custom avatar below."
      createLabel="New avatar"
      emptyDescription="Avatars are the faces your videos are recorded with. Add one and it becomes selectable in the Video step."
    >
      <div className="space-y-6">
        {statusMessage ? (
          <div className="rounded-xs border border-accent/40 bg-accent/10 px-4 py-2.5 text-xs font-light text-foreground">
            {statusMessage}
          </div>
        ) : null}

        {/* 1. Image to Avatar: Upload Portrait */}
        <UploadPanel
          title="Upload portrait (Image-to-Avatar)"
          blurb="Upload a portrait photo to build a custom avatar with inclusionai/ling-3.2-flash:free. PNG, JPEG or WebP, up to 8MB."
          buttonLabel={uploadMutation.isPending ? "Analyzing & uploading..." : "Choose an image"}
          accepted={{
            types: ["image/png", "image/jpeg", "image/webp"],
            extensions: [".png", ".jpg", ".jpeg", ".webp"],
            label: "an image",
            maxBytes: 8 * 1024 * 1024,
            maxLabel: "8MB",
          }}
          onAccepted={(file) => {
            setStatusMessage(`Uploading "${file.name}" and analyzing with AI...`);
            uploadMutation.mutate(file);
          }}
          note={(name) =>
            uploadMutation.isPending
              ? `Processing "${name}" with inclusionai/ling-3.2-flash:free...`
              : `Selected: ${name}`
          }
        />

        {/* 2. Text to Avatar: Prompt Generator */}
        <div className="rounded-xs border border-border bg-surface p-6">
          <p className="text-base font-normal text-foreground">Generate avatar (Text-to-Avatar)</p>
          <p className="mt-2 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            Describe the presenter persona you want to create using{" "}
            <span className="font-mono text-xs text-foreground">inclusionai/ling-3.2-flash:free</span>.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Priyabrata Goze, sharp modern executive with studio lighting"
              className="flex-1 text-sm font-light"
              disabled={generateMutation.isPending}
            />
            <Button
              type="button"
              disabled={generateMutation.isPending || !prompt.trim()}
              onClick={() => {
                setStatusMessage("Generating avatar with inclusionai/ling-3.2-flash:free...");
                generateMutation.mutate(prompt.trim());
              }}
            >
              {generateMutation.isPending ? "Generating..." : "Generate avatar"}
            </Button>
          </div>
        </div>
      </div>
    </PresetList>
  );
}
