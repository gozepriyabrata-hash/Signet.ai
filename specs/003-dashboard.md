---
Spec:        003
Title:       Dashboard and the workspace shell
Status:      accepted
Created:     2026-09-01
Supersedes:  —
---

# 003 · Dashboard and the workspace shell

Decides how `/dashboard` and the chrome around it are built: where the app
shell's layout actually lives now that the workflow has to escape it, where
TanStack Query and Zustand are wired in, why nothing on this route is
prefetched on the server, and how two persisted browser preferences reach the
first paint without a hydration mismatch.

This is the first screen in the repo with server state, client state and
persisted preferences all at once. Getting the seams right here is what every
later workspace screen inherits.

## 1. Problem

`docs/screens.md` specifies the dashboard's content and `docs/design-system.md`
specifies its parts. Spec [002](002-landing-page.md) left a placeholder at
`app/(app)/dashboard/page.tsx` that says the real thing is not built yet. Six
questions are open, and four of them have answers that look obviously right and
are wrong on this stack.

1. **The shell cannot live where the docs say it lives.** `docs/screens.md`
   puts navbar and sidebar in `app/(app)/layout.tsx`, and also says "the
   workflow routes hide the sidebar entirely." Both cannot be true: that file
   is the workspace root layout, so everything under `(app)` — the workflow
   included — inherits it.
2. **Nobody has decided where the providers go.** TanStack Query needs a client
   `QueryClientProvider`; a theme switch needs a provider too. Put them at the
   wrong level and either the landing page inherits them or every workspace
   route re-creates them.
3. **Server prefetch looks free and is not.** The obvious move is
   `prefetchQuery` in the Server Component plus a `HydrationBoundary`. On this
   codebase that is not merely unnecessary — it produces wrong data.
4. **Two persisted preferences hit the first paint.** Sidebar collapse and
   theme both live in `localStorage`. Rendered naively, both produce a
   hydration mismatch, a flash, or both.
5. **The four states have no obvious owner.** Rule 9 demands loading, empty,
   error and success. It is not obvious whether the loading state is
   `loading.tsx` or a skeleton inside the component, and the two are not
   interchangeable here.
6. **The specified greeting cannot be rendered.** `docs/screens.md` opens the
   page with "Good morning, {name}". There is no name, and the time of day
   cannot be computed where that heading is rendered.

## 2. Constraints

### 2.1 From `CLAUDE.md`

Rule 3 is the binding one and it is unusually specific:

> **State split is fixed.** Server state (projects, reports, jobs, presets) →
> TanStack Query. Wizard step, draft edits, UI preferences → Zustand.
> Never fetch inside a Zustand store. Never keep the step index in Query cache.

Rule 8 (Server Components by default, `"use client"` at the leaf), rule 9 (four
states on every async surface), rule 10 (the accessibility floor) and rule 11
(recipient data is client PII — never logged, never in a URL) all bind. Rule 7
matters more here than anywhere so far, because this is the first screen that
needs vendored primitives:

> **Do not wrap shadcn.** Primitives in `components/ui/` are ours to edit
> directly. Do not add a second abstraction layer over them.

### 2.2 The constraint that decides the most — the mock adapter is browser-resident

`docs/data-model.md` specifies the mock service layer, and one line in it
governs this entire spec:

> Mock data is persisted to `sessionStorage` so a page refresh mid-workflow does
> not reset the demo.

`sessionStorage` does not exist in the Node.js runtime. A Server Component
calling `api.listProjects()` would not read the same store the browser reads —
it would run against a fresh in-memory mock, seeded from fixtures, with none of
the user's session in it.

### 2.3 From Next.js 16

Route groups are explicitly the mechanism for the layout problem in §1.1. Their
documented use cases include:

> Opting specific route segments into sharing a layout, while keeping others out.
> — [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)

with the caveat that matters when adding a second group under `(app)`:

> **Conflicting paths**: Routes in different groups should not resolve to the
> same URL path.

and the reassurance that this nesting is *not* a second root layout, so it does
not trigger the full page load spec 001 relies on at the marketing boundary —
that caveat "**only** applies to multiple root layouts."

