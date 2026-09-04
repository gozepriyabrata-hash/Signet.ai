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
 */
export function Faq() {
  return (
    <section id="faq" className="border-t border-border">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
        <h2 className="text-2xl font-normal tracking-tight text-foreground">
          Questions
        </h2>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {faq.map((entry) => (
            <details
              key={entry.question}
              name="faq"
              className="group marker:text-muted-foreground"
            >
              <summary className="cursor-pointer list-item py-5 pl-2 text-base font-normal text-foreground transition-colors duration-150 ease-out hover:text-body-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                {entry.question}
              </summary>
              <p className="pb-5 pl-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                {entry.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
