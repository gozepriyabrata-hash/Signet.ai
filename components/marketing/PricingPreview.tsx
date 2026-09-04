import Link from "next/link";

import { pricing, primaryCta, tiers } from "@/app/(marketing)/_content";

/**
 * The pricing preview.
 *
 * `tiers` ships empty — price points are a business decision, and placeholder
 * numbers have a habit of surviving into launch. But unlike the logo strip and
 * the testimonial, this section cannot return null: #pricing is one of the
 * three nav anchors, and an anchor pointing at nothing is a broken link.
 *
 * So the band always renders its heading and an honest note, and only the tier
 * grid is dormant. The markup and types are ready for the day the numbers are.
 */
export function PricingPreview() {
  return (
    <section id="pricing" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        <h2 className="text-2xl font-normal tracking-tight text-foreground">
          {pricing.title}
        </h2>
        <p className="mt-4 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {pricing.body}
        </p>

        {tiers.length > 0 ? (
          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {tiers.map((tier) => (
              <li
                key={tier.name}
                className="flex flex-col rounded-xs border border-border bg-surface p-6"
              >
                <h3 className="text-base font-normal text-foreground">
                  {tier.name}
                </h3>
                <p className="mt-4 text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {tier.price}
                </p>
                <p className="mt-1 text-sm font-light text-body-foreground">
                  {tier.cadence}
                </p>
                <p className="mt-4 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                  {tier.summary}
                </p>
                <ul className="mt-6 flex-1 space-y-2">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href={tier.cta.href}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-light text-primary-foreground transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {tier.cta.label}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {primaryCta.label}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
