import Link from "next/link";

import { loginCta, nav, workspaceCta } from "@/app/(marketing)/_content";
import { MobileNav } from "@/components/marketing/MobileNav";
import { NavLogo } from "@/components/marketing/NavLogo";
import { SITE_NAME } from "@/lib/site";

const LINK_CLASS =
  "text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/**
 * The sticky marketing nav. Server Component; only the mobile disclosure is
 * client.
 *
 * The four labels — Research, Policy, Security, How it works — are the
 * wireframe's, and `nav` in _content.ts records where the two without a drawn
 * destination point. Most are in-page anchors, but "Policy" is a real route
 * (`/legal/privacy`, specs/013), so an item is rendered as `next/link` when its
 * href is a path and a plain `<a>` when it is a fragment. Both stay inside the
 * (marketing) root layout, so neither is a full page load.
 *
 * `loginCta` is a quiet text link and `workspaceCta` is the one --primary pill
 * — design-system §1, "One per screen". Neither points at the gated
 * `/dashboard` (specs/012 §3).
 *
 * Its height is --nav-height in app/globals.css, which is also what every
 * anchor target uses as its scroll offset.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <nav
        aria-label="Main"
        className="mx-auto flex h-(--nav-height) max-w-6xl items-center justify-between gap-8 px-6 lg:px-8"
      >
        <NavLogo label={SITE_NAME} />

        <ul className="hidden items-center gap-8 md:flex">
          {nav.map((anchor) => (
            <li key={anchor.href}>
              {anchor.href.startsWith("#") ? (
                <a href={anchor.href} className={LINK_CLASS}>
                  {anchor.label}
                </a>
              ) : (
                <Link href={anchor.href} className={LINK_CLASS}>
                  {anchor.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-6 md:flex">
          {/* next/link, not a plain <a>: /login stays inside (marketing) —
              specs/002 §3.2's full-page-load reasoning was about /dashboard,
              which /login is not (specs/012 §3). */}
          <Link href={loginCta.href} className={LINK_CLASS}>
            {loginCta.label}
          </Link>
          <Link
            href={workspaceCta.href}
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {workspaceCta.label}
          </Link>
        </div>

        <MobileNav anchors={nav} cta={workspaceCta} loginCta={loginCta} />
      </nav>
    </header>
  );
}
