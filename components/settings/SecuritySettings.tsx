"use client";

import {
  SettingNumber,
  SettingToggle,
  SettingsSection,
} from "@/components/settings/SettingsSection";
import { useSettings } from "@/hooks/use-settings";

/**
 * `/settings/security` — access, retention and data handling.
 *
 * ── What is NOT here, and why ───────────────────────────────────────────────
 * Specs 005 §9 and 006 §7 both deferred a Content Security Policy to "the spec
 * alongside `/settings/security`". specs/008 §3.8 answered that: a CSP is not a
 * setting. It belongs to whoever configures the deployment, and the choice
 * costs something whichever way it goes —
 *
 *  - nonce-based requires dynamic rendering on every route it covers, undoing
 *    the static rendering three specs worked for and contradicting the landing
 *    page's `dynamic = 'error'` guard outright;
 *  - the hash-based (SRI) alternative preserves static rendering and is marked
 *    experimental by Next's own documentation;
 *  - a static header with `'unsafe-inline'` permits the injection class a CSP
 *    exists to stop, while putting the header in every response — the
 *    appearance of a control, which stops anyone looking again.
 *
 * A checkbox here saying "enable CSP" would be the fourth option: theatre. The
 * panel below says so rather than leaving a reader to wonder why the security
 * screen has no security in it.
 */
export function SecuritySettings() {
  const { settings, isPending, isError, error, refetch, update } = useSettings();

  return (
    <SettingsSection
      title="Retention and data handling"
      description="How long this workspace keeps what it has been given, and what happens to a client's details when their project goes."
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={refetch}
    >
      {settings ? (
        <div className="space-y-2">
          <SettingNumber
            id="retain-reports"
            label="Keep uploaded reports for"
            description="The source document a project was built from. Deleting it does not affect a package already sent — that keeps its own attachment."
            value={settings.retention.reportDays}
            zeroLabel="days — kept indefinitely"
            disabled={update.isPending}
            onChange={(reportDays) =>
              update.mutate({ retention: { ...settings.retention, reportDays } })
            }
          />

          <SettingNumber
            id="retain-packages"
            label="Keep sent packages for"
            description="The record of what went out, which is what /campaigns reads. Zero keeps them indefinitely, which is the default — a record of a message sent to a client is the last thing that should expire by accident."
            value={settings.retention.packageDays}
            zeroLabel="days — kept indefinitely"
            disabled={update.isPending}
            onChange={(packageDays) =>
              update.mutate({ retention: { ...settings.retention, packageDays } })
            }
          />

          <SettingToggle
            id="purge-recipient"
            label="Remove a recipient's saved details when their project is deleted"
            checked={settings.retention.purgeRecipientWithProject}
            disabled={update.isPending}
            onChange={(purgeRecipientWithProject) =>
              update.mutate({
                retention: { ...settings.retention, purgeRecipientWithProject },
              })
            }
            description="Off by default, because a saved recipient usually outlives any one project. Switching it on makes deleting a project also remove that person from Settings → Recipients."
          />

          <div className="rounded-xs border border-border bg-surface p-5">
            <p className="text-sm font-normal text-foreground">
              Content Security Policy
            </p>
            <p className="mt-1 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              Not a setting, and deliberately not a switch here. A CSP is
              configured where this application is deployed, and the three ways
              of doing it in Next.js each cost something — one gives up static
              rendering, one relies on an experimental flag, and one permits the
              attacks it claims to stop. Adding a toggle would be the fourth
              option: the look of a control without one.
            </p>
          </div>
        </div>
      ) : null}
    </SettingsSection>
  );
}
