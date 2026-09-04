import "server-only";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

/**
 * Stateless session cookie (specs/011 §3.2), following the Next.js
 * Authentication guide's "Stateless Sessions" recipe:
 * https://nextjs.org/docs/app/guides/authentication#stateless-sessions
 *
 * Payload carries only `accountId` — never email, name or company (the
 * guide's own tip: a session payload should hold "the minimum, unique user
 * data", not PII).
 */

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Copy .env.local.example to .env.local and generate one with `openssl rand -base64 32`.",
    );
  }
  // `Buffer.from`, not `new TextEncoder().encode()`: under Vitest's jsdom
  // environment, `TextEncoder` is jsdom's own polyfill and produces a
  // `Uint8Array` from a different realm than the one `jose`'s `instanceof`
  // key-type check runs against, which throws even though the value is a
  // real `Uint8Array`. `Buffer` (itself a `Uint8Array` subclass) stays in
  // Node's realm regardless of which environment is running.
  return Buffer.from(secret, "utf-8");
}

interface SessionPayload extends JWTPayload {
  accountId: string;
}

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    // Missing, tampered or expired — treated as "no session", never thrown.
    return null;
  }
}

export async function createSession(accountId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encrypt({ accountId });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Reads and decrypts the cookie. Callers decide what "no session" means. */
export async function readSession(): Promise<{ accountId: string } | null> {
  const store = await cookies();
  const payload = await decrypt(store.get(COOKIE_NAME)?.value);
  return payload ? { accountId: payload.accountId } : null;
}
