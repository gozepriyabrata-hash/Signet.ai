import type {
  Cta,
  FaqEntry,
  FeaturePanel,
  FooterColumn,
  Logo,
  NavAnchor,
  PolicySection,
  PricingTier,
  ProofBlock,
  Social,
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

/**
 * The nav labels come from the landing-page wireframe.
 *
 * Two of them had no destination drawn beside them, so they point at the
 * nearest thing that actually exists rather than at a page nobody has written:
 * "Policy" at the published privacy policy (specs/013), "Research" at the
 * second feature band (`features[1]`, id `clip-flow`). "How it works" points
 * at `WorkflowArc`'s section id, not the first feature band — specs/017
 * reinstated the step rail alongside the feature bands, and the two sections
 * briefly claimed the same `id="how-it-works"` the moment both were composed
 * on the page together (a duplicate-id bug, not a content change); the first
 * feature band's `id` moved to `avatar-video` instead. `StepRail` (which had
 * held `id="how-it-works"` since) was later removed from the page's
 * composition on request and left dormant; the id moved again, onto
 * `WorkflowArc`, the page's other "seven steps" section, so this link and the
 * hero's "See the seven steps" link keep a real destination. "Research"
 * pointed at the FAQ until that section was dropped from the page; specs/016
 * §4 explicitly rejects removing the label itself just because it is
 * inconvenient to wire, so it moved rather than disappeared. If either grows
 * a real page later, change the href here and nowhere else.
 *
 * "Pricing" and "Security" are both gone from the nav — the wireframe does not
 * have "Pricing", and "Security" lost its section on the page — and a nav
 * anchor with no section to land on is worse than a missing link. The
 * PricingPreview and SecurityNote components and their tests are untouched and
 * still pass — neither section is composed into the page today.
 */
export const nav = [
  { href: "#clip-flow", label: "Research" },
  { href: "/legal/privacy", label: "Policy" },
  { href: "#how-it-works", label: "How it works" },
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
  label: "Get started",
} as const satisfies Cta;

/** The nav's quiet counterpart to `primaryCta` — not a second pill (design-system §1: "One per screen"). */
export const loginCta = {
  href: "/login",
  label: "Log in",
} as const satisfies Cta;

/**
 * The nav's pill, labelled from the wireframe's top-right button.
 *
 * It points at `/signup`, not `/dashboard`, for the reason recorded on
 * `primaryCta` above: `/dashboard` is gated behind a real session (specs/011),
 * so a logged-out visitor clicking a button that says "Workspace" would be
 * bounced to `/login` — not what the label promised. Returning users have the
 * quiet `loginCta` link beside it.
 */
export const workspaceCta = {
  href: "/signup",
  label: "Workspace",
} as const satisfies Cta;

export const hero = {
  /** The two-tone headline device: the first clause in --foreground, the closing clause in --body-foreground. */
  headline: {
    lead: "Generate your own avatar videos, full videos into short clips,",
    trail: "all in one workspace.",
  },
  subhead:
    "Your face and voice, without recording. Reply to brands and clients with personal avatar videos that build trust and close deals while you sleep.",
  /**
   * The wireframe's hero panel: "a small 3d video which is always running in a
   * loop". `src` is deliberately absent — the same call ReservedFrame makes,
   * because placeholder art is worse than no art. Drop an .mp4 in /public,
   * point `src` at it, add a `poster`, and the panel starts playing; the box
   * never changes size, so nothing shifts.
   */
  loop: {
    alt: "A looping film of an avatar video being generated in the workspace.",
    width: 1280,
    height: 720,
  },
  /**
   * Ambient, decorative motion behind the hero — atmosphere, never a product
   * screenshot (unlike `loop` above, which is reserved for the real thing and
   * stays empty until it exists). Reused verbatim for `finalCtaAmbientVideo`
   * below, the same one clip in both places.
   */
  ambientVideo: {
    src: "https://cdn.sceneai.art/Hero%20Section%20Video/50b4f304-cdca-4e12-8735-580d225834be.mp4",
  },
} as const;

/**
 * The closing CTA band's own ambient video — the same clip as `hero.ambientVideo`.
 * Two other stock clips were supplied alongside this one, proposed as
 * backgrounds for floating "AI chat"/"AI transcription" UI mockups over the
 * two feature sections; that placement was rejected (Signet has neither
 * feature, and `FeatureSplit.tsx`'s `ReservedFrame` placeholders exist
 * specifically so this page never fakes a screenshot), so those two clips are
 * unused.
 *
 * Dormant, not deleted: the video behind FinalCta was removed on request
 * (page.tsx no longer renders it), but AmbientEqualizer's bars and FinalCta's
 * own text/CTA are unchanged, and this constant stays here in case the video
 * is wanted back.
 */
export const finalCtaAmbientVideo = {
  src: "https://cdn.sceneai.art/Hero%20Section%20Video/50b4f304-cdca-4e12-8735-580d225834be.mp4",
} as const;

/**
 * The FAQ section's own ambient video — the same clip again, on request.
 * Purely decorative behind FaqScroller's rows; the cards themselves are
 * opaque (`bg-surface`), so the video only shows in the section's own
 * padding and the gaps around the cards, never behind the text.
 */
export const faqAmbientVideo = {
  src: "https://cdn.sceneai.art/Hero%20Section%20Video/50b4f304-cdca-4e12-8735-580d225834be.mp4",
} as const;

/**
 * The two feature bands' shared ambient video — the same clip again, on
 * request. One video behind both bands together, not one per band: since
 * `ColorGridTransition` was removed, the two sections sit directly adjacent,
 * and a seam between two independently-playing clips would read as a glitch
 * rather than one continuous backdrop.
 */
export const featuresAmbientVideo = {
  src: "https://cdn.sceneai.art/Hero%20Section%20Video/50b4f304-cdca-4e12-8735-580d225834be.mp4",
} as const;

/**
 * The two feature bands, in the order the wireframe stacks them, with the
 * visual alternating side so the page does not read as one column of boxes.
 *
 * Neither carries a paragraph, because the wireframe does not give them one
 * and this file does not invent copy (specs/002 §3.12). `FeaturePanel.body` is
 * optional precisely so the slot exists the day real copy is written.
 *
 * The first band's `id` is `avatar-video`, not `how-it-works` — specs/017
 * reinstated the step rail (`StepRail.tsx`, `id="how-it-works"`) onto the same
 * page as these bands, and the two sections collided on the same DOM id the
 * moment both were composed together. This is a plumbing fix, not a content
 * decision: only the `id` moved, the label and title below are unchanged.
 */
export const features = [
  {
    id: "avatar-video",
    label: "Avatar video generation",
    title: "Your face, your voice, in every video you never recorded.",
    media: {
      alt: "An avatar video being generated from a saved face and voice preset.",
      width: 960,
      height: 960,
    },
    mediaSide: "start",
  },
  {
    id: "clip-flow",
    label: "Clip flow",
    title: "One long video hides ten short ones. We find them.",
    media: {
      alt: "A long video broken into short vertical clips, each with its own frame.",
      width: 960,
      height: 960,
    },
    mediaSide: "end",
  },
] as const satisfies readonly FeaturePanel[];

/**
 * Ships empty — a customer logo needs a customer, and permission.
 *
 * Annotated rather than `as const`: an empty array under `as const` is the
 * empty tuple `readonly []`, which makes the rendering branch in LogoStrip
 * unreachable and uncompilable. The explicit type keeps the dormant markup
 * type-checked so it still works the day real logos land.
 */
export const logos: readonly Logo[] = [];

/**
 * WorkflowMarquee's ticker band — decorative branding copy, deliberately
 * decoupled from `steps` above. `steps` still drives StepRail/WorkflowArc and
 * still names the real seven-step workflow; the ticker is stylistic creator-
 * pipeline wordplay chosen for tone, not a second, competing statement of the
 * product's actual steps.
 *
 * `tickerWords` is the one export WorkflowMarquee reads. Swapping the whole
 * page's ticker tone is a one-line change: point it at a different key here.
 */
export const tickerWordSets = {
  primary: [
    "SCRIPT",
    "AVATAR",
    "RECORD",
    "CLIP",
    "CAPTION",
    "POST",
    "GROW",
  ],
  playful: [
    "TYPE IT",
    "CLONE IT",
    "ROLL IT",
    "CUT IT",
    "HOOK IT",
    "DROP IT",
    "BLOW UP",
  ],
} as const;

export const tickerWords: readonly string[] = tickerWordSets.primary;

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
    question: "What does this actually do?",
    answer:
      "Upload a client report — PDF, sheet, whatever. It turns the numbers into a 90-second video with your face and voice, plus an email.",
  },
  {
    question: "Who's it for?",
    answer:
      "Anyone sending the same report to a lot of people and knowing most won't read it. Agencies, advisors, account managers, CS teams.",
  },
  {
    question: "What do I need to start?",
    answer:
      "A report file and two minutes of you on camera — phone is fine. Setup takes 10–15 minutes, once.",
  },
  {
    question: "Do I configure it before every send?",
    answer:
      "No. The workspace is set up once. After that: drop the report, review the script, approve.",
  },
  {
    question: "Can I edit what the AI writes?",
    answer:
      "Yes — step four is a plain text box. Numbers come out accurate, tone sometimes flat. Most people just rewrite the first line.",
  },
  {
    question: "Can it send on a schedule or in bulk?",
    answer:
      "Bulk, yes — each recipient gets their own numbers. Schedule, partly — you can set a window, but the approval gate stays. Nothing sends while you sleep.",
  },
  {
    question: "What happens to my report?",
    answer:
      "Only the figures get pulled. The file stays in your workspace, never goes into training, and never gets attached to the outgoing email.",
  },
  {
    question: "Whose face and voice are in the video?",
    answer:
      "Yours, built from your two minutes — not a stock presenter. A colleague can add theirs and revoke it anytime.",
  },
  {
    question: "What if a number's wrong?",
    answer:
      "Numbers are pulled straight from the file, not written. Click any number in the preview and it shows you the source cell.",
  },
  {
    question: "What's next, and who do I ping if it breaks?",
    answer:
      "Coming up: CRM-triggered sends, template library, Spanish and German. If something breaks, hit the in-app issue button — it attaches your workspace state automatically.",
  },
] as const satisfies readonly FaqEntry[];

