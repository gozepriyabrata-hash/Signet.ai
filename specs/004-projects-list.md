---
Spec:        004
Title:       The projects list
Status:      accepted
Created:     2026-09-01
Supersedes:  —
---

# 004 · The projects list

Defines `/projects`: what the screen is, where its filter state lives, why the
search box is deliberately *not* in the URL, and how creating a project stops
being a dead link.

This spec is a different shape from the two before it. Specs
[002](002-landing-page.md) and [003](003-dashboard.md) each implemented a screen
`docs/screens.md` had already specified. **There is no `/projects` section in
`docs/screens.md`.** Spec [001](001-route-map.md) created the route with a
one-line justification — "The dashboard shows only *recent* projects; the
sidebar needs a real list" — and nothing has described the screen since. So this
file defines it as well as deciding how it is built, and `docs/screens.md` has
to gain a section to match.

## 1. Problem

Five things are open, and one of them is a bug already shipped.

1. **Two dead links are live right now.** The dashboard's `+ Create New` button
   and its empty state both link to `/projects/new`. That route does not exist
   and never appeared in spec 001's route map. Both were added by spec 003 and
   both 404.
2. **Where list state lives is genuinely undecided.** Spec 003 §3.7 put the
   dashboard's status filter in component state and rejected `searchParams`
   explicitly. Part of that reasoning transfers to a list page and part of it
   does not, and the difference has never been written down.
3. **The service seam cannot express what this screen needs.** `ApiClient`
   offers `listProjects(filter?: ProjectStatus)`. There is no way to search.
4. **Its relationship to the dashboard list is undefined.** Reusing
   `ProjectRow` is the obvious move; whether it is the right one depends on
   whether these two screens are doing the same job.
5. **Pagination is unspecified**, and it is the kind of thing that gets guessed
   wrong permanently because the guess is cheap to make and expensive to undo.

## 2. Constraints

### 2.1 From `CLAUDE.md`

Rule 3 is binding as before: server state to TanStack Query, UI preferences to
Zustand, and nothing that is neither in either. Rules 8, 9 and 10 apply in full.

Rule 11 is the one that changes a design decision on this screen rather than
merely being obeyed:

> **Recipient data is client PII.** Never log it, never place it in a URL query
> string, never send it to a third party the user did not configure.

Rule 1 applies by analogy rather than by letter. It caps a *workflow step* at
three to five controls, and this is not a workflow step — but the reason behind
it ("what keeps the product a premium AI workspace instead of a settings form")
is exactly the pressure a list screen comes under.

### 2.2 From Next.js 16 — the constraint that shapes the whole screen

Reading the URL's query string from a Client Component has a specific cost on a
prerendered route:

