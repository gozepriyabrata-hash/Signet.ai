/**
 * Pure routing rules for `proxy.ts` (specs/011 §2.5, §8) — kept separate and
 * dependency-free so the redirect logic is unit-testable without spinning up
 * a real request. `proxy.ts` itself stays a thin wrapper around these.
 */

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/settings"];
const AUTH_PATHS = ["/login", "/signup"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname);
}