export const finalCta = {
  title: "Film once. Never film again.",
  body: "Two minutes of footage becomes a studio-quality presence that never tires, fumbles, or asks for a reshoot.",
  bullets: [
    "No lighting setup, no wardrobe panic, no fourteenth take",
    "Speak 29 languages in your own voice — open the markets you've been ignoring",
    "Identical in video #4 and video #400. Zero drift.",
  ],
  /**
   * This section's own CTA — separate from `primaryCta` (still the link
   * target everywhere else) because the label here is specific to this
   * closing pitch, not the site-wide "Get started".
   */
  cta: {
    href: "/signup",
    label: "Build my avatar",
  },
} as const;

/**
 * The footer's own line under the wordmark — deliberately separate from
 * `SITE_TAGLINE` (lib/site.ts), which also drives the page's meta
 * description, OG/Twitter tags and JSON-LD: this is a closing-CTA line for a
 * human reading the footer, not description copy for a search result or link
 * preview.
 */
export const footerTagline =
  "Your scrolling ends here. Your first video starts now — one click, one avatar, one clip they'll finish. Shall we?" as const;

export const footer = {
  columns: [
    {
      heading: "Product",
      links: [{ href: "#how-it-works", label: "How it works" }],
    },
    {
      heading: "Solution",
      links: [
        { href: "#avatar-video", label: "Avatar videos" },
        { href: "#clip-flow", label: "Short clips" },
      ],
    },
    {
      heading: "Company",
      links: [
        { href: "/signup", label: "Workspace" },
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
 * The footer's bottom bar: the wireframe's social marks, copyright and
 * language slot.
 *
 * `language` is a plain statement of the language this page is written in, not
 * a picker. There is no i18n in this product, and a select that changes
 * nothing is a lie told in a widget.
 */
export const footerBottom = {
  copyright: "signet@2026",
  language: "English",
} as const;

/**
 * Ships empty, for the same reason as `logos` and `testimonials`: a footer
 * link to an account that does not exist is a dead end. Add the real handles
 * here and the row of marks appears in the bottom bar — the markup is already
 * written and type-checked.
 */
export const socials: readonly Social[] = [];

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
