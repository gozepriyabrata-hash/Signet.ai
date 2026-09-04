import type { Preset, Recipient, WorkspaceSettings } from "@/types";

import { SEED_PRESETS, SEED_RECIPIENTS } from "./fixtures";

/**
 * The mock's mutable stores for everything Settings writes.
 *
 * ── Why this exists at all ──────────────────────────────────────────────────
 * Until specs/008, `listPresets` read `SEED_PRESETS` directly — a `readonly`
 * const. That was correct while the seam was read-only, and it is exactly why
 * nothing could edit a preset. `SEED_PRESETS` is still the seed; it stops being
 * the live collection.
 *
 * Three separate storage keys rather than one blob, so a corrupt settings
 * document cannot take the preset catalogue down with it.
 *
 * Every access is lazy and guarded, mirroring `store.ts`: `sessionStorage` does
 * not exist in Node, so importing this from a Server Component must not throw,
 * and some browsers throw on access rather than returning undefined.
 */

const PRESET_KEY = "signet.mock.presets.v1";
const RECIPIENT_KEY = "signet.mock.recipients.v1";
const SETTINGS_KEY = "signet.mock.settings.v1";

/**
 * Every tracking option starts off (specs/008 §3.7). This default is a product
 * decision, not a placeholder — see the comment on `WorkspaceSettings.tracking`.
 */
export const DEFAULT_SETTINGS: WorkspaceSettings = {
  tracking: {
    opens: false,
    clicks: false,
    discloseToRecipient: false,
  },
  retention: {
    reportDays: 365,
    packageDays: 0,
    purgeRecipientWithProject: false,
  },
};

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

/** One read/write pair per collection, so the seeding and fallback rules are
 *  written once rather than three times. */
function makeStore<T>(key: string, seed: () => T) {
  let memory: T | null = null;

  return {
    read(): T {
      if (canUseStorage()) {
        try {
          const raw = window.sessionStorage.getItem(key);
          if (raw) return JSON.parse(raw) as T;
        } catch {
          // Corrupt or unreadable — fall through to the seed rather than
          // throwing at a caller who only asked for a list.
        }
        const seeded = seed();
        this.write(seeded);
        return seeded;
      }
      memory ??= seed();
      return memory;
    },

    write(value: T): void {
      if (canUseStorage()) {
        try {
          window.sessionStorage.setItem(key, JSON.stringify(value));
          return;
        } catch {
          // Quota or private mode — keep going in memory.
        }
      }
      memory = value;
    },

    reset(): void {
      memory = null;
      if (canUseStorage()) {
        try {
          window.sessionStorage.removeItem(key);
        } catch {
          // Nothing to do.
        }
      }
    },
  };
}

const presets = makeStore<Preset[]>(PRESET_KEY, () => [...SEED_PRESETS]);
const recipients = makeStore<Recipient[]>(RECIPIENT_KEY, () => [
  ...SEED_RECIPIENTS,
]);
const settings = makeStore<WorkspaceSettings>(SETTINGS_KEY, () => ({
  ...DEFAULT_SETTINGS,
}));

export const readPresets = () => presets.read();
export const writePresets = (next: Preset[]) => presets.write(next);

export const readRecipients = () => recipients.read();
export const writeRecipients = (next: Recipient[]) => recipients.write(next);

export const readSettings = () => settings.read();
export const writeSettings = (next: WorkspaceSettings) => settings.write(next);

/** Test seam: drop everything and start from the fixtures again. */
export function resetSettingsStores(): void {
  presets.reset();
  recipients.reset();
  settings.reset();
}
