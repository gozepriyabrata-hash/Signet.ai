// @vitest-environment node
//
// See lib/auth/session.test.ts — this file exercises the same session
// module, which needs Node's real `Uint8Array` realm for `jose`.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCookieJar } from "@/test/cookie-jar";
import { createTestDb } from "@/test/db";

const { jar, cookies } = createCookieJar();
vi.mock("next/headers", () => ({ cookies }));

const testDb = await createTestDb();
vi.mock("@/lib/db/client", () => ({ getDb: () => testDb }));

process.env.SESSION_SECRET = "test-secret-at-least-32-bytes-long-enough";

const { signupAction, loginAction, logoutAction, forgotPasswordAction, resetPasswordAction } =
  await import("@/lib/auth/actions");
const { readSession } = await import("@/lib/auth/session");

function tokenFromLink(link: string): string {
  return new URL(link, "http://localhost").searchParams.get("token")!;
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** `redirect()` throws rather than returning — assert on the thrown digest. */
async function expectRedirectTo(action: () => Promise<unknown>, path: string) {
  await expect(action()).rejects.toMatchObject({
    digest: expect.stringContaining(`;${path};`),
  });
}

beforeEach(() => {
  jar.delete("session");
});

describe("signupAction", () => {
  it("creates an account, starts a session, and redirects to /dashboard", async () => {
    await expectRedirectTo(
      () =>
        signupAction(
          undefined,
          form({
            name: "Ada Speke",
            workEmail: "ada@wexley.example",
            company: "Wexley",
            password: "correct-horse-1!",
          }),
        ),
      "/dashboard",
    );
    expect(await readSession()).not.toBeNull();
  });

  it("rejects a duplicate email without creating a second account", async () => {
    const fields = {
      name: "Ada Speke",
      workEmail: "dup@wexley.example",
      company: "Wexley",
      password: "correct-horse-1!",
    };
    await expectRedirectTo(() => signupAction(undefined, form(fields)), "/dashboard");
    jar.delete("session");

    const result = await signupAction(undefined, form(fields));
    expect(result?.fieldErrors?.workEmail).toMatch(/already exists/i);
  });

  it("rejects a weak password with a field error, before touching the database", async () => {
    const result = await signupAction(
      undefined,
      form({
        name: "Ada Speke",
        workEmail: "weak@wexley.example",
        company: "Wexley",
        password: "short",
      }),
    );
    expect(result?.fieldErrors?.password).toBeDefined();
    expect(await readSession()).toBeNull();
  });
});

describe("loginAction", () => {
  async function signup(workEmail: string, password: string) {
    await expectRedirectTo(
      () =>
        signupAction(
          undefined,
          form({ name: "Ada Speke", workEmail, company: "Wexley", password }),
        ),
      "/dashboard",
    );
    jar.delete("session");
  }

  it("logs in with the right password and redirects to /dashboard", async () => {
    await signup("login-ok@wexley.example", "correct-horse-1!");
    await expectRedirectTo(
      () =>
        loginAction(
          undefined,
          form({ workEmail: "login-ok@wexley.example", password: "correct-horse-1!" }),
        ),
      "/dashboard",
    );
    expect(await readSession()).not.toBeNull();
  });

  it("gives the same generic error for a wrong password as for an unknown email", async () => {
    await signup("login-wrong@wexley.example", "correct-horse-1!");

    const wrongPassword = await loginAction(
      undefined,
      form({ workEmail: "login-wrong@wexley.example", password: "nope-nope-1!" }),
    );
    const unknownEmail = await loginAction(
      undefined,
      form({ workEmail: "nobody@wexley.example", password: "nope-nope-1!" }),
    );

    expect(wrongPassword?.error).toBe(unknownEmail?.error);
    expect(await readSession()).toBeNull();
  });
});

describe("forgotPasswordAction / resetPasswordAction", () => {
  async function signup(workEmail: string, password: string) {
    await expectRedirectTo(
      () =>
        signupAction(
          undefined,
          form({ name: "Ada Speke", workEmail, company: "Wexley", password }),
        ),
      "/dashboard",
    );
    jar.delete("session");
  }

  it("gives the same 'submitted' response for a known and an unknown email", async () => {
    await signup("forgot-known@wexley.example", "correct-horse-1!");

    const known = await forgotPasswordAction(
      undefined,
      form({ workEmail: "forgot-known@wexley.example" }),
    );
    const unknown = await forgotPasswordAction(
      undefined,
      form({ workEmail: "forgot-unknown@wexley.example" }),
    );

    expect(known?.submitted).toBe(true);
    expect(unknown?.submitted).toBe(true);
    expect(known?.devResetLink).toBeDefined();
    expect(unknown?.devResetLink).toBeUndefined();
  });

  it("the dev reset link's token resets the password and starts a session", async () => {
    await signup("reset-flow@wexley.example", "old-password-1!");

    const { devResetLink } = await forgotPasswordAction(
      undefined,
      form({ workEmail: "reset-flow@wexley.example" }),
    );
    const token = tokenFromLink(devResetLink!);

    await expectRedirectTo(
      () => resetPasswordAction(token, undefined, form({ password: "new-password-1!" })),
      "/dashboard",
    );
    expect(await readSession()).not.toBeNull();
    jar.delete("session");

    // Old password no longer works; new one does.
    const oldPasswordResult = await loginAction(
      undefined,
      form({ workEmail: "reset-flow@wexley.example", password: "old-password-1!" }),
    );
    expect(oldPasswordResult?.error).toBeDefined();

    await expectRedirectTo(
      () =>
        loginAction(
          undefined,
          form({ workEmail: "reset-flow@wexley.example", password: "new-password-1!" }),
        ),
      "/dashboard",
    );
  });

  it("a token can only be used once", async () => {
    await signup("reset-once@wexley.example", "old-password-1!");
    const { devResetLink } = await forgotPasswordAction(
      undefined,
      form({ workEmail: "reset-once@wexley.example" }),
    );
    const token = tokenFromLink(devResetLink!);

    await expectRedirectTo(
      () => resetPasswordAction(token, undefined, form({ password: "new-password-1!" })),
      "/dashboard",
    );
    jar.delete("session");

    const second = await resetPasswordAction(
      token,
      undefined,
      form({ password: "another-password-1!" }),
    );
    expect(second?.error).toMatch(/invalid or has expired/i);
  });

  it("rejects an unknown or garbage token with a generic error", async () => {
    const result = await resetPasswordAction(
      "not-a-real-token",
      undefined,
      form({ password: "new-password-1!" }),
    );
    expect(result?.error).toMatch(/invalid or has expired/i);
  });

  it("requesting a new link invalidates the previous one", async () => {
    await signup("reset-relink@wexley.example", "old-password-1!");

    const first = await forgotPasswordAction(
      undefined,
      form({ workEmail: "reset-relink@wexley.example" }),
    );
    const second = await forgotPasswordAction(
      undefined,
      form({ workEmail: "reset-relink@wexley.example" }),
    );

    const staleResult = await resetPasswordAction(
      tokenFromLink(first.devResetLink!),
      undefined,
      form({ password: "new-password-1!" }),
    );
    expect(staleResult?.error).toMatch(/invalid or has expired/i);

    await expectRedirectTo(
      () =>
        resetPasswordAction(
          tokenFromLink(second.devResetLink!),
          undefined,
          form({ password: "new-password-1!" }),
        ),
      "/dashboard",
    );
  });
});

describe("logoutAction", () => {
  it("clears the session and redirects to /login", async () => {
    await expectRedirectTo(
      () =>
        signupAction(
          undefined,
          form({
            name: "Ada Speke",
            workEmail: "logout@wexley.example",
            company: "Wexley",
            password: "correct-horse-1!",
          }),
        ),
      "/dashboard",
    );
    expect(await readSession()).not.toBeNull();

    await expectRedirectTo(() => logoutAction(), "/login");
    expect(await readSession()).toBeNull();
  });
});
