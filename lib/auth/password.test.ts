import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("round-trips: the original password verifies against its own hash", async () => {
    const hash = await hashPassword("correct-horse-1!");
    expect(await verifyPassword("correct-horse-1!", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct-horse-1!");
    expect(await verifyPassword("wrong-password-1!", hash)).toBe(false);
  });

  it("hashes the same password differently each time (random salt)", async () => {
    const a = await hashPassword("correct-horse-1!");
    const b = await hashPassword("correct-horse-1!");
    expect(a).not.toBe(b);
    expect(await verifyPassword("correct-horse-1!", a)).toBe(true);
    expect(await verifyPassword("correct-horse-1!", b)).toBe(true);
  });
});
