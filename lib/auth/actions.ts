"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { accounts, passwordResetTokens } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { generateResetToken, hashResetToken } from "@/lib/auth/tokens";

/**
 * Server Actions for account creation, login and logout (specs/011 §3.5,
 * §2.4) — not `ApiClient` methods. `lib/api/index.ts`'s mock/real switch is
 * global; a half-real `ApiClient` method would break every other screen the
 * moment `NEXT_PUBLIC_USE_MOCKS=false` was set. Auth is its own, always-real
 * subsystem instead, called directly from `useActionState` the way the
 * Next.js Authentication guide's own reference implementation does:
 * https://nextjs.org/docs/app/guides/authentication
 */

export interface AuthActionState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

const passwordSchema = z
  .string()
  .min(8, "Be at least 8 characters long.")
  .regex(/[a-zA-Z]/, "Contain at least one letter.")
  .regex(/[0-9]/, "Contain at least one number.")
  .regex(/[^a-zA-Z0-9]/, "Contain at least one special character.");

const signupSchema = z.object({
  name: z.string().trim().min(1, "We need a name for the workspace."),
  workEmail: z
    .string()
    .trim()
    .min(1, "A work email is required.")
    .email("Enter a valid email address."),
  company: z.string().trim().min(1, "Which company is this for?"),
  password: passwordSchema,
});

const loginSchema = z.object({
  workEmail: z.string().trim().min(1, "A work email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "A password is required."),
});

const forgotPasswordSchema = z.object({
  workEmail: z.string().trim().min(1, "A work email is required.").email("Enter a valid email address."),
});

const resetPasswordSchema = z.object({
  password: passwordSchema,
});

/** specs/014 §3.2. */
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function firstFieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export async function signupAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    workEmail: formData.get("workEmail"),
    company: formData.get("company"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.workEmail, parsed.data.workEmail))
    .limit(1);
  if (existing) {
    return { fieldErrors: { workEmail: "An account with this email already exists." } };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const id = crypto.randomUUID();
  await db.insert(accounts).values({
    id,
    name: parsed.data.name,
    workEmail: parsed.data.workEmail,
    company: parsed.data.company,
    passwordHash,
    createdAt: new Date(),
  });

  await createSession(id);
  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    workEmail: formData.get("workEmail"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const db = getDb();
  const [account] = await db
    .select({ id: accounts.id, passwordHash: accounts.passwordHash })
    .from(accounts)
    .where(eq(accounts.workEmail, parsed.data.workEmail))
    .limit(1);

  // Same generic message whether the email doesn't exist or the password is
  // wrong — never confirm which (specs/011 §6, the Next.js guide's own
  // "Further Reading" links the Copenhagen Book on this exact point).
  const genericError = { error: "Invalid email or password." };
  if (!account) return genericError;

  const valid = await verifyPassword(parsed.data.password, account.passwordHash);
  if (!valid) return genericError;

  await createSession(account.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

export interface ForgotPasswordActionState extends AuthActionState {
  submitted?: boolean;
  /**
   * Dev-mode only (specs/014 §3.3). This repo has no email-sending capability
   * yet, so the reset link is handed back directly instead of emailed. Never
   * gated by `NODE_ENV` — silently going quiet in "production" would hide the
   * gap instead of surfacing it, the same reasoning `lib/api/real/index.ts`'s
   * loud `notImplemented()` stubs use for every other unbuilt real feature.
   */
  devResetLink?: string;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState | undefined,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    workEmail: formData.get("workEmail"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const db = getDb();
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.workEmail, parsed.data.workEmail))
    .limit(1);

  // Same account-enumeration discipline loginAction uses — but see specs/014
  // §4 for why the dev-mode link below still gives this away in practice.
  if (!account) return { submitted: true };

  // Only the latest link should work.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.accountId, account.id));

  const token = generateResetToken();
  await db.insert(passwordResetTokens).values({
    tokenHash: hashResetToken(token),
    accountId: account.id,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    createdAt: new Date(),
  });

  return { submitted: true, devResetLink: `/reset-password?token=${token}` };
}

export async function resetPasswordAction(
  token: string,
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const db = getDb();
  const tokenHash = hashResetToken(token);
  const [row] = await db
    .select({ accountId: passwordResetTokens.accountId, expiresAt: passwordResetTokens.expiresAt })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  const invalidError = { error: "This reset link is invalid or has expired. Request a new one." };
  if (!row || row.expiresAt.getTime() < Date.now()) return invalidError;

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(accounts).set({ passwordHash }).where(eq(accounts.id, row.accountId));
  // Single-use: consumed here regardless of how it was reached.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.accountId, row.accountId));

  await createSession(row.accountId);
  redirect("/dashboard");
}
