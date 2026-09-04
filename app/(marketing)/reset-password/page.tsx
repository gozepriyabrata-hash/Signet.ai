import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/marketing/ResetPasswordForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Set a new password",
};

/**
 * `/reset-password?token=...` (specs/014). `searchParams` is a Promise in
 * Next 16 (verified against node_modules/next/dist/docs/.../page.md — CLAUDE.md's
 * "not the Next.js you know" warning), so this stays an async Server
 * Component rather than reading it synchronously.
 *
 * A missing token (someone navigating here directly) is not an error state
 * for the form to render blank into — it renders instead, up front, with a
 * link back to request a real one.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

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
          Set a new password
        </h1>

        {token ? (
          <div className="mt-10">
            <ResetPasswordForm token={token} />
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            <p className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              This link is missing its reset token.
            </p>
            <Link
              href="/forgot-password"
              className="text-sm font-light text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
