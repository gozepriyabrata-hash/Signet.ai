import type { ApiClient } from "@/lib/api/types";

/**
 * The real adapter. Stubs for now.
 *
 * When this becomes real, two decisions in specs/003-dashboard.md are unblocked
 * and should be revisited: server prefetching (§3.3) becomes both possible and
 * worthwhile, and `loading.tsx` (§3.6) becomes the right loading mechanism.
 *
 * No `createAccount`/`login` here — specs/011 §2.4 explains why account
 * creation and login are Server Actions in `lib/auth/actions.ts` instead:
 * this file's mock/real switch is global, so a half-real `ApiClient` method
 * would break every other screen the moment `NEXT_PUBLIC_USE_MOCKS=false`
 * was set.
 */
function notImplemented(method: string): never {
  throw new Error(
    `lib/api/real: ${method}() has no backend yet. Leave NEXT_PUBLIC_USE_MOCKS ` +
      `unset to use the mock adapter.`,
  );
}

export const realClient: ApiClient = {
  listProjects: () => notImplemented("listProjects"),
  getProject: () => notImplemented("getProject"),
  createProject: () => notImplemented("createProject"),
  getStats: () => notImplemented("getStats"),
  uploadReport: () => notImplemented("uploadReport"),
  analyzeReport: () => notImplemented("analyzeReport"),
  generateScript: () => notImplemented("generateScript"),
  generateVideo: () => notImplemented("generateVideo"),
  generateEmail: () => notImplemented("generateEmail"),
  getJob: () => notImplemented("getJob"),
  cancelJob: () => notImplemented("cancelJob"),
  listPresets: () => notImplemented("listPresets"),
  createPreset: () => notImplemented("createPreset"),
  updatePreset: () => notImplemented("updatePreset"),
  archivePreset: () => notImplemented("archivePreset"),
  restorePreset: () => notImplemented("restorePreset"),
  setDefaultPreset: () => notImplemented("setDefaultPreset"),
  listRecipients: () => notImplemented("listRecipients"),
  saveRecipient: () => notImplemented("saveRecipient"),
  deleteRecipient: () => notImplemented("deleteRecipient"),
  getUsage: () => notImplemented("getUsage"),
  getSettings: () => notImplemented("getSettings"),
  updateSettings: () => notImplemented("updateSettings"),
  buildPackage: () => notImplemented("buildPackage"),
  listPackages: () => notImplemented("listPackages"),
  getPackage: () => notImplemented("getPackage"),
  getAnalytics: () => notImplemented("getAnalytics"),
  sendPackage: () => notImplemented("sendPackage"),
};
