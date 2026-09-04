"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type AuthActionState } from "@/lib/auth/actions";

/**
 * The form on `/login` (specs/011). Two fields — work email, password —
 * mirroring `/signup`'s page shell and error-banner pattern exactly. A
 * Server Action, not `useMutation` (specs/011 §3.5, same reasoning as
 * `SignupForm`).
 *
 * `loginAction` returns the same generic "Invalid email or password" whether
 * the email doesn't exist or the password is wrong (specs/011 §6) — that
 * message renders as the `state.error` banner, never a per-field error, so
 * this form never confirms which field was wrong.
 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState | undefined, FormData>(
    loginAction,
    undefined,
  );

  const field = (
    key: "workEmail" | "password",
    label: string,
    type: "email" | "password",
  ) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        name={key}
        type={type}
        required
        aria-invalid={Boolean(state?.fieldErrors?.[key])}
        aria-describedby={state?.fieldErrors?.[key] ? `${key}-error` : undefined}
      />
      {state?.fieldErrors?.[key] ? (
        <p id={`${key}-error`} className="text-sm font-light text-danger">
          {state.fieldErrors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <form className="space-y-8" action={formAction}>
      <div className="space-y-6">
        {field("workEmail", "Work email", "email")}
        {field("password", "Password", "password")}
      </div>

      <p className="-mt-4 text-right text-sm font-light">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Forgot your password?
        </Link>
      </p>

      <Button type="submit" className="w-full" disabled={isPending} aria-disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>

      <div aria-live="polite" className="sr-only">
        {isPending ? "Signing you in…" : ""}
      </div>

      {state?.error ? (
        <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
          <p className="text-base font-normal text-foreground">Could not sign you in.</p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {state.error}
          </p>
        </div>
      ) : null}
    </form>
  );
}
