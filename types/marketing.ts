/**
 * Types for the landing page's content layer.
 *
 * Everything the marketing shell renders is a typed constant in
 * app/(marketing)/_content.ts. There is no fetch on this page, and there never
 * will be one — see specs/002-landing-page.md §3.1.
 */

export interface NavAnchor {
  /** In-page fragment, e.g. "#pricing". Pricing and Security are sections, not routes. */
  href: `#${string}`;
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
