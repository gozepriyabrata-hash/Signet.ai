"use client";

import { PresetList } from "@/components/settings/PresetList";

/**
 * `/settings/ai` — script styles, and a note about what is not configurable.
 *
 * Personalisation level is deliberately NOT here. It varies per project — the
 * Recipient step sets it per recipient — and rule 1's mirror puts a value that
 * differs between two projects in the workflow rather than in Settings. This is
 * the first screen built since that clause was added to `CLAUDE.md`, and it is
 * the first place it would have been broken.
 */
export function AiSettings() {
  return (
    <PresetList
      kind="scriptStyle"
      title="Script styles"
      description="How the AI writes. The Video step chooses between these; the words it produces are always editable before anything is generated."
      createLabel="New style"
      emptyDescription="A style is a set of instructions for how scripts are written — sentence length, formality, how much it explains."
    >
      <div className="rounded-xs border border-border bg-surface p-6">
        <p className="text-base font-normal text-foreground">Guardrails</p>
        <p className="mt-2 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          Every generated string in this product is editable before it is used,
          and nothing is sent without a human approving it on the Review step.
          Those are structural, not preferences — there is no switch here to
          turn them off, and that is the answer rather than an omission.
        </p>
      </div>
    </PresetList>
  );
}
