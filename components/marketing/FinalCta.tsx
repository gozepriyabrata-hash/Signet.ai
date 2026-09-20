import Link from "next/link";

import { finalCta, testimonials } from "@/app/(marketing)/_content";

/**
 * The closing call to action — the second and last appearance of the one
 * primary CTA (docs/screens.md).
 *
 * Bone-white --primary pill, never tinted. Design-system §1 calls a tinted
 * primary CTA "off-brand here in a way that is hard to un-see", and that rule
 * has no landing-page carve-out.
 *
 * `finalCta.cta` (its own `{href, label}`, not `primaryCta`) is this
 * section's specific pitch — "Build my avatar" — rather than the site-wide
 * "Get started" label `primaryCta` carries everywhere else.
 *
 * Skipped when a testimonial is present, because Testimonials already pairs a
 * CTA with the quote and two identical CTAs in a row is noise.
 */
export function FinalCta() {
  if (testimonials.length > 0) return null;

  return (
    <section aria-label={finalCta.cta.label} className="border-t border-border">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center lg:px-8 lg:py-24">
        <h2 className="text-4xl font-light leading-[1.05] tracking-[-0.02em] text-foreground">
          {finalCta.title}
        </h2>
        <p className="mx-auto mt-6 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {finalCta.body}
        </p>

        <ul className="mx-auto mt-8 flex max-w-[50ch] flex-col gap-3 text-left">
          {finalCta.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground"
            >
              <span aria-hidden="true" className="text-muted-foreground">
                &rarr;
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <Link
          href={finalCta.cta.href}
          className="mt-10 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {finalCta.cta.label}
        </Link>
      </div>
    </section>
  );
}
