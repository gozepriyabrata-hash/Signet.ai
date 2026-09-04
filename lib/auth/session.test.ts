// @vitest-environment node
//
// This module never runs in a browser (it's `server-only`), and jsdom's vm
// realm gives `jose` a `Uint8Array` global that isn't reference-identical to
// the one `Buffer.from()` produces in this worker — `key instanceof
// Uint8Array` then fails inside jose even for a real `Buffer`. The plain
// Node environment matches production and sidesteps the realm mismatch.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCookieJar } from "@/test/cookie-jar";

const { jar, cookies } = createCookieJar();
vi.mock("next/headers", () => ({ cookies }));

process.env.SESSION_SECRET = "test-secret-at-least-32-bytes-long-enough";

const { createSession, deleteSession, readSession } = await import("@/lib/auth/session");

beforeEach(() => {
  jar.delete("session");
});

describe("session cookie", () => {
  it("round-trips: a created session reads back with the same accountId", async () => {
    await createSession("acct_1");
    expect(await readSession()).toEqual({ accountId: "acct_1" });
  });

  it("deleteSession clears it", async () => {
    await createSession("acct_1");
    await deleteSession();
    expect(await readSession()).toBeNull();
  });

  it("rejects a tampered token", async () => {
    await createSession("acct_1");
    const tampered = `${jar.get("session")!.value}x`;
    jar.set("session", tampered);
    expect(await readSession()).toBeNull();
  });

  it("readSession returns null with no cookie set", async () => {
    expect(await readSession()).toBeNull();
  });
});