> If a route is [prerendered](https://nextjs.org/docs/app/glossary#prerendering),
> calling `useSearchParams` will cause the Client Component tree up to the
> closest `Suspense` boundary to be client-side rendered.
> — [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)

That cost is affordable. What is not affordable is forgetting the boundary,
because the failure mode is asymmetric:

> During production builds, a static page that calls `useSearchParams` from a
> Client Component must be wrapped in a `Suspense` boundary, otherwise the build
> fails with the Missing Suspense boundary with useSearchParams error.

and, in the same note:

> In development, routes are rendered on-demand, so `useSearchParams` doesn't
> suspend and things may appear to work without `Suspense`.

A thing that works all day in `next dev` and then fails `next build` is worth
writing down once rather than rediscovering.

The alternative — reading the `searchParams` prop in the Server Component page —
is a runtime API, and takes the route dynamic. The same page also notes that
layouts never receive `searchParams` at all, and that where dynamic rendering
*is* wanted, `connection()` is now preferred over `export const dynamic =
'force-dynamic'`.

The documented way to write a query parameter back is `useRouter` or `Link`
with a `createQueryString` helper built from `new URLSearchParams(...)`.

### 2.3 From TanStack Query

Changing a query key is, by default, a new query with a new loading state:

> the UI jumps in and out of the `success` and `pending` states because each new
> page is treated like a brand new query
> — [Paginated Queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)

`placeholderData: keepPreviousData` is the documented answer, and it exposes
`isPlaceholderData` so the UI can mark the rows it is showing as stale.

### 2.4 From this codebase

The mock adapter is still browser-resident (spec 003 §2.2), so nothing on this
screen can be prefetched on the server either. That decision is inherited, not
re-made.

`lib/api/types.ts` currently declares `listProjects(filter?: ProjectStatus)`.

## 3. Decision

### 3.1 The status filter lives in the URL. The search query does not.

`/projects?status=ready_for_review` is a real, shareable, bookmarkable address.
`/projects?q=meridian` is not — the search box is component state and never
touches the URL.

That split is the most important decision in this spec and §4 explains the half
of it that is about rule 11. The half that is about product: a status filter is
a *view* of the list, and a person who filters to "Ready for review", opens one,
and presses Back expects to land back in that view. A dashboard filter is a
glance adjustment on a screen that exists to be a starting point; a list filter
is where the user was.

This is not a reversal of spec 003 §3.7. That spec asked whether the dashboard's
filter deserved to survive a refresh and answered no. This spec asks the same
question about a different screen and answers yes for one control and no for the
other. The test is the same both times: does this state deserve to outlive the
page?

### 3.2 The route stays static, via a Suspense boundary

`app/(app)/(shell)/projects/page.tsx` stays a Server Component with no runtime
API, so it prerenders. The client component that reads `useSearchParams` is
wrapped in `<Suspense>` with a fallback that matches the toolbar's dimensions.

The fallback is not decorative. Without the boundary this route builds in `next
dev` and fails `next build` (§2.2), so the boundary is load-bearing and gets a
comment saying so.

As on the dashboard, there is no `dynamic = "error"` guard: this route is
expected to become dynamic when authentication lands, and a guard that gets
deleted a spec later teaches the wrong lesson (spec 003 §3.4).

### 3.3 Filter changes use `router.replace`, not `push`

Selecting a status rewrites the URL in place. `push` would add a history entry
per change, so a user who tried three filters would need four Back presses to
leave the page.

`replace` keeps the address bar truthful while leaving Back meaning "the screen
before this one", which is what a person intends by it.

### 3.4 Rows persist across a filter change

The list query uses `placeholderData: keepPreviousData`, so changing the status
keeps the current rows on screen while the new set loads, and
`isPlaceholderData` dims them until it arrives.

This is not a fifth state smuggled past rule 9. The first load still shows
skeletons; empty, error and success are all unchanged. `keepPreviousData` only
governs what a *subsequent* fetch looks like, and without it every filter change
would blank a full table back to skeletons — the "jumps in and out" the Query
docs describe.

### 3.5 A real `<table>`, and the dashboard keeps its list

`/projects` renders `<table>` with a `<caption>`, a `<thead>` and one `<tr>` per
project. The dashboard keeps its `<ul>` of `ProjectRow`s and the two do not
share a row component.

They are doing different jobs. The dashboard shows three to five rows as a
summary — "what is happening in my system?" — where a list element is the
honest markup. This screen exists to scan and compare an unbounded set, where
column headers give screen-reader users row and column context that a stack of
list items cannot, and where sorting becomes a small change later rather than a
rewrite. `docs/design-system.md` already anticipates tables, listing them in the
4–8px "dense content" radius band.

The duplication is real and accepted: two components rendering a project,
because there are two genuinely different presentations of one.

### 3.6 Search goes into the seam, not the component

`ApiClient.listProjects` becomes:

```ts
listProjects(options?: { status?: ProjectStatus; query?: string }): Promise<Project[]>
```

Filtering the returned array inside the component would work today and would be
fewer lines. It would also mean that the day `lib/api/real/` starts talking to a
backend that can search, every call site has to change — which is precisely the
coupling the seam exists to prevent. `docs/data-model.md` needs the matching
correction, and the dashboard's one call site moves to the new shape.

### 3.7 No pagination in v1, and the reason is not laziness

The list renders everything the adapter returns.

Adding pagination now means choosing between offset and cursor, encoding that
choice in `ApiClient`, and validating it against a mock holding seven rows. That
is a guess about a backend nobody has built, made permanent in the one interface
this codebase promises not to churn. It is deferred to the spec that makes
`lib/api/real/` real, where the backend's actual capabilities decide it.

What this spec does commit to: the table is built so that adding a footer does
not restructure it, and the mock's fixture count stays small enough that
rendering all of it is honest.

### 3.8 Creating a project is a mutation, not a route

`/projects/new` is deleted rather than built. It was never in spec 001's route
map; spec 003 introduced two links to it by assumption and both currently 404.

A `NewProjectButton` client component owns the behaviour: a `useMutation` that
calls `api.createProject()` and, on success, pushes to the new project's first
workflow step. It shows a pending state while the mutation runs and an inline
error with a retry if it fails — the same discipline rule 9 imposes on reads.

A page whose only job is to run a side effect and redirect is a URL that means
"do something", and a user can land on it from history, a bookmark or a refresh.
A button that performs an action is what this is.

The button creates a project **only from a click**. Nothing on this screen
mutates on mount.

### 3.9 Recipient PII, again and more carefully

The table shows `Project.name`, `Project.status` and `Project.updatedAt`. It
does not render any `Recipient` field, and row links go to `/projects/{id}`.

That is the same discipline the dashboard follows. What is new here is the
search box, and §4 is about that.

## 4. Where this meets the constitution

**Rule 11 changes a decision on this screen, rather than merely being obeyed.**

The natural design puts the search query in the URL alongside the status, so a
filtered-and-searched view is shareable. Read literally, rule 11 permits it:
`Project.name` is not a `Recipient` field, so putting it in a query string
breaks no letter of the rule.

Read for its purpose, it does not. Project names in this product describe client
work, and the seed fixtures in `lib/api/mock/fixtures.ts` demonstrate the
problem in our own code — "Q3 Portfolio Review — Meridian Capital", "Benefits
Renewal Summary — Northgate". A `?q=meridian` parameter puts a client identifier
into browser history, into the `Referer` header of every outbound link from the
page, and into any URL a user pastes into a chat. The rule exists to stop client
identity leaking through channels nobody audits, and a search box is such a
channel whether or not the string came from a `Recipient` record.

So the status filter — a seven-value enum that identifies nothing — goes in the
URL, and the free-text search does not. The cost is that a searched view cannot
be shared, which is a real loss on a list screen and is accepted deliberately.

This is a genuine exception in the sense that it *costs* something. It is not a
sign the approach is wrong: the same reasoning would apply to any free-text
search over client-authored content, and the answer would be the same.

**Rule 3 is satisfied, including the awkward case.** The status filter is in the
URL, which is neither Query nor Zustand — and that is correct, because rule 3
partitions *application* state and the URL is not application state, it is the
address. The search query is component state for the same reason the dashboard's
filter is: it does not deserve to survive the page.

**Rule 1 is respected in spirit.** The screen ships exactly three controls: a
status filter, a search box, and `+ Create New`. Sorting, saved views, bulk
selection and column configuration are all things a list screen accretes, and
all are out.

**Rule 9 applies in full**, and §3.4 explains why `keepPreviousData` does not
quietly reduce four states to three.

## 5. Rejected alternatives

**Put both the status and the search query in the URL.** The obvious design, and
what most list screens do. Rejected on rule 11's purpose rather than its letter,
for the reasons in §4. Worth revisiting only if project names stop being
client-descriptive, which seems unlikely for a product whose entire subject is
client communications.

**Put neither in the URL, matching the dashboard exactly.** Consistent, simpler,
and it keeps one pattern across both screens. It loses the thing that makes a
list page a page rather than a widget: you cannot link a colleague to "everything
ready for review", and Back after opening a project drops the filter. Consistency
between two screens is worth less than each screen behaving as its own job
requires.

**Read `searchParams` in the Server Component page instead of `useSearchParams`
in a client one.** Simpler to reason about, no Suspense boundary, and the docs
themselves say it is "often a better option" when a Server Component needs the
value for data fetching. It takes the route dynamic, and this route fetches
nothing on the server (§2.4), so it would trade the static shell for nothing at
all. It becomes the better answer at the same moment server prefetching does.

**Skip the Suspense boundary.** It works in `next dev` — the docs say so
explicitly — and then fails `next build`. Listed here because "it worked
locally" is the exact shape of the mistake this rejection exists to prevent.

**Force the route dynamic with `connection()`.** The documented modern way to opt
into dynamic rendering, and it would remove the boundary requirement. Rejected
for the same reason as reading `searchParams` on the server: it buys a
simplification by giving up the static shell, on a route that has no server work
to do.

**Adopt `nuqs` or a similar URL-state library.** These exist because
`createQueryString` boilerplate is tedious, and they are good. For two
parameters — one of which is not going in the URL at all — a dependency is more
surface than the eight lines it replaces, and the documented Next.js pattern is
one this team should be able to read without a manual.

**Filter and search client-side over the full list.** Fewer moving parts, no
interface change, instant results, and entirely reasonable while the mock holds
seven rows. It puts query logic in a component, so replacing the adapter with a
real backend would require touching every call site instead of one file. The
seam exists precisely to make that swap cheap; spending it to save an interface
change is a bad trade.

**Ship pagination now.** See §3.7. The objection is not that pagination is
unnecessary — it is that choosing its shape against a seven-row mock is a
coin-flip encoded into `ApiClient`.

**Ship sortable columns now.** A table invites them, and `aria-sort` makes them
accessible. Deferred on rule 1's spirit: the screen already has three controls,
default order by most-recently-updated answers the common question, and a sort
nobody asked for is how a list screen starts becoming a settings form. The table
markup chosen in §3.5 is what makes adding them cheap later.

**Reuse `ProjectRow` and render a list, as the dashboard does.** The reuse is
tempting and the components would start identical. They would diverge on the
first column the list needs and the dashboard does not, at which point the
shared component grows a prop for each difference. §3.5 takes the duplication
instead, with the reasoning recorded so it is a decision rather than an
oversight.

**Build `/projects/new` as a page.** It would fix the dead links in one file and
it is what the links already assume. A route whose render performs a mutation
misbehaves on refresh, on Back, and on any bookmark, and spec 001's route map
never contained it. §3.8 removes the links instead.

**Infinite scroll.** No pagination and infinite scroll are not the same choice.
Infinite scroll makes the footer unreachable, breaks Back, and is hostile to
keyboard and screen-reader users scanning a work queue.

## 6. Consequences

**A bug in spec 003's output is fixed here.** `components/dashboard/RecentProjects.tsx`
and `app/(app)/(shell)/dashboard/page.tsx` both link to `/projects/new` and both
must move to `NewProjectButton`. Spec 003's own file list did not anticipate
this component.

**The `ApiClient` signature changes**, so `hooks/use-projects.ts` and the
dashboard's call site move to the options object. This is the second correction
`docs/data-model.md` needs — spec 003 already found that its interface was
missing `getStats()`.

**`docs/screens.md` gains a section it has never had.** Every other screen in
the app has one; this route was created by a spec and described by nobody.

**New in the tree.**

```
app/(app)/(shell)/projects/page.tsx     ← replaces the placeholder
components/projects/
  ProjectsToolbar.tsx    ← "use client", reads useSearchParams, inside Suspense
  ProjectsTable.tsx      ← "use client", the query and the four states
  ProjectTableRow.tsx
  NewProjectButton.tsx   ← "use client", the create mutation
lib/api/types.ts         ← listProjects options object
hooks/use-projects.ts    ← options passthrough, keepPreviousData
```

**What this unblocks and what it still waits on.** `NewProjectButton` pushes to
the new project's first workflow step, which does not exist until the workflow
spec lands; until then it pushes to `/projects/{id}`, which is the placeholder
spec 003 created to prove the `(focus)` split. That is a temporary target and is
marked as one in the code.

**Testing.** The reachable targets are the toolbar's URL writes (status changes
the query string, search does not), the table across all four states, the
PII regression that no `Recipient` field and no search term reaches the DOM or
an href, and that `NewProjectButton` does not mutate on mount.

