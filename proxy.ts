import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { readSession } from "@/lib/auth/session";
import { isAuthPath, isProtectedPath } from "@/lib/auth/route-guard";

/**
 * Optimistic route protection (specs/011 §2.5, §8) — reads only the session
 * cookie's shape, no DB round-trip, per the Next.js Authentication guide's
 * own instruction: https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts` (deprecated, not aliased —
 * verified against node_modules/next/dist/docs/.../file-conventions/proxy.md).
 *
 * This is the only protection layer today: specs/003 §3.3 committed every
 * `(app)` route to client-side-only data fetching with no server prefetch,
 * so there is no server-rendered protected data yet for a DAL guard to sit
 * in front of. See specs/011 §2.5 — this is not the finished security
 * boundary the guide's own DAL section describes.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession();

  if (isProtectedPath(pathname) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
