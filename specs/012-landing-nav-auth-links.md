---
Spec:        012
Title:       Landing page — wiring /login and /signup into the nav
Status:      draft
Created:     2026-09-03
Supersedes:  —
---

# 012 · Landing page — wiring `/login` and `/signup` into the nav

Answers the question `specs/009` §3.6 named and deliberately left open —
"how a visitor reaches `/signup` from the landing page" — now that `/login`
exists too (`specs/011`) and `/dashboard` is gated behind a real session,
which makes leaving it unanswered actively misleading rather than merely
incomplete.

## 1. Problem

`primaryCta` (`app/(marketing)/_content.ts`) has pointed at `/dashboard`,
labelled "Open the workspace," since `specs/002`. `specs/011`'s `proxy.ts`
now redirects any unauthenticated visit to `/dashboard` to `/login`. The
landing page's own copy stopped being true the moment that shipped: a visitor
who has never seen the product, reading "Open the workspace," gets sent to a
sign-in form asking for a password to an account that does not exist. That is
not a broken link — the request 200s — but it is exactly the "worse first
impression than none" `specs/001` §5 named as the reason auth screens were
rejected in the first place, now produced by the page's own primary CTA
rather than by a `/login` page that didn't exist.

`specs/009` §5's last rejected alternative declined to wire `/signup` into
the nav *at the time*, on the grounds that it required picking one of three
shapes without a reason to prefer any of them yet. The reason now exists: the
current wiring is not neutral-and-unfinished, it is actively wrong.

## 2. Constraints

### 2.1 `docs/design-system.md` — one primary CTA per screen

> "**`--primary` (bone-white) means "move forward."** … One per screen."

A second bone-white pill for `/login` is ruled out by this line directly, not
by inference. Whatever `/login`'s nav treatment is, it cannot be a second
`--primary` button next to `/signup`'s.

### 2.2 `docs/screens.md` — the primary CTA's shape is named specifically

> "one primary CTA repeated at top and bottom (**"Open the workspace"** →
> `/dashboard`)"

This line is now stale in the same way `specs/008` §6 describes
`docs/data-model.md` as recurringly stale — corrected here, not left for a
seventh spec to find.

### 2.3 `specs/002` §3.2 — the plain-`<a>` reasoning inverts when the target changes

> "Navigating from `(marketing)` to `(app)` crosses root layouts, which
> Next.js documents as a full page load, so `next/link`'s client-side
> transition cannot apply to it."

That was true of `/dashboard`. It is not true of `/signup` or `/login`: both
live in `(marketing)` (`specs/009` §3.4, `specs/011` §3, mirroring the same
minimal-header page shell), the same root layout as `/`. Every component that
renders `primaryCta` as a plain `<a>` was, without changing a single line of
its own reasoning, rendering a same-root-layout navigation as if it were a
cross-root-layout one. `next/link` is now correct where it was previously
wrong, for the same underlying rule `specs/002` §3.2 stated.

### 2.4 Five components share one `primaryCta` constant

`MarketingNav`, `Hero`, `FinalCta`, `Testimonials` (dormant — `testimonials`
ships empty) and `PricingPreview`'s dormant-tier fallback all read
`primaryCta` from `app/(marketing)/_content.ts`. Retargeting it is not a
nav-only change by construction — it is the whole point of the constant
being shared. Leaving `MarketingNav` pointed at `/signup` while `Hero` kept
"Open the workspace" → `/dashboard` two sections below it would be a worse,
newly self-contradictory page.

## 3. Decision

### 3.1 `primaryCta` retargets to `/signup`, relabelled "Create a workspace"

`app/(marketing)/_content.ts`:

```ts
export const primaryCta = {
  href: "/signup",
  label: "Create a workspace",
} as const satisfies Cta;
```

"Open the workspace" is dropped because it now describes what happens *after*
`/signup`, not what clicking the button does — the same honesty discipline
`specs/009` §3.1 applied to "Create workspace" over "Sign up" on the form
itself extends to the label that links to it.

### 3.2 `loginCta` is new, and is a quiet text link — never a second pill

```ts
export const loginCta = {
  href: "/login",
  label: "Log in",
} as const satisfies Cta;
```