## 7. What implementation changed

Built and verified. Seven notes; none reverses a decision above.

1. **`ProjectsToolbar` and `ProjectsTable` are not siblings.** §6's file list
   implied they were, but the toolbar owns status (URL) and search (component
   state) while the table needs both, so a parent client component —
   `ProjectsBrowser` — holds the boundary and the toolbar became presentational.
   Splitting "where each value lives" across two components is how that decision
   gets accidentally reversed.
2. **`NewProjectButton` lives in `components/shared/`, not
   `components/projects/`.** The dashboard uses it twice, and `StatCard` and
   `EmptyState` are already in `shared/` for that reason.
3. **`EmptyState`'s `action` prop is now a node, not `{ label, href }`.** The
   old shape forced every empty state's action to be a link; this one needs a
   button that runs a mutation. That change reached into spec 003's dashboard
   test, which had to gain a `next/navigation` mock because its empty state now
   renders a component that uses the router.
4. **The search is debounced by 250ms.** Not in the spec, but search goes
   through the seam, so each distinct value is a request and the mock adds
   300–800ms on top. Undebounced, eight keystrokes are eight requests and the
   last to *resolve* wins rather than the last sent.
5. **`keepPreviousData` moved into the shared `useProjects` hook**, so the
   dashboard's list inherits it too. That is an improvement there rather than a
   regression, but it is a behaviour change to a spec 003 screen and should be
   read as one.
