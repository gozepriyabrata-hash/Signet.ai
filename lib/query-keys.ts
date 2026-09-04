import type { AnalyticsRange, PresetKind } from "@/types";

/**
 * The query-key factory, per docs/data-model.md §3. Nothing constructs a key
 * inline — an ad-hoc key that differs by one character is a cache miss nobody
 * notices.
 */
export const qk = {
  /** Varies on both list options, so a filter and a search are distinct
   *  cache entries rather than one clobbering the other. */
  projects: (status?: string, query?: string) =>
    ["projects", status ?? "all", query ?? ""] as const,
  project: (id: string) => ["project", id] as const,
  job: (id: string) => ["job", id] as const,
  /** Varies on `includeArchived`, so the settings screen's list and the
   *  workflow's dropdown are distinct cache entries rather than one serving
   *  the other stale or over-full data (specs/008 §3.4). */
  presets: (kind: PresetKind, includeArchived = false) =>
    ["presets", kind, includeArchived] as const,

  recipients: () => ["recipients"] as const,
  settings: () => ["settings"] as const,
  usage: () => ["usage"] as const,

  /**
   * One package, by its OWN id. `/campaigns/[id]` uses this.
   *
   * Split from `packageForProject` by specs/005 §3.2. Before the split there
   * was a single `package: (id) => ["package", id]`, which lib/query-keys.ts
   * meant as a package id and docs/screens.md's Review section used as a
   * project id. The two never produced colliding *strings* — a project id and a
   * package id differ — so nothing broke; they collided in *meaning*, which is
   * the failure a key factory exists to prevent and much the harder one to
   * notice, because the cache stays correct while the code stops being
   * readable.
   */
  package: (packageId: string) => ["package", packageId] as const,

  /** "The package for this project", which Review asks before any package id
   *  exists. Distinct prefix so it can never be confused with the above. */
  packageForProject: (projectId: string) =>
    ["package", "for-project", projectId] as const,

  /** The sent-package history behind `/campaigns`. No parameters, because the
   *  screen has no filters (specs/005 §3.9). */
  packages: () => ["packages"] as const,

  /** Varies on the range, so switching windows is a distinct cache entry
   *  rather than one clobbering the other. */
  analytics: (range: AnalyticsRange) => ["analytics", range] as const,

  stats: () => ["stats"] as const,
};
