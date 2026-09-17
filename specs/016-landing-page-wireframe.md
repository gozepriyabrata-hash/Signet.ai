---
Spec:        016
Title:       The landing page, rebuilt to the wireframe
Status:      draft
Created:     2026-09-17
Supersedes:  —
---

## 1. Problem

The landing page shipped by `specs/002` sells one product — a client report
turned into a reviewed video-and-email package — down a page of nine sections:
hero, logo strip, seven-step rail, three proof blocks, testimonial, pricing
preview, security band, FAQ, closing CTA.

A landing-page wireframe was supplied that describes a different page. It is
shorter, it is built around two feature bands rather than a rail of proof, and
its copy positions the product as a workspace for **making avatar videos and
cutting long videos into short clips**, not as a report-to-package pipeline.
The wireframe also carries its own nav labels, its own footer columns, and a
decorative colour band between the two feature sections.

Two things had to be decided: what the page becomes, and what happens to the
five sections it no longer has room for.

## 2. Constraints

**The wireframe's copy is the copy.** The instruction with the wireframe was to
use the text it provides. `specs/002` §3.12 already forbids this page from
inventing content, so the two agree: where the wireframe gives words they are
used verbatim, and where it gives none — neither feature band has a paragraph —
none are written.

**The positioning conflicts with `CLAUDE.md`.** The constitution opens by saying
this repo is the report-video-email product, that the clip flow is "not here —
no route, no type, no seam method reserves space for them", and that
`docs/prd-alignment.md` should be read before concluding something is missing.
The wireframe's second feature band is labelled "clip flow". Nothing in this
spec builds a clip flow: no route, no domain type, no `lib/api` method. What
changes is what the front door advertises, which is a positioning decision and
belongs to whoever owns the product, not to the person wiring up the page. It
is recorded here rather than silently absorbed. **The marketing page now
promises a capability the product does not have**, and that is a gap someone
has to close deliberately — either by building the flow or by changing the
copy.

**Rule 6 blocked the colour band's obvious implementation.** The band wants the
artwork-only pastels, which `docs/design-system.md` defines and which
`app/globals.css` had in `:root` but never exposed through `@theme`. The only
way to reach one was an arbitrary value like `bg-[var(--pastel-blue)]`, so a
rule 6 violation.

**The accent budget is two uses (`specs/002` §3.10)**, and removing the
seven-step rail from the page gives one of them back.

**Rule 10 governs a looping hero video.** An autoplaying, looping `<video>` is
untouched by the global `animation-duration` override under
`prefers-reduced-motion`, because a video is not an animation.

## 3. Decision

The page is composed as: nav, hero, feature band, colour transition, feature
band, security band, FAQ, footer.

**The hero** puts the headline left and the supporting paragraph small on the
right, then a full-width looping film panel with the single "Get started" pill
centred beneath it. The accent wash is kept — it remains accent use 1 of 2, and
is now the only one on the page.

**The film panel** (`HeroLoop`) ships with no source, rendering the exact box at
the final aspect ratio, the same call `ReservedFrame` makes. Its playing branch
is written now anyway, and requires a poster: under `prefers-reduced-motion` a
CSS media query hides the video and shows the still. No JavaScript, so the page
keeps its one client component.

**The two feature bands** (`FeatureSplit`) alternate which side the visual sits
on. `FeaturePanel.body` is optional so the paragraph slot exists without this
spec inventing a paragraph to fill it.

**The colour transition** is `aria-hidden` illustration in the pastels, which
are now exported through `@theme` as `--color-pastel-*`. It is static: a
"transition" here is the visual hand-off between two sections, not an
animation, and the page's LCP budget has no room for one.

**The nav** takes the wireframe's four labels. Two had no destination drawn
beside them, so "Research" points at the FAQ and "Policy" at `/legal/privacy`
(`specs/013`). Because one nav item is now a route rather than a fragment,
`NavAnchor.href` widens to accept a leading `/` as well as a leading `#`, and
both navs render a `next/link` for a path and a plain anchor for a fragment.
The top-right pill is labelled "Workspace" and still points at `/signup`, for
the reason `specs/012` gives: `/dashboard` is gated, so a logged-out visitor
clicking it lands on `/login`, which is not what the label promises.

**The footer** gains the wireframe's fourth column ("Solution") and a bottom bar
carrying social marks, `signet@2026` and the language. `socials` ships empty, on
the `logos`/`testimonials` precedent. `language` is a statement of the language
this page is written in, not a picker — there is no i18n, and a select that
changes nothing is a lie told in a widget.

**The five dropped sections are not deleted.** `LogoStrip`, `StepRail`,
`ProofBlocks`, `Testimonials` and `PricingPreview` keep their files and their
tests; they are simply no longer composed into `page.tsx`.

**The security band is kept although the wireframe omits it**, because the
wireframe's own nav has a "security" item and an anchor needs somewhere to land.

## 4. Rejected alternatives

