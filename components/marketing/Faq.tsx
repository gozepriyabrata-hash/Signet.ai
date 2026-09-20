import { Plus } from "lucide-react";

import { faq } from "@/app/(marketing)/_content";

/**
 * The FAQ, built from native <details>/<summary>.
 *
 * Zero JavaScript. This is what the element is actually for — disclosing prose
 * — and it earns find-in-page discoverability for free in Chromium. The
 * opposite call is made for the nav in MobileNav.tsx, because a nav is
 * command-centric and that is the case <details> is wrong for.
 *
 * The native marker is restyled via ::marker and never removed. Firefox folds
 * the marker into the summary's accessible name; leaving it in place keeps
 * that quirk cosmetic instead of costing users the open/closed state.
 * See specs/002-landing-page.md §3.5.
 *
 * The plus-to-x icon and the smooth-height answer body are both pure CSS on
 * top of this same native element — Tailwind's `group-open:` variant targets
 * an ancestor `<details open>` directly, and `.faq-body` in app/globals.css
 * does the grid-template-rows 0fr/1fr trick. No state, no click handler: the
 * zero-JS decision this component is built on is unchanged.
 */
export function Faq() {
  return (
    <section id="faq" className="border-t border-border">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
        <h2 className="text-2xl font-normal tracking-tight text-foreground">
          Questions
        </h2>

        <div className="mt-10 divide-y divide-border overflow-hidden rounded-md border border-border">
          {faq.map((entry) => (
            <details
              key={entry.question}
              name="faq"
              className="group marker:text-muted-foreground"
            >
              <summary className="relative cursor-pointer list-item py-5 pl-2 pr-10 text-base font-normal text-foreground transition-colors duration-150 ease-out hover:text-body-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                {/* The icon is absolutely positioned rather than a flex sibling
                    of the question text: <summary>'s native ::marker only
                    shares its line with a plain inline text run — introducing
                    a second box (flex or otherwise) as content pushes the
                    marker onto a line of its own in Chromium. Positioning
                    the icon out of normal flow leaves the question as the
                    one, unbroken inline text node the marker expects. */}
                {entry.question}
                <Plus
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45"
                />
              </summary>
              <div className="faq-body">
                <div className="overflow-hidden">
                  <p className="pb-5 pl-2 pr-4 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                    {entry.answer}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
