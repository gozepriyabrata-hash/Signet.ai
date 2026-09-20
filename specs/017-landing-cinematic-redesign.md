---
Spec:        017
Title:       The landing page, restaged as a cinematic scroll
Status:      accepted
Created:     2026-09-17
Supersedes:  016
---

## 1. Problem

A reference video (an Awwwards-grade agency site — dark canvas, a rotating 3D
object in the hero, a scramble-text headline, a marquee ticker, tilt-in stat
cards, a pinned section where a headline dissolves into letters around a
static object while service cards reveal at its corners, an arched 3D
carousel of project thumbnails, and a footer with a word-cycling marquee over
an animated background) was supplied with instructions to reverse-engineer its
**motion system and layout philosophy** — not its brand, copy or imagery — and
rebuild the landing page around this product's own identity.

`specs/016` composed the page down to eight static sections and explicitly
rejected scroll animation for the one band it considered animating, citing the
LCP budget and "a third client boundary." That rejection was correct for the
literal wireframe it was implementing. It is not an argument against motion
elsewhere on the page — `Reveal.tsx`, `useInView` and `.motion-reveal` already
existed and were already doing exactly the kind of animated reveal that
rejection worried about, just not on the band in question.

`specs/016` §2 also left one thing explicitly undecided: the hero's copy
("Generate your own avatar videos, full videos into short clips…") describes a
product this repo is not — `CLAUDE.md` opens by saying the clip-flow product
"is not here — no route, no type, no seam method reserves space for them." An
earlier draft of this spec closed that gap by rewriting the copy. **That draft
was corrected during review**: the person driving this redesign had already
made deliberate copy and positioning choices in `_content.ts`, and a
motion-and-layout pass rewriting them on its own judgment was scope creep, not
a fix — the positioning gap is real and recorded, but closing it is a product
decision for whoever owns that copy, not something a redesign pass gets to
decide unilaterally. §3 below keeps every existing string as it was; the only
change to `_content.ts` is the one `id` field forced by §3's duplicate-id fix.

## 2. Constraints carried forward unchanged

- **No motion library.** `docs/design-system.md` §4: every animation here is
  `transform`/`opacity` via CSS `@keyframes` or a CSS transition, driven by
  `IntersectionObserver` or a `requestAnimationFrame` scroll listener — never
  Framer Motion, GSAP or Three.js. The reference's literal WebGL objects are
  reinterpreted as canvas-2D or CSS-transform equivalents.
- **The hero still holds the LCP element and still does not fade in.** The
  headline and subhead paint immediately, unanimated, exactly as `Hero.tsx`
  already documents. Only one decorative, `aria-hidden` element — an ambient
  canvas background, drifting on its own timer rather than on scroll — is
  allowed to move on load, and it mounts client-side after hydration so it
  adds nothing to the server-rendered LCP path.
- **No invented copy, logos or numbers** (`specs/002` §3.12, unchanged). Every
  section below is built from arrays that already exist in `_content.ts` —
  `steps`, `proofBlocks`, `security`, `faq`, `finalCta` — none of which were
  composed into the page since `specs/016` slimmed it down. Nothing here adds
  a new marketing claim; it restages claims the product already makes.
- **The accent budget stays at two uses** (`specs/002` §3.10): the hero wash
  and the step rail's current-step ring, both already spoken for. Every new
  section is grayscale — `--foreground`/`--body-foreground`/`--border`/
  `--surface` — which the reference's own near-monochrome palette suits
  anyway.
- **`prefers-reduced-motion` drops every transform**, per the existing global
  rule in `app/globals.css`. New scroll-driven components additionally render
  a static, fully-visible fallback rather than relying on the CSS override
  alone where JavaScript computes layout (the arc gallery falls back to a
  plain horizontal row; the marquee falls back to a static line).
- **`.generation-pulse` is not reused.** `docs/design-system.md` §4 is
  explicit that it is used on `JobProgressCard` and the video placeholder and
  nowhere else. The new ambient motif in the pinned proof section is a
  separate keyframe, scoped to the landing page.

## 3. Decision

The page is recomposed as: nav, hero, workflow marquee, step rail (reinstated,
tilt-in per card), proof (reinstated, restaged as a pinned central motif with
the three real proof points revealing beside it), security (reinstated, as a
stacked-type interstitial), the two feature bands (kept, copy untouched), a
workflow arc (new — a curved, scroll-driven gallery of the seven real steps,
replacing what the reference spends on a fabricated client-work carousel),
FAQ (reinstated), final CTA (kept, with an ambient background), footer (kept).

**Every existing string in `_content.ts` is unchanged** — `hero.headline`,
`hero.subhead`, `hero.loop.alt`, both `features` entries' `label`/`title`, the
footer's "Solution" column labels, and `nav`'s "Research" href all read
exactly as they did before this spec. The one exception is mechanical:
`features[0].id` moves from `how-it-works` to `avatar-video`.
`specs/016`'s slim, eight-section page never composed the step rail and the
first feature band together, so their both claiming `id="how-it-works"` was
latent and harmless; reinstating the step rail alongside the feature bands
(this spec) makes the collision real — two elements with the same `id` is
invalid HTML and breaks any in-page anchor or `aria-describedby` pointed at
it. Moving the id is the smallest fix that removes the collision without
touching what either section says. `features[1]` keeps `id="clip-flow"`
unchanged, and `nav`'s "Research" keeps pointing at `#clip-flow` as before.

**Motion vocabulary, all new:**

- `WorkflowMarquee` — a looping ticker of the seven step names, CSS
  `@keyframes` translate, `animation-play-state: paused` under
  `prefers-reduced-motion` (the global override already zeroes duration; this
  additionally freezes position rather than leaving a 0.01ms jump-cut).
