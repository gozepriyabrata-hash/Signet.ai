---
Spec:        009
Title:       Signup — a workspace-creation page, not a login
Status:      draft
Created:     2026-09-03
Supersedes:  —
---

# 009 · Signup — a workspace-creation page, not a login

Defines `/signup`: a public, mock-backed page that captures who is asking and
provisions a workspace, deliberately built without a password or a session,
because that is the only version of "signup" the current mock architecture can
build honestly.

## 1. Problem

Nothing in the app currently asks who is using it. The landing page's one
primary CTA, "Open the workspace," goes straight to `/dashboard`
(`app/(marketing)/_content.ts:29-32`) with no intermediate step. This was a
deliberate v1 decision, not an oversight: [`specs/001-route-map.md` §5](001-route-map.md)
rejected `/login`, `/signup` and `/forgot-password` outright, reasoning that
"this repo is frontend-only with a mock service layer; an auth screen would be
non-functional theatre, and a fake login is a worse first impression than
none," and deferred the whole area to "when `lib/api/real/` becomes real."
`docs/screens.md` (lines 164–169) independently reaches the same place from the
dashboard side: the "Good morning, {name}" greeting was cut because "there is
no user name until authentication exists (`specs/001` §5)."

A `/signup` page has now been requested directly. That request lands squarely
on the decision `specs/001` already made, so the problem this spec has to solve
is not "design a signup form" — shadcn plus `react-hook-form` plus `zod` makes
that mechanical — it is: **does anything about this repo's constraints make a
signup page buildable now without reproducing the exact theatre `specs/001`
correctly ruled out, and if so, what is the smallest page that is true to what
actually happens when someone submits it.**

## 2. Constraints

### 2.1 From `specs/001` — the rejection was about credentials, not about forms