Reading a cookie is a runtime API. Without Cache Components, the previous
model's segment config governs, and `dynamic: 'auto'` is
"[t]he default option to cache as much as possible without preventing any
components from opting into dynamic behavior"
([Caching and Revalidating (Previous Model)](https://nextjs.org/docs/app/guides/caching-without-cache-components)).
A layout that calls `cookies()` therefore takes the whole subtree dynamic.

Current time is a prerender hazard, not merely a staleness problem. Next.js
treats `Date.now()` alongside `Math.random()` as something that must be handled
explicitly, surfacing a `blocking-prerender-current-time` insight under Cache
Components ([Caching](https://nextjs.org/docs/app/getting-started/caching)).
That flag is a Cache Components feature and we do not have it enabled — but the
underlying fact holds regardless: a statically prerendered component evaluates
once, at build.

### 2.4 From the libraries

All three additions support React 19: `@tanstack/react-query@5.102.8`
(`react: ^18 || ^19`), `zustand@5.0.15` (`react: >=18`) and
`next-themes@0.4.6` (`react: … || ^19`), verified against the registry.

TanStack Query's App Router guidance is explicit that the server must not hold
a shared client:

> Creating a single reused query client across all Server Components causes
> unnecessary overhead — each `dehydrate()` call serializes the entire client,
> including previously-serialized, unrelated queries.

and that hydrated data needs a non-zero staleness window:

> With server-side rendering, we usually want to set some default staleTime
> above 0 to avoid refetching immediately on the client.
> — [Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)

*The exact name of the server/browser branch helper in that snippet has moved
between v5 minors; take it from the docs at install time rather than from this
file.*

Zustand's `persist` middleware ships the escape hatch for the hydration
problem:

> Defaults to `false`. If `true`, the middleware won't automatically rehydrate
> the state on initialization. Use `rehydrate` function manually in this case.
> This is useful for server-side rendering (SSR) applications.
> — [persist](https://zustand.docs.pmnd.rs/reference/middlewares/persist)

`next-themes` requires an opt-out on the element it mutates:

> If you do not add suppressHydrationWarning to your `<html>` you will get
> warnings because `next-themes` updates that element. This property only
> applies one level deep, so it won't block hydration warnings on other
> elements.
> — [next-themes](https://github.com/pacocoursey/next-themes)

## 3. Decision

### 3.1 The workspace gets three layouts, not one

`app/(app)/layout.tsx` stops being the app shell and becomes only what a root
layout must be: `<html>`, `<body>`, the shared font, and the providers. It
renders no navbar and no sidebar. Two nested route groups sit beneath it:

```
app/(app)/
  layout.tsx              ← root layout: html, body, fonts, providers. No chrome.
  providers.tsx           ← "use client" — Query + theme
  (shell)/
    layout.tsx            ← navbar + collapsible sidebar
    dashboard/page.tsx
    projects/page.tsx  campaigns/  analytics/  settings/
  (focus)/
    layout.tsx            ← stepper only; no sidebar, by construction
    projects/[id]/…
```

Neither group is a root layout, so moving between the dashboard and a workflow
step stays a client-side transition. The sidebar is not hidden by a conditional
— it is not in the tree at all on a workflow route, which is the only version of
"hide the sidebar" that cannot be defeated later by someone adding a prop.

`(shell)/projects/page.tsx` (the list) and `(focus)/projects/[id]/` (the
workflow) do not collide: one resolves to `/projects` and the other to
`/projects/{id}`.

### 3.2 Providers live in the workspace root layout, and only there

`app/(app)/providers.tsx` is the single `"use client"` boundary that wraps the
workspace: `QueryClientProvider` outside, `ThemeProvider` inside. The
`QueryClient` is created per request on the server and once per browser
session on the client, per the TanStack guidance above, with a default
`staleTime` above zero.

The marketing shell gets **none of this**. It is a separate root layout with no
server state and no theme switch, so spec 002's "exactly one client component
on the landing page" survives this spec intact. That is the payoff of the
two-root-layout split, and it is worth naming: providers are a workspace cost,
not an application cost.

### 3.3 Nothing on this route is prefetched on the server — because it cannot be

The dashboard fetches entirely on the client, through
`useQuery(['projects', filter])` and `useQuery(['stats'])` as
`docs/screens.md` specifies. There is no `prefetchQuery`, no `dehydrate` and no
`HydrationBoundary` in v1.

This is not a performance judgement. The mock adapter's state lives in
`sessionStorage` (§2.2), which the server cannot see. A server prefetch would
dehydrate a *different* dataset — fixture-seeded, missing every project the
user created this session — and `HydrationBoundary` would hand that to the
client as though it were fresh. The user would watch their own projects
disappear and then reappear on refetch. Correct-looking code, wrong data.

The route still prerenders a static shell: `page.tsx` is a Server Component
that touches no runtime API, so the skeletons ship in the initial HTML and the
data arrives after hydration.

When `lib/api/real/` becomes real, server prefetching becomes both possible and
worthwhile. It is deliberately deferred to that spec rather than half-built now.

### 3.4 No `dynamic = "error"` here, unlike the landing page

Spec 002 pins `/` static with `export const dynamic = "error"`. The dashboard
does **not** get that guard, and the difference is deliberate rather than an
omission.

The landing page is static forever; the guard costs one line and buys a
permanent guarantee. The dashboard is expected to become dynamic the moment
authentication exists, because a session read is a runtime API. Pinning it
static now would mean adding a guard and removing it a spec later — and a guard
that gets removed teaches the next reader that the guard is negotiable.

Static rendering is still the expectation. It is asserted by checking the build
output shows `○ /dashboard`, not by a segment config.

### 3.5 Persisted preferences resolve before paint, not after hydration

Both preferences follow the same shape, so the workspace has one mechanism
rather than two.

**Theme** uses `next-themes` with `attribute="class"` and
`defaultTheme="dark"`, and `<html>` carries `suppressHydrationWarning` as its
docs require. This works with `app/globals.css` unchanged: our dark palette is
`:root` and light is opted into by a `.light` class, so the `light` class
`next-themes` writes lands exactly where the stylesheet expects it. The `dark`
class it writes in dark mode matches no rule and is inert.

**Sidebar collapse** lives in the `ui-store` Zustand slice persisted to
`localStorage`, as `docs/screens.md` requires, with `skipHydration: true` so the
middleware does not race React. A small inline script in the workspace root
layout reads the same key before first paint and stamps a `data-sidebar`
attribute on `<html>`; CSS keys the sidebar width off that attribute. The store
rehydrates in an effect and owns the state from then on.

The script is the same trick `next-themes` already performs for theme, applied
to the one other preference that is visible before React runs. Without it, every
workspace load renders an expanded sidebar and then snaps it shut.

### 3.6 The four states live in the component, not in `loading.tsx`

Skeleton stat tiles and three skeleton rows, an `EmptyState` with "Create your
first communication", and an inline error card with a Retry — all driven by the
query's own `isPending` / `isError` state inside the client components.

`loading.tsx` is not used on this route. It is a Suspense fallback for *server*
work, and §3.3 means there is no server work to suspend on: it would appear for
approximately zero milliseconds and then hand over to the real skeletons. Two
loading treatments for one wait is worse than one.

Skeletons match the final dimensions of what replaces them, so nothing shifts
when data lands (`docs/design-system.md` §6).

### 3.7 The status filter is component state, not a URL parameter

The recent-projects filter is `useState` inside the list client component. It is
not a `searchParams` value.

Reading `searchParams` is a runtime API and would take the route dynamic,
trading the static shell for a shareable filter URL on a screen nobody shares.
It is also not a durable preference, so rule 3 does not send it to Zustand
either — it dies with the page, which is correct.

### 3.8 Vendored primitives are edited, not aliased

The dashboard needs a small set of shadcn primitives in `components/ui/`:
`button` and `skeleton`. (The status filter itself ended up as a native
`<select>`, not a vendored `dropdown-menu` — see §7 item 2.)

shadcn's CSS-variables mode expects token names our design system does not
define — `--card`, `--popover`, `--muted`, `--input`, `--ring`, `--destructive`.
Each vendored file is **edited** to use our vocabulary (`--surface`,
`--surface-raised`, `--muted-foreground`, `--border`, `--accent`, `--danger`)
rather than teaching `app/globals.css` a second set of names for colours it
already has. Rule 7 says these files are ours to edit directly; this is what
that permission is for.

`StatCard` and `EmptyState` are ours, built to the contracts in
`docs/design-system.md` §5 and placed in `components/shared/`.

### 3.9 Recipient PII does not appear on this screen

The recent-projects list renders `Project.name` and `Project.status` and
nothing else. It does not render `Project.recipient` — not the name, not the
company, not the email — and row links go to `/projects/{id}`, never a URL
carrying any recipient field.

Rule 11 governs this in general; it is worth stating for the dashboard
specifically because a "recent activity" list is the single most natural place
for someone to add "to: Jane Doe, Acme" as a helpful detail.

### 3.10 The greeting is dropped in v1

`docs/screens.md` opens the page with "Good morning, {name}". Neither half can
be rendered today, so the heading becomes the page title and the subtitle
`docs/screens.md` already gives it — "Create personalised client
communications" — with `+ Create New` unchanged beside it.

The name needs authentication, which spec 001 §5 deferred out of v1. The time
of day cannot be computed in a statically prerendered Server Component: it would
be evaluated once at build and every visitor would be told good morning
(§2.3). Computing it in a client effect instead means the heading is empty on
first paint and fills in afterwards, which is a worse first impression than a
plain title.

This is a real departure from `docs/screens.md`, recorded in §4.

## 4. Where this meets the constitution

**The one genuine conflict is with `docs/screens.md`, not with `CLAUDE.md`.**
Two of its statements about this screen cannot be implemented as written. The
app shell cannot both be `app/(app)/layout.tsx` and be absent from workflow
routes (§3.1). The greeting cannot be rendered at all (§3.10). Neither is a
rule being bent — `docs/screens.md` describes the product, and in these two
places it describes something the framework will not do. Both should be
corrected there once this spec is accepted.

**Rule 3 is satisfied exactly, including its two prohibitions.** Projects and
stats are Query; sidebar collapse and theme are Zustand and `next-themes`; the
filter is neither, because it is neither server state nor a preference. No
Zustand store fetches. Nothing that belongs in Zustand is in the Query cache.

**Rule 8 is respected but is under more strain than on the landing page**, and
that should be admitted rather than glossed. A dashboard whose data is entirely
client-fetched has a client boundary near the top of the tree — the stat row and
the project list are both client components. What keeps this honest is that the
*shell* stays server-rendered: navbar, sidebar, page header and the section
scaffolding are Server Components, and only the two data surfaces and the
sidebar toggle are client. If a later change pushes `"use client"` up to the
layout, that is the signal that §3.3 needs revisiting, not that rule 8 needs
relaxing.

**Rule 9 is fully in force here**, unlike on the landing page where spec 002
found its precondition absent. Both queries ship all four states.

## 5. Rejected alternatives

**Keep the shell in `app/(app)/layout.tsx` and hide the sidebar conditionally.**
The literal reading of `docs/screens.md`, and the reason it is tempting is that
it needs no new folders. It fails on rule 8: deciding whether to render the
sidebar means knowing the current route, and `usePathname` is a client hook, so
the entire workspace shell becomes a client component to hide one element. It
also fails on durability — a conditional is a thing someone can add an exception
to, whereas a route group is a thing that cannot be reached from the wrong
subtree.

**Server-prefetch the dashboard with `prefetchQuery` + `HydrationBoundary`.**
This is the pattern the TanStack docs lead with, and on a real backend it is
right. Here it would dehydrate fixture data the browser's `sessionStorage` mock
disagrees with, so the user's own projects would flicker out and back. Rejected
on correctness, and revisitable the day the adapter stops living in the
browser — at which point it is a clear win rather than a hazard.

**Fetch on the server and skip TanStack Query on this screen entirely.** Also
tempting: the dashboard is read-only, so `async` Server Components reading the
API directly would be simpler and would ship less JavaScript. Same fatal flaw
as above — the server cannot see the mock's state — plus it violates rule 3,
which assigns projects and stats to Query by name. And it would leave the
dashboard as the one screen with a different data-access pattern from every
other, which is a cost that outlives the mock adapter.

**Put the providers in the marketing root layout too, or in a shared parent.**
There is no shared parent — that is the whole point of spec 001's two root
layouts — and adding providers to `(marketing)` would put a `QueryClientProvider`
and a theme runtime on a page that has no queries and no theme switch,
destroying the property spec 002 spent a section establishing.

**Persist the sidebar in a cookie and read it in the server layout.** This is
the most serious alternative, and it genuinely solves the flash: the server
renders the correct width first time, so there is nothing to correct. It loses
because `cookies()` is a runtime API and would take every route under `(app)`
dynamic — trading the entire workspace's static shell for one preference —
and because `docs/screens.md` already assigns sidebar collapse to the persisted
`ui-store` slice. Worth reopening if the workspace goes dynamic for
authentication anyway, at which point the cost disappears and this becomes the
better answer.

**Accept the flash: `skipHydration` plus a rehydrate effect, and nothing else.**
The cheapest correct-by-hydration option, and what most codebases ship. Rejected
because the sidebar is on screen for every second of every workspace session,
and a visible snap on every single page load is the kind of small ugliness that
defines how a tool feels. The pre-paint script is roughly ten lines.

**Read `localStorage` during render and guard with `typeof window`.** The
version of the above that looks simplest and is actually broken: the server
renders one branch, the client's first render another, and React reconciles
them wrongly rather than loudly. It is the specific mistake `skipHydration`
exists to prevent.

**Use `loading.tsx` for the loading state.** It is the framework-idiomatic
answer and it is free. It is also inert here, because there is no server work
to suspend on (§3.6), so it would flash and hand over to component skeletons
immediately. It becomes the right answer at the same moment server prefetching
does.

**Put the status filter in `searchParams`.** Shareable, survives a refresh, and
back-button-friendly. It costs the route's static shell, on a screen whose URL
nobody shares, for a filter that should not survive a refresh anyway.

**Add shadcn's expected token names as aliases in `app/globals.css`.** Faster
than editing each vendored primitive, and it would let `npx shadcn add` output
drop in untouched. Rejected because it creates two names for every colour, and
the second set has no meaning in this design system — a reviewer would have no
way to know whether `--muted` and `--muted-foreground` are related, opposed, or
the same thing. Rule 7 explicitly makes the primitives editable so that this
trade does not have to be made.

## 6. Consequences

**Files that move.** `app/(app)/dashboard/page.tsx` — the placeholder spec 002
added — moves to `app/(app)/(shell)/dashboard/page.tsx` and is replaced. The URL
does not change, so spec 002's landing CTA and the `robots.ts` disallow list
both keep working untouched.

**New in the tree.**

```
app/(app)/
  providers.tsx                    ← "use client": Query + theme
  (shell)/layout.tsx               ← navbar + sidebar
  (focus)/layout.tsx               ← no sidebar, by construction
components/
  ui/{button,skeleton}.tsx          ← vendored, edited to our tokens
  shared/{StatCard,EmptyState}.tsx
  dashboard/{StatRow,RecentProjects,ProjectRow,DashboardHeader}.tsx
lib/api/{index.ts,types.ts,mock/}  ← the seam, per docs/data-model.md
lib/query-client.ts                ← per-request on server, singleton in browser
stores/ui-store.ts                 ← sidebar collapse, persisted, skipHydration
hooks/                             ← query hooks over lib/api
types/index.ts                     ← gains the domain model
```

**Dependencies added:** `@tanstack/react-query`, `zustand`, `next-themes`.

**`app/globals.css` gains no new colour tokens**, only whatever the sidebar
width attribute needs. The shadcn vocabulary is absorbed by editing the
primitives, not by extending the theme.

**`docs/screens.md` needs two corrections** once this is accepted: the app-shell
section should describe the `(shell)` / `(focus)` split rather than a single
`app/(app)/layout.tsx`, and the dashboard's greeting should become the plain
title until authentication exists.

**This spec is a prerequisite for the workflow.** `lib/api`, the Query client,
the `ui-store` and the `(focus)` layout are all built here and all consumed by
`projects/[id]/*`. The workflow spec should assume them rather than re-deciding
them.

**Testing gap, stated rather than papered over.** Async Server Components
cannot be unit tested, so the layouts and `page.tsx` are out of reach — the
reachable and worthwhile targets are the `ui-store` slice, the mock adapter,
and the two data components across all four states with a mocked `api`.

## 7. What implementation changed

Built and verified. Nine corrections surfaced; none reverses a decision above.

1. **`ApiClient` had no `getStats()`.** `docs/screens.md` specifies
   `useQuery(['stats'])` and `docs/data-model.md`'s own query-key factory
   reserves a `stats` key, but its `ApiClient` interface lists no method
   returning them. Added here and in `types/domain.ts`; **`docs/data-model.md`
   needs the matching correction.**
2. **The status filter is a native `<select>`, not a vendored
   `dropdown-menu`.** §3.8 listed the primitive; eight options and a control
   that is keyboard- and screen-reader-correct for free did not justify ~300
   lines plus a Radix dependency. Vendor it when a screen needs a menu of
   commands.
3. **§3.8's token list was wrong in both directions.** `--card` and `--muted`
   are not used by these primitives; `--secondary`, `--secondary-foreground`,
   `--popover-foreground` and `--accent-foreground` are, and were missed. The
   decision — edit, do not alias — was right for a stronger reason than the
   spec gave: **the `--accent` collision does not fail.** shadcn uses `accent`
   as a neutral hover background; we define it as the AI-action blue, so
   `skeleton` (literally `bg-accent`) would have rendered every dashboard
   skeleton solid blue, reading as "a job is running". It compiles and renders.
   Three more silent mismatches were stripped in the same pass: `dark:`
   variants (we configure a `light` variant, so `dark:` falls through to
   `prefers-color-scheme`), `rounded-md`, and `font-medium`.
4. **`isServer` is defined locally, not imported.** The TanStack docs show
   `environmentManager.isServer()`, which does not exist in
   `@tanstack/react-query@5.102.8`. This closes §7's first open item by
   sidestepping the import entirely.
5. **Intra-workspace links use `next/link`.** §3.2's plain-`<a>` reasoning
   applies only to the marketing boundary, where a root-layout crossing forces a
   full page load. Within `(app)` a client transition is available and correct.
6. **The sidebar CSS override cannot live in `@layer base`.** `:root` is
   unlayered, and unlayered declarations beat layered ones regardless of
   specificity, so `html[data-sidebar="collapsed"]` parsed, matched, and
   silently lost. Only a browser check caught this; it is invisible to tests.
7. **The sidebar collapses to icons.** §3.5 specified the width mechanism but
   not the content; without icons the collapsed rail rendered "D…", "P…".
   `lucide-react` added.
8. **Vitest could not start a worker once `.next` grew past ~50MB.**
   `tsconfigPaths: true` makes Vite honour a `tsconfig.json` whose `include`
   `next build` rewrites to cover `.next/dev/types/**`. Replaced with one
   explicit alias. The symptom — "Timeout waiting for worker to respond" — looks
   like a broken runner, not a config problem, so it is recorded here.
9. **Two Query-testing pitfalls, documented in the tests.** A never-resolving
   promise leaves React's act queue undrained and hangs RTL cleanup; and
   `mockRejectedValue` builds its rejection before a handler can attach, so Node
   reports an unhandled rejection and fails a test whose component behaved
   correctly.

Verified rather than assumed: `/dashboard` builds `○ (Static)`; both
`/projects` and `/projects/[id]` coexist across the two route groups; a
collapsed sidebar survives reload at 64px with no snap and no console errors;
light and dark both render; and a failing `listProjects` shows an in-place Retry
while the stats above it still load.

## 8. Unverified

Both library items are now closed — see §7 items 3 and 4. One remains, and one
is new.

- **Whether the pre-paint sidebar script is worth its cost.** §3.5 asserts the
  flash is bad enough to justify the inline script. That is a judgement about
  perceived quality, not a measurement. It works, and the collapsed state does
  restore without a snap; whether anyone would have minded the snap is still
  unmeasured.
- **The script's coupling to `persist`'s storage envelope.** The script parses
  `{ state: { sidebarCollapsed } }` by hand. `stores/ui-store.test.ts` pins that
  shape, so a Zustand change fails a test rather than silently reintroducing the
  flash — but the test asserts the shape, not that the script still reads it.
  A rename in one file and not the other would still pass.