**Delete the five unused components.** It would leave a tidier tree, and it was
the first instinct. It loses more than it gains: those components carry the
reasoning of `specs/002` in their comments, `dormant-sections.test.tsx` pins a
rule about empty arrays that is still live, and re-adding a section becomes a
rewrite instead of one import. Dead code that is tested and documented is
cheaper to keep than to reconstruct.

**Keep the seven-step rail anyway, as the "How it works" target.** It is the
best existing answer to that label and it is the golden path in visual form.
Rejected because the wireframe is unambiguous about the page's length, and
because "How it works" now lands on the first feature band, which does answer
the question. If the rail returns it should return as a decision, not as a
section nobody removed.

**Invent a paragraph for each feature band.** A heading over a placeholder box
reads thin, and two sentences would have fixed it. This is exactly the failure
`specs/002` §3.12 was written against: placeholder prose outlives the
placeholder. The optional `body` field is the compromise — the slot is typed and
rendered the moment real copy exists.

**Point "Research" and "Policy" at pages of their own.** Cleaner, and almost
certainly what the labels want eventually. It means shipping two empty routes
today, which is worse than a link that lands somewhere real. Both destinations
are one line in `_content.ts` when the pages exist.

**Drop "Research" from the nav because it has no home.** The instruction was to
use the wireframe's text. A label the owner asked for is not the implementer's
to remove on the grounds that it is inconvenient to wire.

**Ship `socials` populated with guessed handles.** The row would look right
immediately. A footer link to an account that does not exist is a broken promise
in the footer of a product whose whole proposition is that nothing goes out
unchecked.

**Make the language slot a real select.** There is no i18n, so every option but
one would be a lie, and the control would be the second client component on a
page that has managed with one.

**Animate the colour transition on scroll.** It is the kind of thing the band
invites. It needs either a motion library — deliberately not a dependency
(`CLAUDE.md`, Motion) — or an intersection observer, which is a third client
boundary on the page holding the LCP element.

## 5. Consequences

`app/(marketing)/page.tsx` composes eight sections instead of eleven.
`Hero`, `MarketingNav`, `MobileNav` and `Footer` are rewritten; `HeroLoop`,
`FeatureSplit` and `ColorGridTransition` are new. `types/marketing.ts` gains
`FeaturePanel` and `Social` and widens `NavAnchor.href`. `app/globals.css`
exports six `--color-pastel-*` utilities. `MarketingNav.test.tsx` is rewritten
to pin the new nav; the remaining 33 test files are untouched and pass.

**Still open, and none of it is code:**

- The clip-flow positioning gap named in §2. The page now advertises it.
- The hero loop has no asset. Drop an `.mp4` and a poster in `/public` and point
  `hero.loop` at them.
- `socials` is empty until real handles exist.
- Neither feature band has body copy.
- `SITE_TAGLINE` in `lib/site.ts` still describes the old positioning, and it
  feeds this page's title, its meta description and its JSON-LD. It is shared
  with the workspace shell, so changing it is not a landing-page-only edit and
  was left alone here.

## 6. Addendum: the hero grid was overflowing, not just wrapping ragged

A follow-up look at the shipped hero, prompted by a screenshot showing the
headline breaking across five uneven lines, turned up a real bug rather than a
styling nitpick: the `grid gap-10 lg:grid-cols-[1.6fr_1fr]` wrapper around the
headline and the subhead paragraph had no `grid-cols-1` below `lg`. A CSS grid
with no explicit track sizes its implicit column to its content's max-content
width — here, the headline's *unwrapped* width — so the row was silently
wider than the viewport at every width under 1024px, and what looked like bad
wrapping was the page showing a left-anchored slice of a box that did not fit.
This was verified directly, not inferred: Chrome DevTools Protocol against a
running instance of the page, forcing a fixed device viewport and reading
`document.documentElement.scrollWidth` against `window.innerWidth`, showed a
scroll width exceeding the viewport before the fix and matching it after.

The fix is `grid-cols-1` at the base breakpoint plus `min-w-0` on both grid
children — the same guarantee Tailwind's numbered `grid-cols-*` utilities give
automatically by wrapping every track in `minmax(0, …)`, which the hand-written
`lg:` track does not.

With the overflow gone, the headline's true wrap was measurable, and it still
ran to five lines at ordinary phone widths. The base heading size came down
one step, from `text-4xl` to `text-3xl` — confirmed, again via CDP against the
live page rather than by eye, to hold the headline at three wrapped lines
(plus the one-line closing clause) from roughly 360px up through the range
where `sm:`/`lg:` take over and scale it back up. No wording changed.

**A second, narrower finding came out of the same session: an unprefixed
arbitrary font-size utility silently fails to compile in this project's
build.** `text-[1.75rem]` and `text-[2rem]` on the same element as a
`text-<color>` utility produced no font-size rule at all — confirmed by
reading the element's computed style, which fell back to the inherited 16px —
while the pre-existing `lg:text-[4rem]` on the same element, and a plain
`text-3xl`, both worked. The failure is specific to a bracketed value at the
base, unprefixed position. This spec did not chase the compiler bug to its
root; it just avoids the trigger, and the comment on the `<h1>` in
`Hero.tsx` says so for the next person reaching for a custom base size.
