"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type AuthActionState } from "@/lib/auth/actions";

/**
 * The form on `/reset-password?token=...` (specs/014). One field — the new
 * password — with `token` bound into the Server Action via `.bind()` (the
 * documented way to pass extra, non-form data into a `useActionState`
 * action) rather than as an editable hidden input.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<
    AuthActionState | undefined,
    FormData
  >(resetPasswordAction.bind(null, token), undefined);

  return (
    <form className="space-y-8" action={formAction}>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          aria-invalid={Boolean(state?.fieldErrors?.password)}
          aria-describedby={state?.fieldErrors?.password ? "password-error" : undefined}
        />
        {state?.fieldErrors?.password ? (
          <p id="password-error" className="text-sm font-light text-danger">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending} aria-disabled={isPending}>
        {isPending ? "Setting password…" : "Set new password"}
      </Button>

      <div aria-live="polite" className="sr-only">
        {isPending ? "Setting your new password…" : ""}
      </div>

      {state?.error ? (
        <div role="alert" className="rounded-xs border border-danger bg-surface p-6">
          <p className="text-base font-normal text-foreground">Could not reset your password.</p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {state.error}
          </p>
        </div>
      ) : null}
    </form>
  );
}
