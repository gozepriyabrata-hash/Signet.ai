import { features, featuresAmbientVideo } from "@/app/(marketing)/_content";
import { AmbientEqualizer } from "@/components/marketing/AmbientEqualizer";
import { AmbientVideo } from "@/components/marketing/AmbientVideo";
import { FaqScroller } from "@/components/marketing/FaqScroller";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ProofPinned } from "@/components/marketing/ProofPinned";
import { Reveal } from "@/components/marketing/Reveal";
import { WorkflowArc } from "@/components/marketing/WorkflowArc";
import { WorkflowMarquee } from "@/components/marketing/WorkflowMarquee";
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
 * The page, restaged as a continuous cinematic scroll (specs/017): nav, hero,
 * a marquee of the seven step names, a pinned proof section, the two feature
 * bands, an arced gallery of the seven steps, the FAQ, the final CTA, and the
 * footer.
 *
 * `StepRail` and `SecurityBigType` were both removed from this composition on
 * request — they stay dormant, tested components (same precedent as
 * `LogoStrip`, `Testimonials` and `PricingPreview`), not deleted, in case
 * either is wanted again. `#how-it-works` — the id both the nav and the
 * hero's "See the seven steps" link point at — moved onto `WorkflowArc`'s
 * section instead of `StepRail`'s, since that's the page's other "seven
 * steps" content and a nav anchor with no section to land on is worse than a
 * missing link. Nothing pointed at `#security` — the nav already dropped that
 * label before this pass — so removing `SecurityBigType` leaves no dangling
 * anchor. `ColorGridTransition` (the pastel band between the two feature
 * bands) was also removed on request — its file is untouched and stays
 * importable, just not composed here.
 *
 * The FAQ section is `FaqScroller` (three looping horizontal card rows), not
 * the accordion `Faq` normally renders here — `Faq.tsx` and its test stay
 * exactly as they were, dormant on the same precedent, still owning `#faq`'s
 * id if `FaqScroller` is ever swapped back.
 *
 * Every other section below the hero is content that already existed in
 * `_content.ts` — `steps`, `proofBlocks`, `faq`, `finalCta` — and was simply
 * not composed here since specs/016 slimmed the page down to the wireframe's
 * eight sections. Nothing here invents a claim; specs/017 §3 records exactly
 * what changed and why. `LogoStrip`, `Testimonials` and `PricingPreview` stay
 * dormant, on the same precedent specs/016 §4 set: kept, tested, not
 * composed, because their content (`logos`, `testimonials`, `tiers`) still
 * does not exist.
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
        <WorkflowMarquee />
        <ProofPinned />

        {/* One continuous ambient video behind both feature bands, not one
            per band: since ColorGridTransition was removed the two sections
            sit directly adjacent, and two independently-playing clips would
            show a visible seam at the border between them. Same pattern as
            FinalCta's wrapper below — video at -z-20, gradient overlay for
            the heading/label text that sits directly on the section
            background (ReservedFrame's own box is opaque either way). */}
        <div className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20">
            <AmbientVideo src={featuresAmbientVideo.src} className="absolute inset-0 size-full" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/25 to-background/60" />
          </div>
          {features.map((panel) => (
            <Reveal key={panel.id}>
              <FeatureSplit panel={panel} />
            </Reveal>
          ))}
        </div>

        <WorkflowArc />

        <Reveal>
          <FaqScroller />
        </Reveal>

        {/* AmbientEqualizer is the decorative background for FinalCta alone
            (specs/017) — a relative wrapper here, not inside FinalCta.tsx
            itself, so the untouched component stays exactly as it was. The
            ambient video that used to sit behind it was removed on request;
            the equalizer's own animation and FinalCta's text/CTA are
            unchanged. */}
        <div className="relative isolate overflow-hidden">
          <AmbientEqualizer />
          <Reveal>
            <FinalCta />
          </Reveal>
        </div>
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
