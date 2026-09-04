"use client";

import { SettingToggle, SettingsSection } from "@/components/settings/SettingsSection";
import { useSettings } from "@/hooks/use-settings";

/**
 * `/settings/analytics` — the consent gate.
 *
 * Spec 006 §3.3 defined this screen before it existed: it "decides whether
 * anything is observed about a recipient, and what", and `/analytics` "may only
 * display metrics whose collection `/settings/analytics` has switched on".
 * specs/008 §3.7 accepted that constraint rather than quietly widening it, and
 * added the default: **every option here ships off.**
 *
 * ── Why the open-tracking toggle says what it says ──────────────────────────
 * Open tracking is unreliable by construction. Apple's Mail Privacy Protection
 * "downloads remote content in the background by default — regardless of
 * whether you engage with the email", so a pixel-derived open rate reports
 * something other than what its label claims for a large share of recipients
 * (specs/006 §2.2).
 *
 * The screen says that beside the switch rather than only in a spec. A toggle
 * that promises a number the product cannot compute is worse than no toggle,
 * and a user who turns it on should know what they are turning on.
 */
export function AnalyticsSettings() {
  const { settings, isPending, isError, error, refetch, update } = useSettings();

  return (
    <SettingsSection
      title="What is measured"
      description="Nothing about your recipients is measured unless you switch it on here. /analytics only ever shows what this screen allows."
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={refetch}
    >
      {settings ? (
        <div className="space-y-2">
          <SettingToggle
            id="track-opens"
            label="Track email opens"
            checked={settings.tracking.opens}
            disabled={update.isPending}
            onChange={(opens) =>
              update.mutate({ tracking: { ...settings.tracking, opens } })
            }
            description="Adds a tracking pixel to every email. Apple Mail loads that pixel on receipt whether or not anyone reads the message, so for a large share of recipients this number counts deliveries rather than reads. It is off because it would not mean what it says."
          />

          <SettingToggle
            id="track-clicks"
            label="Track CTA clicks"
            checked={settings.tracking.clicks}
            disabled={update.isPending}
            onChange={(clicks) =>
              update.mutate({ tracking: { ...settings.tracking, clicks } })
            }
            description="Rewrites your call-to-action link so it passes through a redirect first. A click is a deliberate action, so unlike opens this measures something real — but the recipient sees a different URL in their status bar."
          />

          <SettingToggle
            id="track-disclose"
            label="Tell recipients what is measured"
            checked={settings.tracking.discloseToRecipient}
            disabled={update.isPending}
            onChange={(discloseToRecipient) =>
              update.mutate({
                tracking: { ...settings.tracking, discloseToRecipient },
              })
            }
            description="Adds a line to the email footer naming what is tracked. Worth switching on before either of the above."
          />
        </div>
      ) : null}
    </SettingsSection>
  );
}
