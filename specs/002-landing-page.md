---
Spec:        002
Title:       Landing page construction
Status:      accepted
Created:     2026-09-01
Supersedes:  —
---

# 002 · Landing page construction

Decides how `/` is built on Next.js 16, React 19 and Tailwind v4: what "static
Server Component" means concretely on this version, where the single client
boundary sits, how the in-page anchors behave now that Next.js has stopped
managing scroll behaviour, and how far the landing-only accent exception is
allowed to reach.

`docs/screens.md` already fixes *what the page shows*. `docs/design-system.md`
already fixes *how it looks*. Neither says how it is assembled, and on this
particular version stack the assembly is where the page goes wrong.

## 1. Problem

Spec [001](001-route-map.md) put a public landing page at `/` inside an
`app/(marketing)/` route group with its own root layout, and `docs/screens.md`
specifies its eleven bands of content and its one CTA. Six construction
questions are open, and every one of them has a plausible-looking wrong answer
that a build would happily accept:

1. **"Static Server Component" is no longer self-evident.** Next.js 16 ships
   two rendering models side by side, and neither one guarantees, on its own,
   that this page stays free of request-time work as sections accrete. Nothing
   currently fails the build if someone reaches for a runtime API in a footer.
2. **In-page anchors are the whole navigation.** Pricing, Security and
   How-it-works are `#hash` targets, not routes. Next.js 16 changed who owns
   `scroll-behavior`, and a sticky nav will park itself over every anchor
   target unless the offset is designed in.
3. **The client-JS boundary is undecided.** The mobile nav, the seven-step
   rail, the FAQ and the customary scroll-reveal animations each independently
   argue for `"use client"`. Granted individually, they turn a page with no
   data into the heaviest bundle in the repo.
4. **Two root layouts means two of everything.** There is no
   `app/layout.tsx` (spec 001). Fonts, `metadataBase`, the theme class and the
   `<html>` element are now duplicated concerns, and duplicating them wrongly
   is silent — a missing `metadataBase` is a build error, but a font loaded in
   the wrong shell is merely slow.
5. **The accent exception has no boundary.** `docs/screens.md` grants the
   landing page permission to use `--accent` as brand rather than as an AI
   signal. Permission without a limit is how a restrained page becomes a
   gradient one.
6. **The hero is the LCP element and the API for it changed.** `docs/screens.md`
   requires a real screenshot of the Review screen in the hero. The prop
   everyone reaches for to prioritise that image is deprecated in Next.js 16.

## 2. Constraints

### 2.1 From `CLAUDE.md`

Rule 6 (Tailwind v4 only, tokens in `@theme`, no `tailwind.config.js`, no
arbitrary hexes), rule 8 (Server Components by default, `"use client"` pushed
to the leaf), rule 9 (four states on every async surface), rule 10 (the
accessibility floor, including `prefers-reduced-motion`) and rule 11 (recipient
data is client PII) all bind here. Rule 1 binds indirectly: the landing page is
not a place to introduce a second configuration surface, so the nav carries
anchors and nothing else.

### 2.2 From Next.js 16

**Caching is opt-in, and the two models are not interchangeable.** Cache
Components is a flag, not a default:

