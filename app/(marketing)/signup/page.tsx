import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/marketing/SignupForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign up",
};

/**
 * `/signup` — a workspace-creation page (specs/009, password field and
 * Server Action added by specs/011, which also built `/login` alongside it).
 *
 * No `MarketingNav`, no `Footer`: MarketingNav's desktop links are in-page
 * anchors (`#pricing`, `#security`, …) that only resolve on `/` (specs/009
 * §3.4) — mounting it here would render five dead links. This page gets its
 * own minimal header instead, the same "focus is the point" reasoning
 * docs/screens.md gives for the workflow's chromeless `(focus)` layout.
 *
 * `next/link`, not a plain `<a>`: unlike MarketingNav's primary CTA, this
 * link stays inside the `(marketing)` root layout (`/signup` → `/`), so a
 * client-side transition applies (contrast specs/002 §3.2).
 */
export default function SignupPage() {
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
          Create your workspace
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          Tell us who&apos;s asking. No password, no card — just enough to
          open the workspace.
        </p>

        <div className="mt-10">
          <SignupForm />
        </div>

        <p className="mt-8 text-sm font-light text-muted-foreground">
          Already have a workspace?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Log in
          </Link>
        </p>
      </main>
    </>
  );
}
