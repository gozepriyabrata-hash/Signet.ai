import { describe, expect, it } from "vitest";

import { generateResetToken, hashResetToken } from "@/lib/auth/tokens";

describe("reset tokens", () => {
  it("generates high-entropy, distinct tokens", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(30);
  });

  it("hashes deterministically, so a stored hash can be matched against a fresh hash of the same token", () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it("different tokens hash differently", () => {
    expect(hashResetToken(generateResetToken())).not.toBe(hashResetToken(generateResetToken()));
  });

  it("the hash is not the token itself", () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).not.toBe(token);
  });
});
