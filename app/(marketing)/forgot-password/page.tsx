import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/marketing/ForgotPasswordForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reset your password",
};

/**
 * `/forgot-password` (specs/014). Same minimal shell as `/login` and
 * `/signup`.
 */
export default function ForgotPasswordPage() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-(--nav-height) max-w-6xl items-center px-6 lg:px-8">
          <Link
            href="/"
            className="text-base font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {SITE_NAME}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 pt-16 pb-24 lg:px-8">
        <h1 className="text-4xl font-light tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          Enter your work email and we&apos;ll generate a link to set a new
          password.
        </p>

        <div className="mt-10">
          <ForgotPasswordForm />
        </div>

        <p className="mt-8 text-sm font-light text-muted-foreground">
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Back to log in
          </Link>
        </p>
      </main>
    </>
  );
}
