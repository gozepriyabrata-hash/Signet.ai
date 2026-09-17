import Link from "next/link";

import { footer, footerBottom, socials } from "@/app/(marketing)/_content";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const LINK_CLASS =
  "text-sm font-light tracking-[0.01em] text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/**
 * The footer, laid out from the wireframe: a wordmark block on the left, the
 * four link columns beside it, then a rule and a bottom bar carrying the
 * social marks, the copyright and the language.
 *
 * No newsletter field, no cookie banner, no third-party tag. A product whose
 * proposition is "a human approves every send" should not close by harvesting
 * addresses (specs/002 §3.11).
 *
 * The wireframe puts a graphic in the left block. There is no logo asset, and
 * placeholder art is worse than no art, so the block is the wordmark set large
 * with the product's one-line description under it — real content in the space
 * the drawing reserves.
 *
 * The social row renders only when `socials` has entries, which it does not
 * today. That is the same dormant-section mechanism as `logos` and
 * `testimonials`: markup written and type-checked, showing nothing until the
 * real thing exists.
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div>
            <p className="text-2xl font-normal tracking-tight text-foreground">
              {SITE_NAME}
            </p>
            <p className="mt-3 max-w-[32ch] text-sm font-light leading-relaxed tracking-[0.01em] text-muted-foreground">
              {SITE_TAGLINE}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {footer.columns.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <h2 className="text-sm font-normal text-foreground">
                  {column.heading}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.href}`}>
                      {/* Fragments stay plain anchors; paths go through
                          next/link, the same branch the nav makes. */}
                      {link.href.startsWith("#") ? (
                        <a href={link.href} className={LINK_CLASS}>
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className={LINK_CLASS}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-border pt-8">
          {socials.length > 0 ? (
            <ul className="flex items-center gap-5" aria-label="Social">
              {socials.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.href}
                    aria-label={social.name}
                    className="text-sm font-light text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    <span aria-hidden="true">{social.mark}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            // Keeps the copyright centred in the bar while the social row is
            // dormant, rather than letting it slide left and look misaligned.
            <span aria-hidden="true" />
          )}

          <p className="text-sm font-light text-muted-foreground">
            {footerBottom.copyright}
          </p>

          <p className="text-sm font-light text-muted-foreground">
            {footerBottom.language}
          </p>
        </div>

        <p className="mt-6 text-sm font-light text-muted-foreground">
          {footer.legal}
        </p>
      </div>
    </footer>
  );
}
