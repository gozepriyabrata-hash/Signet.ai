import { Faq } from "@/components/marketing/Faq";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { LogoStrip } from "@/components/marketing/LogoStrip";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingPreview } from "@/components/marketing/PricingPreview";
import { ProofBlocks } from "@/components/marketing/ProofBlocks";
import { SecurityNote } from "@/components/marketing/SecurityNote";
import { StepRail } from "@/components/marketing/StepRail";
import { Testimonials } from "@/components/marketing/Testimonials";
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
        <LogoStrip />
        <StepRail />
        <ProofBlocks />
        <Testimonials />
        <PricingPreview />
        <SecurityNote />
        <Faq />
        <FinalCta />
      </main>

      <Footer />

      {/* A plain <script>, not next/script: JSON-LD is structured data, not
          executable code. The escaping is the documented guard against a "<"
          in a value breaking out of the tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