- `TiltReveal` — generalises `Reveal.tsx`: same `useInView` hook, same
  mount-gated hidden state, but the hidden state adds a slight
  `rotateX`/`scale` in addition to the existing translate-and-fade, and
  accepts a stagger index so a row of cards fans in sequentially rather than
  as one block. New CSS: `.tilt-reveal` / `.tilt-reveal[data-reveal-state=
  "hidden"]`, same structure as `.motion-reveal`, transform and opacity only.
  Used by the step rail's per-card reveal and the proof section's per-row
  reveal.
- `ProofPinned` — the reference's pinned-object beat, reinterpreted honestly:
  a `position: sticky` center column holds one small ambient CSS/canvas motif
  (not a photo, not a claim), while the three real `proofBlocks` entries
  reveal in the side column as the page scrolls past them, one
  `IntersectionObserver` per row rather than continuous scroll-progress
  math — cheaper, and consistent with how `Reveal.tsx` already works. Replaces
  `ProofBlocks.tsx` in the composed page; `ProofBlocks.tsx` itself is kept but
  no longer composed, on the precedent `specs/016` §4 already set for dormant
  components.
- `SecurityBigType` — the reference's giant stacked-type divider, built from
  `security.title`/`body`/`points` instead of a fabricated services list.
- `WorkflowArc` — a curved gallery of the seven steps, arranged as a static
  fan: each card's `rotate`/`translateY` is a fixed function of its index,
  forming the reference's arc with no runtime scroll math at all. Cards fan
  in via `TiltReveal`, staggered by index, the same reveal mechanism as every
  other new section — considered and rejected in favour of a continuous
  `scroll`-progress version (§4) for being simpler, cheaper, and consistent
  with `specs/016`'s own wariness of scroll-driven layout work on this page.

**Sections stay dark.** The reference alternates dark and light bands for
rhythm; this system's dark palette is documented as "the designed-for and
default page mode" and light is a whole-document theme toggle, not a
per-section device. Rhythm here comes from alternating `--background` and
`--surface`/`--surface-raised` panels instead, which keeps every new section
inside the existing token system rather than introducing a local light
inversion the design system does not describe.

## 4. Rejected alternatives

**Reuse `ProofBlocks.tsx` as-is inside a sticky wrapper.** Its three
`ReservedFrame` screenshot slots assume one image per block; the pinned
restaging shares a single center visual across all three rows, so the
component's shape does not fit. Building `ProofPinned.tsx` alongside it,
rather than mutating `ProofBlocks.tsx`, keeps the untouched component's own
tests (there are none today, but its doc comments and call sites) intact —
same reasoning `specs/016` §4 gives for not deleting dormant components.

**Drive the arc gallery (and the pinned section) with continuous
`scroll`-position math, `transform` recomputed every frame.** This is closer
to the reference's own implementation and was the first draft of this spec.
Rejected for the same reason `specs/016` rejected animating the colour band:
it is real runtime cost and real failure surface (a `scroll` listener that
outlives its section, a forced reflow if a read ever lands outside
`requestAnimationFrame`) bought for a visual difference — a fan that holds
still versus one that breathes with scroll position — most visitors will not
consciously register. `IntersectionObserver`-driven reveal, which this page
already uses everywhere else, gets most of the same read for none of the
risk.

**Give the hero a literal scramble-text headline, matching the reference.**
Rejected outright: `Hero.tsx` already documents, correctly, that nothing on
it animates because it holds the LCP element, and a scrambling H1 is a
fade-in with extra steps. The ambient canvas background carries the hero's
motion instead, entirely off the critical text.

**Rewrite the hero and feature copy to match `CLAUDE.md`'s stated positioning
(the earlier draft of this spec).** The clip-flow mismatch this section names
in §1 is real, but fixing it is a product-positioning call, not a layout-pass
call, and the person driving this redesign had already made their own
deliberate choices in `_content.ts` before this spec started. Rewriting those
strings — even correctly, even with the best intentions — without being asked
is exactly the failure mode this rejection exists to name: a redesign that
quietly substitutes its own judgment for a decision that was not its to make.
The gap stays recorded (§1) and open, the same way `specs/016` left it.

## 5. Consequences

`app/(marketing)/page.tsx` composes eleven sections. `Hero` and `StepRail` are
edited for layout/motion only; `MarketingNav`, `Footer` and every string in
`_content.ts` are unchanged except the one `id` field §3 explains. New:
`WorkflowMarquee`, `TiltReveal`, `ProofPinned`, `SecurityBigType`,
`WorkflowArc`, plus the small client leaves each one needs for its
`IntersectionObserver`/`requestAnimationFrame` work. `app/globals.css` gains
`.tilt-reveal`, the marquee keyframe, and one ambient motif keyframe, none of
them named or shaped like `.generation-pulse`. `MarketingNav.test.tsx` is
unchanged from its pre-existing assertions. The other existing marketing
tests (`StepRail.test.tsx`, `dormant-sections.test.tsx`, `Faq.test.tsx`) are
unaffected because none of the markup they pin changes shape, only what wraps
it. `vitest.setup.ts` gains an `IntersectionObserver` polyfill, on the same
"the gap is jsdom's" precedent the existing `<dialog>` stub there sets.

**Still open, and none of it is code:** the hero loop still has no asset
(`specs/016` already recorded this); the two feature bands' `ReservedFrame`
slots are still empty for the same reason; the clip-flow positioning gap
named in §1 is exactly as open as `specs/016` left it — this spec is layout
and motion only, and deliberately does not touch it.
