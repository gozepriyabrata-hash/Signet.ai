import Link from "next/link";

import { loginCta, nav, primaryCta } from "@/app/(marketing)/_content";
import { MobileNav } from "@/components/marketing/MobileNav";
import { SITE_NAME } from "@/lib/site";

/**
 * The sticky marketing nav. Server Component; only the mobile disclosure is
 * client. The three `nav` items are in-page anchors — Pricing and Security
 * are sections, not routes (specs/001 §6) — but `loginCta` and `primaryCta`
 * are real routes, wired in by specs/012 §3: `/login` as a quiet text link
 * (never a second pill — design-system §1, "One per screen"), `/signup` as
 * the primary CTA.
 *
 * Its height is --nav-height in app/globals.css, which is also what every
 * anchor target uses as its scroll offset.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <nav
        aria-label="Main"
        className="mx-auto flex h-(--nav-height) max-w-6xl items-center justify-between px-6 lg:px-8"
      >
        <a
          href="#top"
          className="text-base font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {SITE_NAME}
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {nav.map((anchor) => (
            <li key={anchor.href}>
              <a
                href={anchor.href}
                className="text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                {anchor.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-6 md:flex">
          {/* next/link, not a plain <a>: /login stays inside (marketing) —
              specs/002 §3.2's full-page-load reasoning was about /dashboard,
              which /login is not (specs/012 §3). */}
          <Link
            href={loginCta.href}
            className="text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {loginCta.label}
          </Link>
          <Link
            href={primaryCta.href}
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {primaryCta.label}
          </Link>
        </div>

        <MobileNav anchors={nav} cta={primaryCta} loginCta={loginCta} />
      </nav>
    </header>
  );
}
