import { describe, expect, it } from "vitest";

import { isAuthPath, isProtectedPath } from "@/lib/auth/route-guard";

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/projects", "/projects/abc123/report", "/campaigns", "/campaigns/abc", "/analytics", "/settings", "/settings/security"])(
    "protects %s",
    (path) => {
      expect(isProtectedPath(path)).toBe(true);
    },
  );

  it.each(["/", "/login", "/signup", "/pricing", "/dashboards"])(
    "does not protect %s",
    (path) => {
      expect(isProtectedPath(path)).toBe(false);
    },
  );
});

describe("isAuthPath", () => {
  it("matches /login and /signup", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/signup")).toBe(true);
  });

  it("does not match anything else", () => {
    expect(isAuthPath("/dashboard")).toBe(false);
    expect(isAuthPath("/")).toBe(false);
  });
});
