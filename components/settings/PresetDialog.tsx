"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PresetInput } from "@/lib/api/types";
import type { Preset } from "@/types";

/**
 * Create and edit, on the native `<dialog>` spec 007 vendored.
 *
 * Keyed on `preset?.id` by its caller so the form is seeded from props at mount
 * rather than reset in an effect — the same shape spec 007's RecipientStep
 * settled on after the linter objected to setState-in-effect.
 *
 * Unlike the send confirmation, `autoFocus` goes on the FIRST FIELD rather than
 * on the way out. That dialog guarded an irreversible outward-facing action and
 * wanted Enter to do nothing; this one is a form, and a user who opened it
 * means to type.
 */
export function PresetDialog({
  open,
  title,
  preset,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean;
  title: string;
  preset?: Preset;
  onClose: () => void;
  onSubmit: (input: PresetInput) => void;
  isSubmitting?: boolean;
}) {
  if (!open) return null;
  return (
    <PresetForm
      key={preset?.id ?? "new"}
      title={title}
      preset={preset}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

function PresetForm({
  title,
  preset,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  title: string;
  preset?: Preset;
  onClose: () => void;
  onSubmit: (input: PresetInput) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(preset?.name ?? "");
  const [description, setDescription] = useState(preset?.description ?? "");

  const valid = name.trim() !== "";

  return (
    <Dialog open onClose={onClose} title={title}>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          onSubmit({ name: name.trim(), description: description.trim() || undefined });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="preset-name">Name</Label>
          <Input
            id="preset-name"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!valid}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preset-description">
            Description
            <span className="text-muted-foreground"> · optional</span>
          </Label>
          <Textarea
            id="preset-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
