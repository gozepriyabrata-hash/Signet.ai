import type {
  Cta,
  FaqEntry,
  FooterColumn,
  Logo,
  NavAnchor,
  PolicySection,
  PricingTier,
  ProofBlock,
  Step,
  Testimonial,
} from "@/types";

/**
 * Every word, logo, metric and price on the landing page.
 *
 * Typed constants, never a fetch (specs/002 §3.12). Three arrays ship empty on
 * purpose — `logos`, `testimonials` and `tiers`. Their sections render nothing
 * while empty rather than showing invented social proof or unapproved pricing.
 * That is the mechanism that makes docs/screens.md's "never invented social
 * proof" enforceable instead of aspirational.
 */

export const nav = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
] as const satisfies readonly NavAnchor[];

/**
 * Retargeted from `/dashboard` to `/signup` when specs/011 gated `/dashboard`
 * behind a real session — an unauthenticated visitor clicking "Open the
 * workspace" would otherwise land on `/login`, which is not what the label
 * promised. `/signup` and `/login` both live in `(marketing)` (specs/009,
 * specs/011), so every use of this constant now stays inside one root layout
 * — see the `next/link` note on each component that renders it.
 */
export const primaryCta = {
  href: "/signup",
  label: "Create a workspace",
} as const satisfies Cta;

/** The nav's quiet counterpart to `primaryCta` — not a second pill (design-system §1: "One per screen"). */
export const loginCta = {
  href: "/login",
  label: "Log in",
} as const satisfies Cta;

export const secondaryCta = {
  href: "#how-it-works",
  label: "See how it works",
} as const satisfies Cta;

export const hero = {
  /** The two-tone headline device: line one in --foreground, line two in --body-foreground. */
  headline: {
    lead: "Turn any client report into a personalised video and email.",
    trail: "Approved by you, never auto-sent.",
  },
  subhead:
    "Upload the report. Review the package. Send it. Every video, every word of every email, and every call to action passes a human before a client ever sees it.",
  shot: {
    alt: "The Review screen: a rendered avatar video, the personalised email beside it, the call to action, and the original client report attached.",
    width: 1280,
    height: 800,
  },
} as const;

/**
 * Ships empty — a customer logo needs a customer, and permission.
 *
 * Annotated rather than `as const`: an empty array under `as const` is the
 * empty tuple `readonly []`, which makes the rendering branch in LogoStrip
 * unreachable and uncompilable. The explicit type keeps the dormant markup
 * type-checked so it still works the day real logos land.
 */
export const logos: readonly Logo[] = [];

export const stepsIntro = {
  title: "Seven steps, one package",
  body: "The same rail you see inside the product. Nothing is skipped, and nothing moves forward until the step before it is done.",
} as const;

export const steps = [
  { id: "report", label: "Report", detail: "Upload a PDF or DOCX. We parse it." },
  { id: "recipient", label: "Recipient", detail: "Who it is for, and what they care about." },
  { id: "analysis", label: "Analysis", detail: "Summary, insights and talking points — all editable." },
  { id: "video", label: "Video", detail: "Your avatar and voice, from a saved preset." },
  { id: "email", label: "Email", detail: "Subject, body and CTA, with a live preview." },
  { id: "review", label: "Review", detail: "The whole package in one frame." },
  { id: "send", label: "Send", detail: "Only after you approve it. Never before." },
] as const satisfies readonly Step[];

export const proofBlocks: readonly ProofBlock[] = [
  {
    id: "human-gate",
    title: "Nothing sends itself",
    body: "Every competitor claims AI generation. The difference here is the gate: a package reaches a client only after a person has watched the video, read the email and pressed approve. There is no scheduled send, no send-on-generate, and no URL that means “sending”.",
    shot: {
      alt: "The Review screen's approval control, showing the package summary above an explicit approve step.",
      width: 960,
      height: 640,
    },
  },
  {
    id: "editable",
    title: "Every AI word is editable",
    body: "The summary, the insights, the talking points, the script, the subject line, the body and the call to action are all real form fields with a regenerate button beside them. Nothing the model writes is presented to you as finished prose you cannot touch.",
    shot: {
      alt: "An AI-generated email subject line in an editable field, with an “AI generated” badge and a regenerate action.",
      width: 960,
      height: 640,
    },
  },
  {
    id: "configure-once",
    title: "Configure once, in Settings",
    body: "Avatars, voices, video templates, script styles, branding, guardrails, calls to action and signatures are set up once and saved as presets. A workflow step shows you three to five choices, not thirty-nine.",
    shot: {
      alt: "The avatar and voice settings screen, showing saved presets that the workflow reads from.",
      width: 960,
      height: 640,
    },
  },
];

/** Ships empty — a named testimonial with a real number needs a real customer. */
export const testimonials: readonly Testimonial[] = [];

export const pricing = {
  title: "Pricing",
  body: "Per-seat, with a monthly allowance of rendered minutes. Full pricing is published before general availability.",
} as const;

/** Ships empty — price points are a business decision, not a placeholder. */
export const tiers: readonly PricingTier[] = [];

