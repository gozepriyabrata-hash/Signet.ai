import Link from "next/link";

import { finalCta, primaryCta, testimonials } from "@/app/(marketing)/_content";

/**
 * A named testimonial sitting beside a CTA — never an isolated carousel, and
 * every quote carries a name, a role and a quantified outcome
 * (docs/screens.md).
 *
 * Renders nothing while `testimonials` is empty, which it is. A quote with an
 * invented name is worse than a page with no quote (specs/002 §3.12).
 */
export function Testimonials() {
  const testimonial = testimonials[0];
  if (!testimonial) return null;

  return (
    <section aria-label="Customer story" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
        <figure>
          <blockquote className="text-2xl font-light leading-snug tracking-tight text-foreground">
            {testimonial.quote}
          </blockquote>
          <figcaption className="mt-6 text-sm font-light tracking-[0.01em] text-body-foreground">
            <span className="text-foreground">{testimonial.name}</span>
            {" · "}
            {testimonial.role}, {testimonial.company}
            <span className="mt-2 block text-muted-foreground">
              {testimonial.outcome}
            </span>
          </figcaption>
        </figure>

        <div className="rounded-xs border border-border bg-surface p-6">
          <h2 className="text-base font-normal text-foreground">
            {finalCta.title}
          </h2>
          {/* --muted-foreground on --surface is 4.30:1 and fails the 4.5:1
              floor, so secondary text inside a card steps up to
              --body-foreground (docs/design-system.md §1). */}
          <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {finalCta.body}
          </p>
          <Link
            href={primaryCta.href}
            className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {primaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