6. **The skeleton token was wrong, twice.** Spec 003 changed shadcn's
   `bg-accent` to `bg-surface` to stop skeletons rendering AI-blue. That
   overcorrected: skeletons sit inside `bg-surface` cards and tables, so they
   were invisible against their own container — which no test caught and only
   looking at the page revealed. Now `bg-surface-raised`.
7. **The `ApiClient` blast radius was nine call sites**, not the two §6 named.

Verified in a browser rather than assumed:

- `/projects` builds `○ (Static)` with the boundary, and **removing the
  `<Suspense>` fails `next build`** with the documented error, *"useSearchParams()
  should be wrapped in a suspense boundary at page /projects"*. The boundary is
  load-bearing, and the failure is invisible in `next dev`.
- Changing the status filter writes `?status=…`; **typing in search leaves the
  URL untouched**, which is §4's whole argument made observable.
- Three filter changes added **zero** history entries, and one Back left the
  page — settling the first item below.
- A cold load of `/projects?status=sent` restores the select and the filtered
  rows.
- `+ Create New` creates one project and navigates to it; the dead links are
  gone.

## 8. Unverified

- ~~**That `router.replace` does not add a history entry in this specific
  setup.**~~ **Closed.** Three consecutive filter changes on a Suspense-wrapped
  client component reading `useSearchParams` on a prerendered route left
  `history.length` unchanged, and a single Back left `/projects` entirely.
- **Whether the `Referer` leak in §4 is real for this app.** The argument that a
  `?q=` parameter reaches outbound `Referer` headers assumes the page links
  somewhere external and that the referrer policy allows the query string.
  Neither was measured here, and the modern browser default
  (`strict-origin-when-cross-origin`) strips the path and query on cross-origin
  requests. The decision does not rest on this point alone — browser history and
  pasted links are enough on their own — but the header claim is the weakest leg
  of it and should not be repeated as established fact.
- **The screen's content beyond the four columns named in §3.9.** With no
  section in `docs/screens.md` to implement, the column set is this spec's
  proposal rather than a product decision, and should be reviewed as such.
