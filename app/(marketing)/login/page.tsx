import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/marketing/LoginForm";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Log in",
};

/**
 * `/login` (specs/011 — supersedes specs/010's rejection). Mirrors
 * `/signup`'s page shell exactly: same minimal header, no `MarketingNav`
 * (its desktop links are in-page anchors that only resolve on `/`), same
 * `max-w-md` layout.
 */
export default function LoginPage() {
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
          Log in
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          Welcome back. Enter your work email and password to open your
          workspace.
        </p>

        <div className="mt-10">
          <LoginForm />
        </div>

        <p className="mt-8 text-sm font-light text-muted-foreground">
          No workspace yet?{" "}
          <Link
            href="/signup"
            className="text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Create one
          </Link>
        </p>
      </main>
    </>
  );
}
