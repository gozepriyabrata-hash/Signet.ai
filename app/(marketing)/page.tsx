import { Fragment } from "react";

import { features } from "@/app/(marketing)/_content";
import { ColorGridTransition } from "@/components/marketing/ColorGridTransition";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal } from "@/components/marketing/Reveal";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

/**
 * The single most important line in this file.
 *
 * It turns "Landing. Static Server Component" from an intention into a build
 * failure: the first person who reaches for cookies(), headers(), searchParams
 * or an uncached fetch anywhere in this tree breaks `npm run build` rather than
 * quietly turning the front door into a per-request render.
 *
 * Verified: adding `await headers()` here fails the build with
 * "Route / with `dynamic = "error"` couldn't be rendered statically".
 * See specs/002-landing-page.md §3.1.
 */
export const dynamic = "error";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_TAGLINE,
};

/**
 * The page, composed to the landing-page wireframe: nav, hero with the looping
 * film panel, the two feature bands separated by the colour-grid transition,
 * and the footer.
 *
 * Seven sections the earlier page rendered — the logo strip, the seven-step
 * rail, the proof blocks, the testimonial, the pricing preview, the security
 * band and the FAQ — are no longer composed here. Their components and tests
 * are untouched and still pass; nothing was deleted, so re-adding one is a
 * single line. The nav and footer no longer carry a "Security" link, for the
 * same reason "Pricing" already didn't — see `nav` in `_content.ts`.
 *
 * "Research" is a wireframe-mandated label (specs/016 §4 explicitly rejects
 * dropping it just because it's inconvenient to wire), so removing the FAQ
 * it used to point at meant repointing it rather than deleting it — see
 * `nav` in `_content.ts`.
 */
export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-light focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <MarketingNav />

      <main id="main">
        <Hero />

        {features.map((panel, index) => (
          <Fragment key={panel.id}>
            {/* The wireframe's "color grid transition" sits between the two
                bands, not above the first one. Left out of the scroll-reveal:
                ColorGridTransition.tsx documents itself as deliberately
                static. */}
            {index > 0 ? <ColorGridTransition /> : null}
            <Reveal>
              <FeatureSplit panel={panel} />
            </Reveal>
          </Fragment>
        ))}
      </main>

      <Footer />

      {/* A plain <script>, not next/script: JSON-LD is structured data, not
          executable code. The escaping is the documented guard against a "<"
          in a value breaking out of the tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\u003c"),
        }}
      />
    </>
  );
}