> Unlike the implicit caching found in previous versions of the App Router,
> caching with Cache Components is entirely opt-in. All dynamic code in any
> page, layout, or API route is executed at request time by default […]
> — [Next.js 16 release notes](https://nextjs.org/blog/next-16)

and turning it on is a whole-app commitment:

> Enabling `cacheComponents` is not a rename-only change: it can surface build
> errors for uncached data outside of `<Suspense>` and requires adopting the
> Cache Components model.
> — [Upgrading to version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)

Without the flag, the previous model's route segment config still applies, and
it offers an assertion rather than a hope:

> **`'error'`**: Force prerendering and cache the data of a layout or page by
> causing an error if any components use Request-time APIs or uncached data.
> — [Caching and Revalidating (Previous Model)](https://nextjs.org/docs/app/guides/caching-without-cache-components)

**Next.js no longer manages `scroll-behavior`.**

> In **Next.js 16**, this behavior has changed. By default, Next.js will **no
> longer override** your `scroll-behavior` setting during navigation. […] **If
> you want Next.js to perform this override** (the previous default behavior),
> add the `data-scroll-behavior="smooth"` attribute to your `<html>` element
> — [Upgrading to version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)

**`priority` on `next/image` is deprecated.**

> Starting with Next.js 16, the `priority` property has been deprecated in
> favor of the `preload` property in order to make the behavior clear.

and `preload` is itself not the recommended default:

> In most cases, you should use `loading="eager"` or `fetchPriority="high"`
> instead of `preload`.
> — [Image Component](https://nextjs.org/docs/app/api-reference/components/image)

**Multiple root layouts behave exactly as spec 001 assumed.**

> You can create **multiple root layouts**. Any layout without a `layout.js`
> above it is a root layout. […] Navigating **across multiple root layouts**
> will cause a **full page load** (as opposed to a client-side navigation).
> — [layout.js](https://nextjs.org/docs/app/api-reference/file-conventions/layout)

**A relative metadata URL without `metadataBase` is fatal.**

> Using a relative path in a URL-based `metadata` field without configuring a
> `metadataBase` will cause a build error.
> — [generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

Note the pairing: the same page says `metadataBase` "is typically set in root
`app/layout.js` to apply to URL-based `metadata` fields across all routes". We
do not have an `app/layout.js`.

**`next/font` preloads per route, based on where the loader is called.**

> If it's a layout, it is preloaded on all the routes wrapped by the layout.
> If it's the root layout, it is preloaded on all routes.
> — [Font Module](https://nextjs.org/docs/app/api-reference/components/font)

With two root layouts, "all routes" means all routes *under that layout*. The
same page also warns that "every time you call the `localFont` or Google font
function, that font will be hosted as one instance in your application", so a
shared font must be loaded once in one module and imported from there.

**The supported browser floor is Chrome/Edge/Firefox 111+ and Safari 16.4+**
([version requirements](https://nextjs.org/docs/app/guides/upgrading/version-16)).
That floor is the ceiling on which CSS features this page may depend on.

### 2.3 From the rest of the stack

`@theme inline` is required whenever a theme variable points at another
variable that changes under a class or media query — which is exactly how
`app/globals.css` is written:

> Using the `inline` option, the utility class will use the theme variable
> *value* instead of referencing the actual theme variable […] Without using
> `inline`, your utility classes might resolve to unexpected values because of
> how variables are resolved in CSS.
> — [Tailwind CSS · Theme](https://tailwindcss.com/docs/theme)

CSS scroll-driven animations are not available to us. MDN's banner on
[`animation-timeline`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
reads:

> Limited availability — This feature is not Baseline because it does not work
> in some of the most widely-used browsers.

Motion (formerly Framer Motion) cannot be used from a Server Component without
either a `"use client"` file or its
[`motion/react-client`](https://motion.dev/docs/react-installation) entry
point; both put the animation runtime in the client bundle.

`scroll-margin-top` is safe: MDN records it as "well established" and
"available across browsers since April 2021"
([scroll-margin-top](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin-top)).

The WAI-ARIA APG [Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
requires that "the element that shows and hides the content has role button",
that "when the content is visible, the element with role `button` has
aria-expanded set to `true`", optionally with `aria-controls` naming the
controlled element, toggled by Enter and Space.

Scott O'Hara's
[The details and summary elements, again](https://www.scottohara.me/blog/2022/09/12/details-summary.html)
draws the line we will follow:

> Consider this find-in-page feature before thinking you might use a
> `<details>` and `<summary>` as the foundation for other command-centric
> (navigation or menus) or dialog (especially modal) components.

and warns against stripping the native marker:

> With Firefox in particular, it exposes the default disclosure widget triangle
> marker as part of the `<summary>`'s accessible name.

Finally, `docs/design-system.md` states that Saans "is a commercial typeface and
is not redistributable", so the shipped stack degrades to Inter.

## 3. Decision

### 3.1 The page is static, and the build enforces it

`app/(marketing)/page.tsx` is an async-free Server Component that adds
`export const dynamic = 'error'`. Cache Components stays **off** for this
project; nothing on `/` is cached because nothing on `/` is fetched.

The segment config is the point. `'error'` converts the sentence "Landing.
Static Server Component" in `docs/screens.md` from an intention into a build
failure: the first person who reaches for `cookies()`, `headers()`,
`searchParams` or an uncached fetch anywhere in the marketing tree breaks
`npm run build` rather than quietly turning the front door into a per-request
render. A page with no data has nothing to lose from that strictness and one
guarantee to gain.

### 3.2 One `<a>`, no `<Link>`, no prefetch

Both CTAs (`Open the workspace`, top and bottom) are plain
`<a href="/dashboard">`. Navigating from `(marketing)` to `(app)` crosses root
layouts, which Next.js documents as a full page load, so `next/link`'s
client-side transition cannot apply to it and the page has no reason to carry
the router. Whether `next/link` would still issue a prefetch across that
boundary is not documented; the plain anchor removes the question rather than
answering it.

The three nav items and the secondary hero CTA are also plain anchors, to
`#how-it-works`, `#pricing` and `#security`.

### 3.3 Anchors, offsets and smooth scrolling

Each of the eleven bands is a `<section>`; the four anchor targets
(`#how-it-works`, `#pricing`, `#security`, `#faq`) carry an `id` and a
`scroll-margin-top` equal to the sticky nav's height plus one 16px step. That
height becomes a token — `--nav-height` in `@theme` — because rule 6 forbids
writing `scroll-mt-[72px]`.

`scroll-behavior: smooth` is set on `html` in the marketing shell only, and is
reverted to `auto` under `prefers-reduced-motion: reduce`. The existing
reduced-motion block in `app/globals.css` collapses animation and transition
durations but says nothing about scroll behaviour, so it is amended.

We deliberately do **not** add `data-scroll-behavior="smooth"` to `<html>`. That
attribute asks Next.js to suppress smooth scrolling during client-side route
transitions; the marketing shell contains exactly one route, and the only
navigation out of it is a full page load. There is nothing for Next.js to
suppress, and opting in would reintroduce per-navigation DOM work the framework
has just removed.

### 3.4 Exactly one client component

`components/marketing/MobileNav.tsx` is the only `"use client"` file the
landing page ships in v1. It is a disclosure built to the APG pattern: a real
`<button>` whose `aria-expanded` reflects state and whose `aria-controls` names
the panel, operable with Enter and Space, with focus moved into the panel on
open and returned to the button on close.

Everything else — the nav shell, the hero, the rail, the proof blocks, the
testimonial, pricing, security, the FAQ and the footer — is a Server Component.

### 3.5 The FAQ uses `<details>`; the nav does not

The FAQ is built from native `<details>`/`<summary>` and ships no JavaScript.
That is the element's actual purpose, and it earns find-in-page discoverability
for free in Chromium. The native marker is **restyled, not removed** — via
`::marker` only — so Firefox's habit of folding the marker into the summary's
accessible name stays merely cosmetic instead of becoming a lost state
indicator.

The nav is not a disclosure of prose; it is command-centric, which is precisely
the case O'Hara warns off `<details>`. Hence 3.4.

### 3.6 No animation library, and no scroll reveals

The landing page imports **no** motion library. Framer Motion is in the stack
table in `CLAUDE.md`, and this page is a deliberate non-use of it, not an
oversight. Motion on `/` is limited to CSS `transition` on hover and focus at
the durations already specified in §4 of `docs/design-system.md` — 150ms
`easeOut` for hover and press, 200ms for a reveal.

There are no scroll-triggered entrance animations. Content is present and
legible at first paint. The hero in particular is never animated, because it
contains the LCP element and every fade-in on it is a measurable delay to the
metric the page exists to win.

### 3.7 The hero image

The hero is a `next/image` with an explicit `width` and `height` taken from the
real asset, a `sizes` string matching its responsive box, `loading="eager"` and
`fetchPriority="high"` — following the Image component's own recommendation
over both the deprecated `priority` and the narrower `preload`.
`placeholder="blur"` with a generated `blurDataURL` covers the decode window.

The asset is a **real screenshot of the Review screen** showing video, CTA and
attached report in one frame, checked into `app/(marketing)/`.
`docs/screens.md` is explicit that placeholder art is worse than no art, so
until the Review screen exists the hero renders its frame at the final
dimensions — `bg-surface`, hairline border, `rounded-xs` — and nothing inside
it. The frame reserves the exact box, so dropping the screenshot in later
causes no layout shift.

### 3.8 Fonts, metadata and the `<html>` element

A single module, `app/fonts.ts`, calls `next/font/google`'s `Inter` once with
`subsets: ['latin']`, `display: 'swap'` and `variable: '--font-sans'`, and
exports it. **Both** root layouts import it and apply `.variable` to `<html>`,
because `next/font` preloads only on the routes a layout wraps and because
calling the loader twice would host two instances of the same font.

Inter is what ships. Saans is not redistributable, so when a licence exists the
change is a one-line swap in `app/fonts.ts` to `next/font/local`, and no
component moves. The `@theme inline` block in `app/globals.css` already binds
`--font-display` and `--font-sans` to that stack.

`app/(marketing)/layout.tsx` owns its own `<html>`/`<body>`, its own
`metadataBase`, `title.template`, `description`, `openGraph`, `twitter` and
`alternates: { canonical: '/' }`. The workspace root layout sets its own
`metadataBase` independently. Neither can inherit from the other, because
neither is above the other.

The page renders one JSON-LD `<script type="application/ld+json">` describing
the product as a `SoftwareApplication`, following the
[Next.js JSON-LD guidance](https://nextjs.org/docs/app/guides/json-ld) —
including its `.replace(/</g, '\\u003c')` escaping, which is cheap insurance
even though every value here is a local constant. `app/favicon.ico`,
`app/robots.ts` and `app/sitemap.ts` are added at the `app` root.

### 3.9 The landing page is dark, and does not offer a switch

`/` renders in the dark palette unconditionally. `docs/design-system.md` names
dark as the designed-for default, and the light palette is applied through a
`.light` class driven by the workspace's `ui-store` — a Zustand slice reading
`localStorage`, which the marketing shell has no client runtime to consult. A
theme switch here would be the second client component, added for a surface a
visitor sees once.

The consequence is worth stating plainly: **the light palette is never
exercised on `/`.** Contrast checking for this page covers the dark values
only.

### 3.10 The accent exception, made countable

`docs/screens.md` grants `/` permission to let `--accent` act as brand rather
than as an AI signal. This spec bounds that permission to **two** uses on the
entire page:

1. **One** accent-derived hero backdrop treatment, composed only of `--accent`
   at low alpha over `--background`. No second hue, no gradient card, no
   glassmorphism, no neon border — the anti-patterns in §6 of
   `docs/design-system.md` are not suspended, only the "AI actions only"
   reservation is.
2. The seven-step rail's current node, where accent carries its ordinary
   product meaning and so is not an exception at all.

Every CTA on the page stays bone-white `--primary`. Design-system §1 calls a
tinted primary CTA "off-brand here in a way that is hard to un-see", and that
rule has no landing-page carve-out.

### 3.11 No forms, no capture, no third-party scripts

No email capture, no newsletter, no chat widget, no cookie banner, no analytics
or heatmap tag in v1. Rule 11 governs recipient PII inside the product; putting
a third-party collector on the public front door of a product that ingests
client reports is the same argument one step earlier. It is also the only thing
that would put executable JavaScript on an otherwise script-free page.

### 3.12 Content is typed, and never invented

Every logo, metric, testimonial, price and FAQ entry lives in
`app/(marketing)/_content.ts` as `as const` exports, typed against
`types/marketing.ts` and imported through `@/types`. There is no fetch.

The file ships with `logos: []` and `testimonials: []` until real, consented
ones exist. The logo strip and the testimonial block therefore render nothing
when their arrays are empty, rather than showing invented names — rule 9's
empty state, applied to a marketing page. `docs/screens.md` says "never
invented social proof", and an empty array is the mechanism that makes that
enforceable rather than aspirational.

## 4. Where this meets the constitution

**Rule 9 is partially vacuous here, and that is the honest reading.** The
landing page has no async surfaces, so "loading (skeleton), empty, error,
success" has no loading or error state to ship. The empty state is real and is
handled in 3.12. This is not an exception being taken; it is a rule whose
precondition — an async surface — is absent. If a future version adds a live
metric or a form, rule 9 applies to it in full and this paragraph stops being
true.

**The accent exception is a genuine, pre-existing exception**, granted in
`docs/screens.md` and recorded in spec 001, not something this spec invents.
What this spec adds is a bound: two uses, enumerated in 3.10. An exception
without a count is how the workspace ends up looking like a landing page, which
is the exact failure `docs/design-system.md` opens by naming.

**Rule 8 is satisfied at its strictest reading**, not merely obeyed: one client
leaf, at the one place interactivity is unavoidable.

**Rule 6 constrains an easy shortcut.** The sticky-nav offset wants to be
`scroll-mt-[72px]` and cannot be; it becomes `--nav-height` in `@theme`. The
same applies to the accent backdrop's alpha, which is expressed against the
existing `--accent` token rather than as a new colour.

## 5. Rejected alternatives

**Enable `cacheComponents` and put `"use cache"` on the landing page.** The
directive is designed for exactly this shape of content, and on a page that
fetches nothing it would cache nothing. Turning the flag on is an
application-wide change of rendering model — Next.js's own upgrade guide calls
it "not a rename-only change" that "requires adopting the Cache Components
model" — and that model's real subject is the workspace's data flow, not the
front door. When the workspace adopts Cache Components it will be its own spec,
and this page will be the least interesting route in it.

**`export const dynamic = 'force-static'` instead of `'error'`.**
`force-static` reaches the same output by forcing `cookies()`, `headers()` and
`useSearchParams()` to return empty values. That is worse: it makes a mistake
render successfully with silently wrong data instead of failing the build. We
want the failure.

**Say nothing and rely on static rendering happening by default.** It very
likely would. But "very likely, until someone adds a footer that reads a
header" is not a guarantee, and the value of the segment config here is that it
costs one line and removes a class of regression permanently.

**Framer Motion scroll reveals.** This is the default instinct for a landing
page and the reason most of them are three hundred kilobytes. Motion cannot be
used from a Server Component without `"use client"` or `motion/react-client`,
and both ship the animation runtime; that trades rule 8's strictest reading for
decoration on the one page where the proposition, not the choreography, is
doing the work. The design direction agrees — `docs/design-system.md` locates
brand voltage in "typographic scale and restraint", not in movement.

**CSS scroll-driven animations (`animation-timeline: view()`).** The
JavaScript-free version of the same idea, and genuinely attractive. Rejected on
availability: MDN records `animation-timeline` as "Limited availability" and
"not Baseline because it does not work in some of the most widely-used
browsers", and Next.js 16's own supported floor includes Safari 16.4, which
predates support entirely. Revisit when the MDN banner changes; the decision is
about today's baseline, not about the idea.

**`<details>`/`<summary>` for the mobile nav.** Zero JavaScript, and it would
have made 3.4 unnecessary. Rejected on O'Hara's guidance that `<details>` is
the wrong foundation for "command-centric (navigation or menus)" components,
compounded by the inconsistent exposure of interactive elements nested inside a
`<summary>` — and a nav panel is nothing but interactive elements. Accepting
one small client component is cheaper than shipping a nav that some screen
reader users cannot navigate. The same reasoning is why `<details>` *is* right
for the FAQ: prose, not commands.

**Reuse `components/workflow/WorkflowStepper` for the seven-step rail.**
`docs/screens.md` asks the rail to reuse the stepper's *visual language*, which
reads like an invitation to import the component. Rejected twice over: the
`WorkflowStepper` contract in `docs/design-system.md` is interactive
(`onNavigate`, "only completed steps are clickable"), so importing it drags
`"use client"` onto the page; and the import direction would make a workflow
component answerable to marketing requirements, which is how a shared component
starts growing props nobody in the workflow needs.
`components/marketing/StepRail.tsx` copies the visual language — same node
shapes, same accent on the current node, same neutral fills — and stays a
Server Component. The duplication is real and accepted: it is bounded, static,
and both halves are pinned to the same design-system section.

**A `/pricing` and a `/security` route.** Already settled in spec 001 as
in-page anchors for v1. Restated here only so nobody re-opens it from the
landing side; the argument lives in [001 §6](001-route-map.md).

**Marketing-only design tokens, a `marketing.css`, or a `tailwind.config.js`
scoped to the landing page.** Rule 6 forbids the config file outright, and the
other two would create a second source of truth for colour on the one page most
likely to be redesigned by someone who has not read `docs/design-system.md`.
The landing page draws from the same `@theme` block as the workspace, which is
what keeps the two looking like the same software.

**An email-capture form or newsletter signup.** The standard landing-page
conversion mechanism, and the reason `docs/screens.md`'s allowed-controls line
says "No forms". This repo has no backend to receive a submission, so any form
would be theatre; and a product whose entire proposition is "a human approves
every send" should not open by harvesting addresses.

**Analytics, heatmap or session-replay tags.** Deferred, not rejected forever —
but they are the single thing that would put third-party executable JavaScript
on a page that otherwise has none, on the public face of a product that ingests
client reports. When it is wanted it gets its own spec, alongside
`/settings/analytics`, and that spec has to answer where the data goes.

**A theme switch on `/`, or honouring `prefers-color-scheme`.** The design
system implements light mode as a `.light` class, not a media query, so
honouring the OS preference would mean reading it in JavaScript and adding a
second client component. Dark-only on a page a visitor sees once is the right
trade.

**Shipping an illustration or mockup so the page can launch before the Review
screen exists.** Rejected on `docs/screens.md`'s own terms: "Placeholder art is
worse than no art." The reserved frame in 3.7 lets the page ship without either
lying about the product or shifting layout when the truth arrives.

## 6. Consequences

**New files.**

```
app/
  fonts.ts                      ← one Inter instance, imported by both root layouts
  favicon.ico  robots.ts  sitemap.ts
  (marketing)/
    layout.tsx                  ← root layout: html/body, metadataBase, fonts
    page.tsx                    ← dynamic = 'error'; the eleven sections
    _content.ts                 ← typed constants; logos/testimonials start empty
    opengraph-image.tsx         ← ImageResponse
components/marketing/
    MarketingNav.tsx  MobileNav.tsx   ← MobileNav is the only "use client"
    Hero.tsx  StepRail.tsx  ProofBlock.tsx  Testimonial.tsx
    PricingPreview.tsx  SecurityNote.tsx  Faq.tsx  FinalCta.tsx  Footer.tsx
types/marketing.ts
```

**Changes to existing files.** `app/globals.css` gains a `--nav-height` token in
`@theme` and an amended `@media (prefers-reduced-motion: reduce)` block that
also sets `scroll-behavior: auto`. `docs/screens.md` needs no change; this spec
is downstream of it.

**A new import boundary to enforce.** Spec 001 already states that
`components/marketing/` must never be imported by `(app)`. That is now
load-bearing — it is what stops the accent exception escaping the landing page
— so it becomes an ESLint `no-restricted-imports` rule rather than a sentence
in a document, added when the lint config lands.

**A blocking dependency.** The hero cannot be finished until the Review screen
is real enough to screenshot. The page ships before that with the frame
reserved; whoever completes the Review screen owns dropping the asset in. This
is the one item on the page that another spec's work gates.

**What has to happen next.** A spec for the workspace shell's own root layout
will need to make the mirror-image decisions in 3.8 — its own `metadataBase`,
its own import of `app/fonts.ts` — and should reference this file rather than
re-deriving them.

## 7. Unverified

Two claims here were reasoned rather than sourced. The first has since been
settled by the build; the second stands.

- **Metadata file placement inside a route group — resolved.** This spec puts
  `opengraph-image.tsx` at `app/(marketing)/opengraph-image.tsx` and
  `favicon.ico` at `app/favicon.ico`. The Next.js documentation describes
  file-based metadata by folder position, and describes route groups as not
  affecting the URL, but does not state how the two interact when there is no
  top-level `app/layout.tsx`. **It works:** `next build` emits the route as
  `○ /opengraph-image-pwu6ef`, prerendered, from inside the group. No move to
  `app/` is needed.
- **Prefetch across root layouts — still unverified.** 3.2 notes that the
  behaviour of `next/link`'s prefetch across a root-layout boundary is not
  documented. The plain anchor sidesteps it; no claim is being made about what
  `Link` would do.

## 8. What implementation changed

Six corrections surfaced while building this. They are recorded here so the
spec and the tree do not drift; none of them reverses a decision above.

1. **`--nav-height` lives in `:root`, not `@theme`** (3.3 said `@theme`).
   `@theme` only generates utilities inside a recognised namespace, and
   `nav-height` is not one, so it would have generated nothing.
   `docs/design-system.md` already puts `--radius` in `:root`. The anchor
   offset is one `@layer base` rule — `section[id] { scroll-margin-top:
   calc(var(--nav-height) + 1rem) }` — which satisfies rule 6 more cleanly than
   this spec's own phrasing did. Verified computing to 80px.
2. **The font variable is `--font-brand`, not `--font-sans`** (3.8 said
   `--font-sans`). That name is already a Tailwind `@theme` key holding a
   literal stack; a font loader writing to the same property would collide with
   it. `@theme inline` now points `--font-display` and `--font-sans` at
   `var(--font-brand)`, which makes 3.8's promise literally true: licensing
   Saans is a one-line change in `app/fonts.ts` and nothing else.
3. **Reserved frames extend to the three proof blocks**, not just the hero.
   `docs/screens.md` wants a real screenshot in each, and those screens do not
   exist either. Same rationale as 3.7.
4. **No shadcn primitives were vendored.** `components/ui/` stays empty; the
   landing CTAs are anchors, not buttons.
5. **`@next/next/no-html-link-for-pages` fires on the plain `<a>` of 3.2** —
   but only in `app/(app)/`, not on the marketing components. It is disabled
   inline on the one line it flags, with the boundary reasoning in a comment.
   Switching to `next/link` would reverse 3.2 and is not the fix.
6. **The OG image ships without a custom font.** Rendering it in Inter means
   reading a `.woff2` out of `node_modules` at module scope, which is fragile.
   Revisit when Saans is a local asset.

Two of this spec's central claims were checked rather than assumed:
`dynamic = "error"` does fail the build on a runtime API
(`Route / with \`dynamic = "error"\` couldn't be rendered statically because it
used \`headers()\``), and the only application component chunk the landing page
loads is `MobileNav`.

## 9. A dev-only hydration warning on `/`, and why nothing was changed

**Symptom.** Loading `/` in `next dev` logs a hydration mismatch against this
layout's `<html>`: the server sent
`… marketing-shell` and the DOM had `… marketing-shell dark`.

**Cause.** `dark` is what `next-themes` writes, and `next-themes` is mounted
only by `app/(app)/providers.tsx` — the workspace. The marketing shell imports
none of it. What produces the class is Turbopack's dev chunking evaluating that
workspace code on this page anyway; it reads `localStorage.theme` and stamps the
class on `<html>` before React hydrates.

**It does not ship.** Verified as a controlled comparison, with
`localStorage.theme = "dark"` set in both cases:

| Build | `<html>` class on `/` |
|---|---|
| `next dev` | `marketing-shell **dark**` — mismatch |
| `next build` + `next start` | `marketing-shell` — clean |

So §3.x's claim that this page carries no workspace client JS holds in
production, which is where it is a property rather than a coincidence.

**Why `suppressHydrationWarning` was NOT added here.** It is the obvious way to
silence the log, and `app/(app)/layout.tsx` already carries one — but for a
reason that is real and permanent there: `next-themes` genuinely mutates that
element before hydration on every workspace load. This element has no such
reason in production. Adding the attribute would remove the signal from the one
root layout that is supposed to have nothing mutating it, so a *real* mismatch
introduced here later would log nothing.

The noise is the cost of not masking it. If it becomes intolerable the right
fix is upstream — a Turbopack dev-chunking issue — not an attribute on this
file.
