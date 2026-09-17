/**
 * Types for the landing page's content layer.
 *
 * Everything the marketing shell renders is a typed constant in
 * app/(marketing)/_content.ts. There is no fetch on this page, and there never
 * will be one — see specs/002-landing-page.md §3.1.
 */

export interface NavAnchor {
  /**
   * An in-page fragment, e.g. "#security", or a marketing route for a nav item
   * whose destination is a real page — "Policy" is `/legal/privacy`, which is
   * a route (specs/013), not a section. Everything else on this page is still
   * a section, so the fragment form stays first.
   */
  href: `#${string}` | `/${string}`;
  label: string;
}

export interface Cta {
  href: string;
  label: string;
}

/**
 * A customer logo. Rendered uniformly in --muted-foreground, never in colour
 * (docs/design-system.md §6). Ships empty until real, consented logos exist.
 */
export interface Logo {
  name: string;
  /** Path to a monochrome SVG under /public. */
  src: string;
  width: number;
  height: number;
}

export interface Step {
  id: string;
  label: string;
  /** One line on what this step does. */
  detail: string;
}

export interface ProofBlock {
  id: string;
  title: string;
  body: string;
  /** Reserved frame dimensions until the real screenshot exists. */
  shot: { alt: string; width: number; height: number; src?: string };
}

/**
 * A named testimonial with a quantified outcome. Ships empty: invented social
 * proof is worse than none, and a real name needs consent.
 */
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  /** The number that makes the quote worth printing. */
  outcome: string;
}

/**
 * Ships empty. Price points are a business decision, and placeholder numbers
 * have a habit of surviving into launch.
 */
export interface PricingTier {
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: readonly string[];
  cta: Cta;
  highlighted: boolean;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FooterColumn {
  heading: string;
  links: readonly Cta[];
}

/** One section of `/legal/privacy` (specs/013). */
export interface PolicySection {
  heading: string;
  body: string;
  points?: readonly string[];
}

/**
 * One of the two feature bands on the landing page.
 *
 * `body` is optional on purpose: the wireframe gives these sections a label, a
 * heading and a visual, and no paragraph. An optional field is how the slot
 * stays available without this file inventing prose to fill it — the same
 * reasoning that ships `logos` and `testimonials` empty.
 */
export interface FeaturePanel {
  /** Doubles as the section's anchor id, so the nav and footer can point at it. */
  id: string;
  /** The small eyebrow above the heading — "Avatar video generation". */
  label: string;
  title: string;
  body?: string;
  /** Reserved frame dimensions until the real artwork exists. */
  media: { alt: string; width: number; height: number; src?: string };
  /** Which side the visual sits on. The two bands alternate. */
  mediaSide: "start" | "end";
}

/**
 * A social account in the footer's bottom bar.
 *
 * Ships empty, like `logos` and `testimonials`: a link to an account that does
 * not exist yet is a broken promise in the footer of a product whose whole
 * proposition is that nothing goes out unchecked. Fill in `socials` in
 * `_content.ts` and the row appears.
 */
export interface Social {
  /** Accessible name — "LinkedIn". */
  name: string;
  /** The single-letter mark shown in the bar — "In". */
  mark: string;
  href: string;
}
