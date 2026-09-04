import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque, single-use tokens for password reset (specs/014 §3.2) — not
 * `jose`/JWT like the session cookie (`lib/auth/session.ts`): a reset token
 * has to be revocable the instant it is used, which a self-verifying signed
 * token cannot do without a database record anyway, so there is no benefit
 * to the extra complexity here.
 */

/** High-entropy, URL-safe. This is the value that goes in the reset link. */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What actually gets stored — never the token itself, same reasoning as `passwordHash`. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
