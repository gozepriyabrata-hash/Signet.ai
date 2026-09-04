import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, letting later ones win over earlier ones of the same
 * property. Used by the vendored primitives in components/ui/ so a caller's
 * className can override a variant's default rather than fighting it.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * An explicit locale, not the runtime default.
 *
 * `Intl.DateTimeFormat` with no locale resolves from the host, which differs
 * between a Node render and a browser one. Every screen using these formats
 * renders after a client-side fetch today, so it cannot bite yet — but pinning
 * it costs nothing and removes the trap for whoever server-renders one of these
 * tables later.
 *
 * Absolute rather than relative: a work queue and a send history are both
 * scanned for *when*, and "2 days ago" would reintroduce a `Date.now()` read
 * into a render.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "29 Aug 2026" — list rows, where the day is what is being compared. */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

/** "22 Aug 2026, 16:20" — a single record, where the exact moment is evidence
 *  of when something left the building. */
export function formatDateTime(iso: string): string {
  return DATE_TIME_FORMAT.format(new Date(iso));
}