Re-reading `specs/001` §5, the objection is specifically to a screen that
*implies a security boundary* — something a visitor could get wrong, or that
protects something. A traditional signup screen (email + password, "create
your account") implies exactly that: it tells the visitor their password will
matter again, on a `/login` screen this repo does not have and that
`specs/001` correctly declines to fake. Nothing downstream in the app checks
identity — `/dashboard` and every workflow route render unconditionally for
anyone who requests them, mock or real adapter. A page that collects a
password nobody will ever verify is the theatre `specs/001` named.

That is a narrower objection than "no page that mentions signing up," and it
leaves room for a page that does not imply a boundary: one that only captures
who is asking and hands them the same unconditional `/dashboard` the landing
page's existing CTA already hands out, with no credential, no session and
nothing gated behind it. §3 builds exactly that page and no more.

### 2.2 From `CLAUDE.md` — the service-layer seam is not optional for a mutation

> "This repo is frontend only. No backend, no DB, no real AI-vendor calls — the
> UI talks to a typed service layer (`lib/api/`) that is mock-backed today."

Every existing mutation in this codebase — `createProject`, `saveRecipient`,
`updateSettings` — goes through `ApiClient` and has a real stub in
`lib/api/real/index.ts` that throws `notImplemented(...)` until a backend
exists (verified by reading `lib/api/real/index.ts:17-38`, every method is
listed there). A signup submit handler that calls `setTimeout` and redirects
would be the one mutation in the app that skips the seam CLAUDE.md declares
mandatory, and it would have nowhere for a real backend to attach later.

### 2.3 From Next.js 16 — the marketing → workspace boundary is already a full page load, automatically

`specs/002-landing-page.md` §3.2 already verified against the Next.js route
groups documentation that navigating between two root layouts is a full page
load Next.js performs itself, not something a caller has to arrange:

> "You can create **multiple root layouts**. Any layout without a `layout.js`
> above it is a root layout. […] Navigating **across multiple root layouts**
> will cause a **full page load** (as opposed to a client-side navigation)."
> — [Next.js · Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) (v16.3.4), quoted at `specs/002-landing-page.md:109-113`

`/signup` lives in `(marketing)`, its destination `/dashboard` lives in `(app)`,
and both are root layouts (`specs/001` §2). A plain `router.push("/dashboard")`
after the mutation resolves is enough; Next.js supplies the full reload itself,
exactly as `MarketingNav`'s existing `<a href={primaryCta.href}>` already
relies on it doing (`components/marketing/MarketingNav.tsx:44-46`).

### 2.4 From `CLAUDE.md` rule 11 — this is not Recipient PII, but it is still PII

Rule 11 is written about `Recipient` data — the client's customers, entered in
the workflow. The name, work email and company entered on `/signup` describe
the *user of the product*, not their client's recipient, so it is a different
object and does not gate this page the way it gates `RecipientStep`
(`components/workflow/steps/RecipientStep.tsx:20-33`). It is still personal
data volunteered by a real visitor, so the same discipline applies by
extension rather than by the letter of the rule: never logged, never placed in
the URL, kept out of analytics events.

## 3. Decision

### 3.1 The page asks three questions, not the traditional signup set

`Name`, `Work email`, `Company` — required, validated client-side with `zod`
via `react-hook-form` and `@hookform/resolvers`, matching the pattern already
established in `RecipientStep.tsx` (`useForm` + `zodResolver` + shadcn
`Input`/`Label`, the only precedent for a validated form in this codebase). No
password field, no confirm-password field, no "I agree to the Terms" checkbox
— the last is dropped because `/legal/terms` does not exist yet and is
explicitly deferred by `specs/001` §6; a checkbox linking to a route that
returns a 404 is its own small piece of theatre. The submit button reads
"Create workspace," not "Sign up," so the copy never promises an account with
a password behind it.

> **Addendum — `specs/011`.** The "no password" decision above held exactly as
> long as nothing downstream ever checked one. `specs/011` builds a real
> account store and a real `/login` that does check one, which removes the
> premise this paragraph was arguing from. A password field was added to this
> form; the rest of this section — four fields now, not three, still no terms
> checkbox, still "Create workspace" as the label — is otherwise unchanged.
> See `specs/011` §3.3 and §5 for why the reasoning above no longer applies
> and what was considered instead.

### 3.2 The mutation is `api.createAccount`, mirroring `createProject`

`ApiClient` gains one method:

```ts
createAccount(input: SignupInput): Promise<WorkspaceAccount>;
```

`SignupInput` and `WorkspaceAccount` join `types/domain.ts`, following the
existing shape of `Project` (`id`, `createdAt`, plus the submitted fields). The
mock implementation mirrors `createProject()` (`lib/api/mock/index.ts:157-170`)
exactly: an artificial `delay("createAccount")`, an id minted the same way
projects mint theirs, no persistence beyond returning the record — there is no
list-accounts screen for it to seed. `lib/api/real/index.ts` gets the same
`notImplemented("createAccount")` stub as every other method, so the seam is
complete on day one. Failure is simulated through the mock's existing
`FAIL_`/`?mockFail=` convention (`lib/api/mock/index.ts:70`) with a new
`MOCK_ACCOUNT` code, so the form's error state is a real, reachable path rather
than a screen nobody has ever seen render.

The page itself is a client component (`"use client"`, forced by
`react-hook-form`) wrapping the mutation in `useMutation`, matching
`RecipientStep.tsx`'s pattern rather than a Server Action. `CLAUDE.md`'s
Server-Action objection (rule 2, `specs/007` §2.2) is written about
`sendPackage` specifically, but the underlying fact — a Server Action compiles
to a public POST endpoint reachable without rendering the page that offers it
— has no reason to be safer here than there, and every existing workflow
mutation already uses `useMutation` against `lib/api`. There is no reason for
this one page to be the first to introduce a second data-mutation convention.

> **Addendum — `specs/011`.** This section's `useMutation`/`ApiClient`
> mechanism was correct while account creation was mock-only, throwaway data.
> `specs/011` moves it to a Server Action (`signupAction`) instead, because
> real account creation is not `lib/api`'s mock/real-adapter concern — see
> `specs/011` §2.4 for why the global mock/real switch forced that split, and
> §3.5 for the mechanism. `ApiClient.createAccount` no longer exists.
> `SignupInput`/`WorkspaceAccount` are kept, now describing the Server
> Action's input/output instead.

### 3.3 Four states, sized to a single mutation

Rule 9 of `CLAUDE.md` requires loading, empty, error and success on every async
surface; a one-shot form has no meaningful "empty" state, so it collapses to
three, matching how other pure-mutation surfaces in this codebase already read
that rule:

- **Idle** — the form, submit enabled once all three fields are valid.
- **Submitting** — submit button shows a spinner and disables, mirroring
  `Button`'s existing loading affordance; fields stay editable-but-inert.
- **Error** — an inline `role="alert"` banner above the form using
  `--danger`, submit re-enabled, exactly the "recoverable in place with a
  Retry" contract rule 5 states for jobs and this extends to a mutation.
- **Success** — no success screen. The mutation resolving *is* the success
  state; the page immediately calls `router.push("/dashboard")`, and §2.3
  explains why that alone is sufficient to leave `(marketing)` behind.

### 3.4 Layout: minimal chrome, not the marketing shell

`/signup` renders at `app/(marketing)/signup/page.tsx`, inheriting the bare
`(marketing)` root layout (fonts, metadata, no chrome —
`app/(marketing)/layout.tsx:41-64`) but not the full `MarketingNav` +
`Footer` the landing page composes in its own `page.tsx`. `MarketingNav`'s
desktop links are in-page anchors — `#pricing`, `#security` — that only resolve
on `/` (`components/marketing/MarketingNav.tsx:16-19`, `docs/screens.md`
line 76 marks the landing page as the sole `#top` anchor target); mounting that
nav on `/signup` would render five links that silently do nothing. The page
gets its own minimal header instead — the wordmark linking back to `/`, no nav
list, no footer — the same "focus is the point" reasoning `docs/screens.md`
line 132 already gives for why the workflow's `(focus)` layout drops the
sidebar entirely.

### 3.5 `SignupForm` brings its own `QueryClientProvider`, scoped to itself

Discovered during implementation, not during the original design pass:
`specs/003-dashboard.md` §3.2 keeps `QueryClientProvider` out of the
`(marketing)` root layout on purpose — "providers are a workspace cost, not
an application cost" — and that spec's rejected alternatives explicitly
turns down "put the providers in the marketing root layout too." §3.2 above
already commits `createAccount` to `useMutation`, which throws
`No QueryClient set` with no provider anywhere above it in the tree; this was
missed until the page was actually loaded in a browser and verified against
`specs/003` §3.2's own instruction to prerender live rather than trust the
plan.

The fix is narrower than what `specs/003` rejected. `SignupForm` wraps only
its own subtree in `QueryClientProvider`, reusing `getQueryClient()` —
`lib/query-client.ts`'s same per-request-on-the-server,
singleton-in-the-browser factory `app/(app)/providers.tsx` already calls.
This is not a second, divergent cache: in the browser it is the identical
instance the workspace will reuse the moment a full page load carries the
visitor into `(app)`. `/` and every other marketing page remain exactly as
free of client state as `specs/002` and `specs/003` §3.2 require — the
provider exists only inside the one page that has a mutation to run, not in
the shared root layout `specs/003` was protecting.

### 3.6 No entry point is added to the landing page in this spec

`docs/screens.md` describes the landing page's primary CTA as appearing
"exactly twice" and `FinaCta.tsx`'s own comment calls itself "the second and
last appearance of the one primary CTA" (`components/marketing/FinalCta.tsx:4-9`).
The design system independently states a primary CTA is "One per screen."
Wiring `/signup` into the nav or the closing section means deciding whether it
replaces "Open the workspace," sits beside it as a second pill, or becomes a
quiet text link under it — three different products, none of which this spec
was asked to pick. `/signup` ships reachable by direct URL only; §6 records
adding it to the landing page as the next decision, deliberately left open
rather than defaulted.

> **Addendum — `specs/012`.** Answered once `/login` existed too (`specs/011`)
> and `/dashboard` being gated made the un-updated CTA actively misleading
> rather than merely unfinished. `primaryCta` now points at `/signup`
> ("Create a workspace"); `/login` is a new, separate quiet text link — the
> "second pill" option this section named is the one the design system's
> "one per screen" rule actually forecloses, not merely disfavours.

## 4. Where this meets the constitution

**This spec narrows `specs/001` §5, and says so rather than routing around
it.** §2.1 above is the load-bearing argument: `specs/001` rejected a page that
fakes a credential check, and this page does not perform one — it collects
contact details and calls a mutation, the same shape as `createProject`, which
`specs/001` never objected to. `/login` and `/forgot-password` remain rejected
exactly as `specs/001` left them; nothing here justifies building either, since
both are meaningless without a session that does not exist. If a future spec
wants `/login`, it needs its own argument, not an extension of this one.

**Rule 1 is not implicated.** `/signup` collects nothing that varies per
project — name, work email and company describe the account holder once, not
a per-project setting — so this is not a control that belongs under
`app/settings/`.

**Rule 2 is not implicated.** `createAccount` is not `sendPackage`; nothing
about workspace creation touches the "never auto-send" guarantee.

**Rule 3 holds, and holding it is what forced §3.5.** `createAccount` is a
TanStack Query mutation, matching every other server-state write in the app;
the form's own draft state lives in `react-hook-form`, not Zustand, matching
`RecipientStep.tsx`'s precedent for a form that has nowhere else to persist to
and does not need to. Rule 3 is also why the fix for the missing
`QueryClientProvider` was a page-scoped provider rather than dropping
`useMutation` for a plain `useState` + `async` handler: the latter would have
satisfied rule 3's letter (no server-state write reaches Zustand) while
quietly becoming the one mutation in the app with no query client behind it —
the "different data-access pattern from every other" cost `specs/003`'s own
rejected alternatives warns against, moved to a new page.

**Rule 11 is extended by analogy, not by the letter** (§2.4) — worth restating
here because it is the rule most likely to be misread as "does not apply"
simply because the data is not `Recipient`.

**docs/screens.md's deferred dashboard greeting stays deferred.** §3.10 of
`specs/003-dashboard.md` and `docs/screens.md` lines 164–169 both tie
"Good morning, {name}" to real authentication landing. `WorkspaceAccount` is
not a session and this spec does not wire it to the dashboard greeting, the
sidebar, or anywhere else — the record `createAccount` returns is used once,
to redirect, and then discarded. Restoring the greeting from mock signup data
would be exactly the premature theatre `specs/001` warned about, wearing this
spec's clothes.

## 5. Rejected alternatives

**Build the traditional signup screen — email + password + confirm.** This is
what "signup page" means by default, and it is the version `specs/001` §5
already rejected by name. A password field with nothing to verify it against
is worse than no password field: it tells a real visitor their credential
matters when it does not. Rejected on the same grounds `specs/001` gave, which
this spec did not find a reason to overturn.

**Fake a session with `localStorage` and gate `/dashboard` behind it.** This
would make the password field meaningful enough to justify asking for one, at
the cost of building a second, parallel identity system that has nothing to do
with the eventual real backend and that every other route (`/projects`,
`/campaigns`, `/settings/*`) would need to newly respect or newly ignore.
`specs/001` deferred auth as "its own spec" precisely because it also decides
"where `Recipient` PII is allowed to live" — a decision this spec is not
positioned to make well in isolation, and a fake gate would have to be ripped
out rather than upgraded once a real backend exists. Rejected as scope that
belongs to the real auth spec `specs/001` already reserved.

**Make `createAccount` a Server Action.** Consistent with `forms.md`'s general
Next.js guidance and would remove the `useMutation` boilerplate. Rejected for
the same structural reason `specs/007` §2.2 gives `sendPackage`: a Server
Action compiles to a public POST endpoint reachable without rendering the page
that offers it. That argument is about the shape of Server Actions, not about
`sendPackage` specifically, and nothing here needs that shape — the existing
`useMutation` + `lib/api` convention already covers this mutation with no loss
of functionality and one less pattern in the codebase.

**Wire `/signup` into the landing page nav and `FinalCta` as part of this
spec.** Tempting, because an unreachable page is unsatisfying. Rejected
because it requires picking which of three different landing-page shapes this
becomes (§3.6), a decision the design system's "one primary CTA per screen"
rule and `docs/screens.md`'s "exactly twice" language both make load-bearing
enough to deserve its own spec rather than a paragraph at the end of this one.

**Reuse `MarketingNav` unmodified on `/signup`.** Simpler than building a
second header. Rejected because its desktop link list is five in-page anchors
that only resolve on `/` — every one of them would 404-scroll on `/signup`,
which is a worse landing than no nav at all.

## 6. Consequences

- New route: `app/(marketing)/signup/page.tsx`, plus a `SignupForm` client
  component under `components/marketing/` (it is a marketing-shell page, not a
  workflow one, so it does not belong in `components/workflow/`).
- `ApiClient` gains `createAccount(input: SignupInput): Promise<WorkspaceAccount>`
  in `lib/api/types.ts`; implemented in `lib/api/mock/index.ts` and stubbed in
  `lib/api/real/index.ts`.
- `types/domain.ts` gains `SignupInput` and `WorkspaceAccount`.
- `specs/001` §5's route table is now stale by one row (`/signup` exists); its
  own text is left unedited, since specs record decisions at the time they
  were made — this file is the record of what changed and why.
- **Open, deliberately:** how a visitor reaches `/signup` from the landing
  page. §3.6 and §5's last rejected alternative both name this as the next
  decision, not an omission.
- **Open, deliberately:** whether `WorkspaceAccount` should persist anywhere
  the mock adapter can read back (e.g., to seed a workspace name in the
  sidebar). Nothing today reads it after the redirect; inventing a consumer
  for it now would be building ahead of a real requirement.

## 7. Unverified, and open

- The exact 4.5:1 contrast figures for the new page's error banner
  (`--danger` text on `--surface`) were not independently re-measured; §1's
  colour tokens are taken from `docs/design-system.md` as already-verified
  source of truth, consistent with how every prior spec in this series treats
  that file.
- Whether `@hookform/resolvers` v5's `zodResolver` needs any adjustment for
  zod v4 beyond what `RecipientStep.tsx` already does was not re-verified
  independently; this spec relies on that file's existing, working usage as
  the precedent rather than re-checking the resolver's compatibility matrix.
