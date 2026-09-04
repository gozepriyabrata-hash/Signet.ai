/**
 * One source for the absolute site origin.
 *
 * Both root layouts need their own `metadataBase` — neither is above the
 * other, so neither inherits — and a relative URL in any metadata field
 * without one is a build error, not a warning.
 *
 * Read at module scope, so nothing here makes a route dynamic.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "Signet";

export const SITE_TAGLINE =
  "Turn any client report into a personalised video and email — approved by you, never auto-sent.";
