import type { Project } from "@/types";

import { SEED_PROJECTS } from "./fixtures";

const STORAGE_KEY = "signet.mock.projects.v1";

/**
 * The mock's backing store.
 *
 * Persisted to `sessionStorage` so a refresh mid-workflow does not reset the
 * demo (docs/data-model.md). Two consequences worth stating, because one of
 * them decided the shape of the whole dashboard:
 *
 * 1. `sessionStorage` does not exist in Node. Every access here is lazy —
 *    inside a function, never at module scope — so importing `@/lib/api` from
 *    a Server Component does not throw.
 * 2. Because this store lives in the browser, the server cannot read it. That
 *    is why the dashboard does no server prefetching: a `prefetchQuery` on the
 *    server would dehydrate seed data the browser disagrees with. See
 *    specs/003-dashboard.md §3.3.
 */

/** In-memory fallback for the server, and for browsers blocking storage. */
let memory: Project[] | null = null;

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    // Some browsers throw on access rather than returning undefined.
    return false;
  }
}

export function readProjects(): Project[] {
  if (canUseStorage()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Project[];
    } catch {
      // Corrupt or unreadable — fall through to the seed.
    }
    const seeded = [...SEED_PROJECTS];
    writeProjects(seeded);
    return seeded;
  }

  memory ??= [...SEED_PROJECTS];
  return memory;
}

export function writeProjects(projects: Project[]): void {
  if (canUseStorage()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      return;
    } catch {
      // Quota or private mode — keep going in memory.
    }
  }
  memory = projects;
}

/** Test seam: drop everything and start from the fixtures again. */
export function resetProjects(): void {
  memory = null;
  if (canUseStorage()) {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do.
    }
  }
}
