"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordAction,
  type ForgotPasswordActionState,
} from "@/lib/auth/actions";

/**
 * The form on `/forgot-password` (specs/014). One field — work email.
 *
 * On success, `state.submitted` renders a generic confirmation regardless of
 * whether an account exists (specs/011 §6's account-enumeration discipline,
 * applied here too) — `state.devResetLink`, when present, is the one
 * deliberate exception: dev-mode-only, since this repo has no email sending
 * yet (specs/014 §3.3). It is rendered as an obvious, temporary affordance,
 * never dressed up as what production would do.
 */
export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<
    ForgotPasswordActionState | undefined,
    FormData
  >(forgotPasswordAction, undefined);

  if (state?.submitted) {
    return (
      <div className="space-y-6">
        <div role="status" className="rounded-xs border border-border bg-surface p-6">
          <p className="text-base font-normal text-foreground">
            If an account exists for that email, a reset link has been
            generated.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            It expires in 30 minutes and can only be used once.
          </p>
        </div>

        {state.devResetLink ? (
          // Neutral --border, not --warning: design-system §1 reserves
          // semantic colour for job outcomes, and this is an environment
          // notice, not one.
          <div className="rounded-xs border border-border bg-surface p-6">
            <p className="text-sm font-normal text-foreground">
              Dev mode: no email sending yet.
            </p>
            <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              In production this link would be emailed, not shown here.
            </p>
            <a
              href={state.devResetLink}
              className="mt-4 inline-block break-all text-sm font-light text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {state.devResetLink}
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form className="space-y-8" action={formAction}>
      <div className="space-y-2">
        <Label htmlFor="workEmail">Work email</Label>
        <Input
          id="workEmail"
          name="workEmail"
          type="email"
          required
          aria-invalid={Boolean(state?.fieldErrors?.workEmail)}
          aria-describedby={state?.fieldErrors?.workEmail ? "workEmail-error" : undefined}
        />
        {state?.fieldErrors?.workEmail ? (
          <p id="workEmail-error" className="text-sm font-light text-danger">
            {state.fieldErrors.workEmail}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending} aria-disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>

      <div aria-live="polite" className="sr-only">
        {isPending ? "Checking your email…" : ""}
      </div>
    </form>
  );
}