export const security = {
  title: "Security",
  body: "Client reports and recipient details are the most sensitive things you will put into this product, and they are treated that way.",
  points: [
    "Recipient details are never placed in a URL, never written to logs, and never sent to a vendor you have not configured yourself.",
    "Reports are validated in the browser before upload — PDF and DOCX only, size-capped.",
    "Nothing is sent to a client without a recorded human approval.",
  ],
} as const;

export const faq = [
  {
    question: "Can it send on a schedule, or in bulk?",
    answer:
      "No. A package is sent from the Review screen, by a person, after an explicit approval. There is no scheduler and no bulk send, because both would mean a client receives something nobody read.",
  },
  {
    question: "What happens to the report I upload?",
    answer:
      "It is parsed to produce the summary and talking points, and the original file is attached to the outgoing package. The recipient receives the report you uploaded, not a rewrite of it.",
  },
  {
    question: "Can I edit what the AI writes?",
    answer:
      "All of it. Summary, insights, talking points, script, subject, body and call to action are editable fields with a regenerate option. Once you edit something, it stops being labelled as AI generated — it is yours.",
  },
  {
    question: "Whose voice and face are in the video?",
    answer:
      "Yours, or a stock avatar and voice you pick in Settings. You set this up once as a preset; the workflow only chooses between presets you have already approved.",
  },
  {
    question: "Do I need to configure it before every send?",
    answer:
      "No. Branding, guardrails, signatures and calls to action live in Settings and apply automatically. A workflow step never asks you more than a handful of questions.",
  },
] as const satisfies readonly FaqEntry[];

export const finalCta = {
  title: "See the package before you send it.",
  body: "Create a workspace and walk a report through all seven steps. Nothing leaves the building without you.",
} as const;

export const footer = {
  columns: [
    {
      heading: "Product",
      links: [
        { href: "#how-it-works", label: "How it works" },
        { href: "#pricing", label: "Pricing" },
        { href: "#security", label: "Security" },
        { href: "#faq", label: "FAQ" },
      ],
    },
    {
      heading: "Company",
      links: [
        { href: "/signup", label: "Create a workspace" },
        { href: "/login", label: "Log in" },
      ],
    },
    {
      heading: "Legal",
      links: [{ href: "/legal/privacy", label: "Privacy" }],
    },
  ],
  // Privacy published (specs/013), on the trigger specs/001 §6 named: real
  // account data now persists server-side (specs/011). Terms is still
  // deferred — no checkout, no contract, nothing yet that needs one.
  legal: "Terms of service are published before general availability.",
} as const satisfies { columns: readonly FooterColumn[]; legal: string };

/**
 * `/legal/privacy` (specs/013). Grounded in what this product actually does
 * today, not boilerplate — see specs/013 §3 for the sourcing of every claim.
 * Written by the engineering team, not reviewed by counsel; §7 says so.
 */
const privacyPolicySections: readonly PolicySection[] = [
    {
      heading: "Account information",
      body: "Creating a workspace collects your name, work email and company, and a password. The password is never stored or logged as plain text — it is hashed with a random, per-account salt before it touches a database, and the hash is never returned by anything the product renders. Your name, email and company are stored in our database and used to operate your workspace and sign you back in — nothing else.",
    },
    {
      heading: "Client reports and recipient details",
      body: "Uploading a report and describing a recipient (name, role, company, email, business priorities) is the core of the product, and it is the most sensitive information you put into it. It is never placed in a URL, never written to a log, and never sent to a vendor you have not configured yourself.",
      points: [
        "Report and recipient data does not persist on a server today — it lives only in your browser while you work, as part of the product's current development stage.",
        "A sent package's video, email and attached report exist because you explicitly approved sending them, on the Review screen, to the recipient you specified.",
      ],
    },
    {
      heading: "Cookies and local storage",
      body: "One cookie is essential: the signed session cookie that keeps you logged in. It is httpOnly (a script on the page cannot read it) and holds nothing but an internal account reference — no name, no email. Your theme and sidebar-width preferences are saved in your browser's local storage, not a cookie, and never leave your device.",
    },
    {
      heading: "What this product does not do",
      body: "No advertising or tracking cookies. No third-party analytics script. No selling or renting of your data, to anyone, ever. No AI vendor receives your data yet — the analysis, video and email generation you see today run on simulated output while that integration is still being built.",
    },
    {
      heading: "Retention and deletion",
      body: "There is no self-serve way to export or delete your account yet. That is a gap, not a design choice, and it is planned before general availability.",
    },
    {
      heading: "Security",
      body: "Passwords are hashed, never encrypted-and-reversible. Sessions are a signed, httpOnly cookie an attacker cannot read or forge without the server's own secret key. This describes the mechanism honestly; it is not a claim of any formal security certification or independent audit, because none has happened.",
    },
    {
      heading: "Where this policy stands",
      body: "This page is written by the team building the product, not reviewed by outside counsel, and it will be rewritten — with a real contact channel for privacy requests — before general availability. Until then, treat it as an accurate description of current behaviour rather than a binding legal document.",
    },
  ];

export const privacyPolicy = {
  title: "Privacy policy",
  updated: "3 September 2026",
  intro:
    "Signet is pre-general-availability. This page describes what the product actually does with your data today, in plain language, and is revised as the product changes — see \"Where this policy stands\" at the end before relying on it for anything formal.",
  sections: privacyPolicySections,
} as const;
