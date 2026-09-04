import type { Metadata } from "next";
import Link from "next/link";

import { privacyPolicy } from "@/app/(marketing)/_content";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
};

/**
 * `/legal/privacy` (specs/013). Same minimal header as `/signup` and
 * `/login` — no `MarketingNav` (its links are in-page anchors on `/`),
 * "focus is the point" (docs/screens.md).
 *
 * Content is a typed constant (`privacyPolicy` in `_content.ts`), matching
 * every other word on the marketing shell (specs/002 §3.1) — no fetch, and
 * nothing here is invented past what specs/013 §3 could actually verify
 * about this codebase's own behaviour.
 */
export default function PrivacyPolicyPage() {
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

      <main className="mx-auto max-w-2xl px-6 pt-16 pb-24 lg:px-8">
        <h1 className="text-4xl font-light tracking-tight text-foreground">
          {privacyPolicy.title}
        </h1>
        <p className="mt-2 text-sm font-light text-muted-foreground">
          Last updated {privacyPolicy.updated}
        </p>
        <p className="mt-6 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {privacyPolicy.intro}
        </p>

        <div className="mt-16 space-y-10">
          {privacyPolicy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-normal tracking-tight text-foreground">
                {section.heading}
              </h2>
              <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                {section.body}
              </p>
              {section.points ? (
                <ul className="mt-4 space-y-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground"
                    >
                      <span aria-hidden="true" className="text-muted-foreground">
                        —
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
