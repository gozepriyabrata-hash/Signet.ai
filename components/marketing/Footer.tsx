import { footer } from "@/app/(marketing)/_content";
import { SITE_NAME } from "@/lib/site";

/**
 * The footer.
 *
 * No newsletter field, no cookie banner, no third-party tag. A product whose
 * proposition is "a human approves every send" should not close by harvesting
 * addresses (specs/002 §3.11).
 */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="flex flex-wrap gap-x-16 gap-y-10">
          {footer.columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-sm font-normal text-foreground">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.href}`}>
                    <a
                      href={link.href}
                      className="text-sm font-light tracking-[0.01em] text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-sm font-light text-muted-foreground">
            {SITE_NAME}
          </p>
          <p className="text-sm font-light text-muted-foreground">
            {footer.legal}
          </p>
        </div>
      </div>
    </footer>
  );
}
