"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, type AuthActionState } from "@/lib/auth/actions";

/**
 * The form on `/signup` (specs/009 §3.1, amended by specs/011). Four required
 * fields now — name, work email, company, password — still no
 * confirm-password, still no terms checkbox (specs/009 §2.1). Submit reads
 * "Create workspace," not "Sign up."
 *
 * A Server Action (`signupAction`), not `useMutation` against `lib/api`
 * (specs/011 §3.5, §2.4) — account creation is real now, and `lib/api`'s
 * mock/real switch is global, so it can't host a half-real method. This is
 * also why the previous version's scoped `QueryClientProvider` workaround
 * (specs/009 §3.5) is gone: `useActionState` needs no query client at all.
 *
 * Validation is server-side, in `signupAction`'s zod schema — not
 * react-hook-form here, unlike this codebase's other forms. `useActionState`
 * already round-trips field errors from the one place that has to validate
 * anyway (the server, since a password's hash policy lives there), so a
 * second, client-side validation layer would just be a copy of the same
 * rules kept in sync by hand.
 */
export function SignupForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState | undefined, FormData>(
    signupAction,
    undefined,
  );

  const field = (
    key: "name" | "workEmail" | "company" | "password",
    label: string,
    type: "text" | "email" | "password" = "text",
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
        {field("name", "Name")}
        {field("workEmail", "Work email", "email")}
        {field("company", "Company")}
        {field("password", "Password", "password")}
      </div>

      <Button type="submit" className="w-full" disabled={isPending} aria-disabled={isPending}>
        {isPending ? "Creating workspace…" : "Create workspace"}
      </Button>

      <div aria-live="polite" className="sr-only">
        {isPending ? "Creating your workspace…" : ""}
      </div>

      {state?.error ? (
        <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
          <p className="text-base font-normal text-foreground">
            Could not create your workspace.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {state.error}
          </p>
        </div>
      ) : null}
    </form>
  );
}
