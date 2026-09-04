"use client";

import { PresetList } from "@/components/settings/PresetList";

/**
 * `/settings/email` — CTAs and signatures.
 *
 * The Email step picks between these and cannot type a CTA URL: the target is
 * part of the preset, so a link that goes to the wrong place is fixed once here
 * rather than in every project that used it.
 *
 * This is the section a sent package depends on most. `email.ctaId` and
 * `email.signatureId` are references, which is why archiving exists and
 * deleting does not (specs/008 §3.3) — archive a CTA here and every campaign
 * that used it can still say what button went out.
 */
export function EmailSettings() {
  return (
    <div className="space-y-12">
      <PresetList
        kind="cta"
        title="Calls to action"
        description="The button in the email. Its target is part of the preset — the Email step picks one and never types a URL."
        createLabel="New CTA"
        emptyDescription="A call to action is the button your recipient clicks, and where it takes them."
      />

      <PresetList
        kind="signature"
        title="Signatures"
        description="How your emails sign off."
        createLabel="New signature"
        emptyDescription="A signature is the block that closes every email you send."
      />
    </div>
  );
}