Rendered in `MarketingNav` (desktop) immediately left of the primary pill,
using the same neutral text-link styling the three in-page anchors already
use — not `--primary`, not a bordered pill, per §2.1. `MobileNav` gains a
`loginCta` prop and renders it the same way, above the primary pill in the
disclosure panel. This is the industry-standard placement (quiet sign-in,
prominent sign-up) and it is also the only placement `--primary`'s "one per
screen" rule leaves available — `specs/009` §5's second rejected shape
("sits beside it as a second pill") is foreclosed by the design system, not
merely disfavoured.

### 3.3 Every `primaryCta` render site switches from `<a>` to `next/link`

`MarketingNav`, `MobileNav`, `Hero`, `FinalCta`, `Testimonials`,
`PricingPreview` — per §2.3. `secondaryCta` (`#how-it-works`) and the three
`nav` anchors stay plain `<a>`, unchanged: they are in-page fragments on `/`
itself, not route changes, and `specs/002` §3.2's reasoning for them was
never about root layouts.

### 3.4 The footer's stray `/dashboard` link is corrected, not left inconsistent

`footer.columns` (Company) carried its own hardcoded
`{ href: "/dashboard", label: "Open the workspace" }`, independent of
`primaryCta`. Left alone, it would have been the one remaining place on the
page making the promise §1 identifies as broken. It becomes two links,
mirroring the nav: `{ href: "/signup", label: "Create a workspace" }` and
`{ href: "/login", label: "Log in" }`. `Footer.tsx`'s rendering is
unchanged — it already renders every column generically as plain `<a>`, and
splitting that loop to special-case one column's two items into `next/link`
was judged more complexity than a low-frequency footer navigation earns; see
§5.

## 4. Where this meets the constitution

**Rule 1 is not implicated.** Landing-page copy and routing are not
per-project configuration.

**Design-system §1's "one per screen" is the binding constraint, not a
preference** — §2.1 and §3.2 above are the direct application of it, and are
why this spec did not pick specs/009 §5's "second pill" shape.

## 5. Rejected alternatives

**A second `--primary` pill for `/login` beside `/signup`'s.** The most
visually symmetric option. Rejected outright by design-system §1 (§2.1) —
this was not a close call.

**Leave `primaryCta` pointed at `/dashboard` and rely on `proxy.ts`'s
redirect to `/login` as the de facto routing.** Technically functional — a
new visitor does eventually reach a form. Rejected because it makes the
landing page's own copy false (§1) and because it removes the one thing this
spec is actually for: a new visitor and a returning one are different
people asking for different things, and a single link that silently guesses
which one you are (by bouncing you to `/login` regardless) is worse than
asking once, in the open, with two links.

**Split `Footer.tsx`'s render loop to use `next/link` for the two new
Company-column items while keeping `#`-anchor columns on plain `<a>`.**
Considered for consistency with §3.3. Rejected as disproportionate: the
footer is reached far less often than the nav, the existing loop's
uniformity is itself a small piece of correctness (one rendering rule for
every column), and `specs/002` never treated the footer's cross-layout link
as needing the same scrutiny its two headline CTAs got. If the footer
becomes a more central navigation surface later, this is worth revisiting
on its own.

## 6. Consequences

- `app/(marketing)/_content.ts`: `primaryCta` retargeted and relabelled;
  `loginCta` added; `finalCta.body` copy adjusted to match ("Create a
  workspace…"); `footer.columns`'s Company entry becomes two links.
- `MarketingNav.tsx`: renders `loginCta` as a new quiet link; both it and
  `primaryCta` switch to `next/link`; passes `loginCta` down to `MobileNav`.
- `MobileNav.tsx`: new required `loginCta` prop, rendered above the primary
  pill; both links switch to `next/link`.
- `Hero.tsx`, `FinalCta.tsx`, `Testimonials.tsx`, `PricingPreview.tsx`:
  `primaryCta`'s anchor switches to `next/link`; no other change.
- `MobileNav.test.tsx` updated for the new required prop and refreshed
  fixture copy.
- `docs/screens.md`'s landing-page line naming "Open the workspace" →
  `/dashboard` as the primary CTA is corrected to match.
