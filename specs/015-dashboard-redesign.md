---
Spec:        015
Title:       Dashboard redesign — the wireframe's grammar, not its chat product
Status:      draft
Created:     2026-09-11
Supersedes:  —
---

# 015 · Dashboard redesign — the wireframe's grammar, not its chat product

Decides how `/dashboard` changes to match a supplied wireframe
(`03_dashboard.png`, one of six pages in a `signet_wireframes_6_pages` set)
without importing the product the wireframe was actually drawn for. The
wireframe is a general-purpose AI-chat assistant home screen — a "New Chat"
button, a "Chat" sidebar destination, a freeform "Ask anything… (Ctrl + /)"
input with an attach affordance, a "Library" destination, a "Team"
destination, "Explore templates" as a quick action, and a "Recent Chats" list
stamped with relative timestamps. Signet.ai is not that product. This spec
takes the wireframe's layout and visual weight — greeting hero, card-based
quick actions, a recent-activity feed, a search-forward header — and maps
each element onto what this repo has already decided exists, rejecting
whatever has no real counterpart rather than inventing one to match a
mockup.

## 1. Problem

The current `/dashboard`, built in [specs/003](003-dashboard.md), is
functionally complete but visually spare: a title, a subtitle, three stat
tiles, and a plain list of recent projects (`app/(app)/(shell)/dashboard/page.tsx`,
`components/dashboard/{StatRow,RecentProjects,ProjectRow}.tsx`). The supplied
wireframe asks for something with more presence — a personalised greeting, a
prominent primary action, a grid of quick-start cards, and an activity feed
that reads at a glance. The request ("I want this like this type dashboard")
is about that visual and structural language, not a literal port: the
wireframe's own content is a chat product's home screen, complete with a
"New Chat" button and a "Team" destination, and this repo has no chat surface
and no team/workspace-collaboration concept anywhere in its domain model
(`types/domain.ts`) or route table ([specs/001](001-route-map.md)).

Three things are genuinely undecided and need one answer each:

1. **Which of the wireframe's elements have a real counterpart in this
   product, and which don't.** Some map cleanly (a greeting, a create action,
   a recent-items list). Some map to something this repo has already built
   and rejected under a different name (`Explore templates` is the
   `/templates` route [specs/001](001-route-map.md) §4 dropped for violating
   rule 1). Some map to nothing at all (`Chat`, `Library`, `Team` — no route,
   no type, no spec).
2. **Whether the wireframe's relative timestamps ("2 hours ago") can be
   built here.** `lib/utils.ts` already made this call once, in a comment
   attached to `formatDate`, and rejected it for a stated reason.
3. **Whether a global search bar can sit in the navbar**, given
   [specs/004](004-projects-list.md) §3.1 already decided that the one search
   box this product has — the `/projects` name filter — is deliberately
   **not** URL-addressable, in part for a rule-11 reason.

## 2. Constraints

### 2.1 From `CLAUDE.md`

The preamble is the constraint that governs the whole exercise before any
numbered rule does: this repo is **"the Feature in Focus"** — the personal
report-video-email flow — and explicitly **not** the clip flow or the
faceless-video flow the same PRD also describes. `docs/prd-alignment.md` §1
states it as "No. Not a route, not a type, not a seam method" for both of the
other two products. A freeform chat assistant is a fourth thing the PRD does
not describe at all; treating the wireframe as a literal spec would add a
product the PRD itself never asked for, which is a stronger objection than
"not built yet."

Rule 1 binds directly on the quick-actions grid: "a workflow step exposes at
most 3–5 controls; everything else reads from a saved preset," and its
mirror forbids a settings-shaped surface with no per-project value.
`Explore templates` is not a workflow control at all — it is a second
navigation surface for video/email templates, which already live under
`Settings → Video` and `Settings → Email`
([specs/001](001-route-map.md) §4: *"A `/templates` page creates a second
configuration surface — a direct violation of rule 1"*).

Rule 6 binds on colour: "Never hardcode a hex or an arbitrary value... use a
semantic token." The wireframe's send button is green. This design system
has no decorative green — `--success` exists and is reserved for "job
succeeded," not for a submit affordance
(`docs/design-system.md` "Job-state colours are derived... colour is reserved
for job outcomes, not decoration," restated verbatim in
`components/dashboard/ProjectRow.tsx`'s own comment). `--accent` is the only
candidate, and it happens to be the semantically correct one: "AI actions
only" (`docs/design-system.md` §2), and starting a project kicks off the
AI-driven Analysis step.

Rule 11 binds on the search box: "Recipient data is client PII. Never...
place it in a URL query string." `Project.name` is not recipient PII by
itself, but [specs/004](004-projects-list.md) §4 already reasoned through
this exact box and rejected `searchParams` partly on rule-11 grounds; §2.3
below explains why that reasoning also forecloses a *global*, cross-screen
version of the same box.

Rule 3 binds as it does everywhere: quick-action tiles that just navigate are
neither server state nor a durable preference, so they carry no store at
all — same treatment [specs/003](003-dashboard.md) §3.7 gave the status
filter.

### 2.2 From this repo's own prior decisions

[specs/001](001-route-map.md) §4 fixed the sidebar's destination set —
Dashboard, Projects, Campaigns, Analytics, Settings — and dropped or deferred
everything else the wireframe's sidebar shows:

| Wireframe item | This repo's decision |
|---|---|
| `Chat` | No such surface exists; not in the PRD's Feature in Focus. |
| `Library` | `specs/001` §4: "Reports… Deferred. Every report is reachable through `Project.report`. A standalone library earns nothing in v1." |
| `Team` | No workspace-collaboration concept anywhere in `types/domain.ts` or the auth schema (`lib/db/schema.ts` has only `accounts` and `passwordResetTokens`). |
| `Explore templates` (quick action) | `specs/001` §4: dropped, rule 1. |

`components/shell/Sidebar.tsx`'s own comment already states this policy:
*"Templates, Reports and Videos were deliberately not built... a second
configuration surface violates rule 1."* This spec does not reopen that
decision; it is bound by it.

`lib/utils.ts` already ruled on relative time, for the exact case this
wireframe asks for:

> Absolute rather than relative: a work queue and a send history are both
> scanned for *when*, and "2 days ago" would reintroduce a `Date.now()` read
> into a render.

[specs/003](003-dashboard.md) §2.3 is the fuller version of the same point:
`Date.now()` inside a component is a value that is either frozen at build
(if the component could ever be server-rendered) or re-derived on every
render (if computed client-side, in which case a page left open across a
session goes stale — "2 hours ago" silently becoming wrong without a poll
loop nothing else on this route has).

[specs/004](004-projects-list.md) §3.1 already decided the shape of search on
this product's one real list screen: *"`/projects?q=meridian` is not [a
real, shareable address] — the search box is component state and never
touches the URL."* §4 of that spec ties part of that decision to rule 11.

[specs/003](003-dashboard.md) §3.10 and `docs/screens.md`'s dashboard section
left the time-of-day greeting **deliberately unrestored**, not missing: *"the
greeting itself was left unrestored on purpose, as separable follow-up work,
not a gap in specs/011. Restore it computed client-side from
`getCurrentAccount()`."* Real authentication ([specs/011](011-real-authentication.md))
now exists, so this spec is the separable follow-up `docs/screens.md` named.

### 2.3 Why a navbar search box cannot be the wireframe's search box

The wireframe's top-bar search implies one thing: type a query, see results,
possibly across more than one kind of record. This product has exactly one
search implementation today — the `/projects` name filter — and it is
`useState` inside that page's client component, not a URL parameter, by
explicit prior decision. A navbar search box that lived on `/dashboard` and
searched `/projects` would need one of three mechanisms, and each fails:

- **Write the query to `/projects`'s URL.** Directly reopens
  [specs/004](004-projects-list.md) §3.1's rejected alternative, for the same
  reason it lost there.
- **Hand the query to `/projects` via a new global (Zustand) store.** Rule 3
  assigns Zustand to "wizard step, draft edits, UI preferences" — a one-shot
  cross-screen handoff value is none of those, and a store built to carry
  exactly one string between exactly two screens is the kind of abstraction
  rule "don't design for hypothetical future requirements" (`CLAUDE.md`
  header guidance) rules out on its own.
- **Give the navbar its own search, independent of `/projects`'s.** This
  needs a service-layer method this repo does not have —
  `lib/api/types.ts`'s `ApiClient` has `listProjects(filter?)`, not a
  cross-entity search, and campaigns, recipients and presets each live under
  their own route with their own query keys. Building one is a
  service-layer decision, not a styling one, and belongs in its own spec if
  it is ever wanted.

## 3. Decision

### 3.1 The hero: a restored greeting, and a CTA card instead of a prompt box

The page title becomes `Good {morning|afternoon|evening}, {name}`, computed
client-side from `getCurrentAccount()` (`lib/auth/dal.ts`) inside the same
client component that already owns the stats and recent-projects queries —
not a Server Component, for the reason [specs/003](003-dashboard.md) §2.3
gives: a statically-evaluated build-time greeting tells every visitor "good
morning." The subtitle stays `docs/screens.md`'s existing copy, "Create
personalised client communications."

The wireframe's `Ask anything… (Ctrl + /)` input is **not built**. It implies
a freeform natural-language entry point with no defined output contract —
exactly what rule 1 forecloses for a workflow surface ("at most 3–5
controls; everything else reads from a saved preset") and what the PRD does
not describe for this product (§2.1). In its place, the same visual slot — a
large `--surface-raised` card, full-width, sitting where the prompt box sat —
holds the existing `+ Create New` action from [specs/004](004-projects-list.md),
enlarged to hero scale: an icon, "Start a new project," and the subtitle
"Upload a report to begin." It calls the same `createProject` mutation
[specs/004](004-projects-list.md) already defined and routes into
`(focus)/projects/[id]/report`, exactly as the existing header button does.
The button surface uses `--accent` (rule 6, §2.1) — both because it is the
only token available and because it is the semantically correct one: this
click starts the AI-driven Analysis step.

The existing small `+ Create New` button in the page header is removed — one
hero-scale entry point replaces it, rather than two controls doing the same
thing at different sizes on the same screen.

### 3.2 Quick actions: three cards, each a real route

Four cards in the wireframe become three, each pointing at a destination
[specs/001](001-route-map.md) §4 already fixed rather than at anything new:

```
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Projects     │  │  Campaigns    │  │  Analytics    │
│  Browse every │  │  See what's   │  │  See how it's │
│  communication│  │  been sent    │  │  performing   │
└───────────────┘  └───────────────┘  └───────────────┘
```

`Start a new chat` and `Create a project` collapse into the single hero CTA
(§3.1) — this product has no "chat" distinct from a project, so the
wireframe's two entry points are one entry point here. `Upload a file`
collapses into the same CTA: uploading a report is not a separate action
from starting a project, it is the first step inside one
(`Report → Recipient → Analysis → Video → Email → Review → Send`).
`Explore templates` is dropped outright — §2.1 and §2.2 above.

Each card is a plain `next/link`, styled to the wireframe's card language
(`--surface`, `--radius-lg`, an icon, a title, one line of copy) with no
query behind it — same "no store, because it is neither server state nor a
preference" treatment [specs/003](003-dashboard.md) §3.7 gave the dashboard's
status filter.

### 3.3 Recent Projects: absolute dates, not relative ones

`RecentProjects` / `ProjectRow` keep their existing query
(`useQuery(qk.projects(status))`) and their existing rule-11 guarantee — no
`Project.recipient` field, ever (`components/dashboard/ProjectRow.tsx`'s
existing comment stays true). The one visible change is the timestamp: each
row gains `formatDate(project.updatedAt)` (`lib/utils.ts`, already exported,
already used elsewhere) rendered next to the status label. "2 hours ago" is
rejected — §2.2's `lib/utils.ts` citation and [specs/003](003-dashboard.md)
§2.3 both already made this call, for the same underlying reason: a relative
label is a `Date.now()` read wearing a timestamp's clothes, and it goes
silently stale on any tab left open.

The section heading changes from "Recent Projects" only in emphasis (larger,
sitting under the quick-actions row as the wireframe's "Recent Chats" does),
not in name — "Recent Chats" is not this product's vocabulary.

### 3.4 The navbar gains no search box

Per §2.3, a global search bar is **not built** in this spec. `Navbar.tsx`
keeps its current contents — the wordmark and `ThemeToggle` — unchanged.
Search stays exactly where [specs/004](004-projects-list.md) put it: inside
`/projects`, as component state, never in a URL. A cross-screen or
cross-entity search is real future work and belongs in its own spec, sized
to the service-layer method it would need.

The wireframe's notification bell and help-chat icon are dropped for the
same class of reason as §3.1's prompt box: both imply subsystems this repo
has not built (a notification/inbox domain type; a support-chat surface) and
neither is named anywhere in `docs/prd-alignment.md`'s inventory of what this
product does. Adding icons for systems that do not exist behind them is
worse than adding nothing — a bell that never shows a badge is a broken
promise, not a quiet omission.

### 3.5 Sidebar: restyled, not re-scoped

`components/shell/Sidebar.tsx`'s five destinations (Dashboard, Projects,
Campaigns, Analytics, Settings) are unchanged in number and target — §2.2
already binds this. Three purely visual changes bring it closer to the
wireframe's weight without touching its policy:

1. The active item's neutral fill (already specified, "never accent" per
   `docs/screens.md`) moves from `--radius-xs` to `--radius-lg`, matching the
   wireframe's rounded active pill. Still neutral, never `--accent` —
   unchanged rule.
2. A `+ New Project` action is added at the top of the sidebar, above the
   destination list, visually parallel to the wireframe's `+ New Chat` but
   calling the same `createProject` mutation as §3.1's hero card and the
   existing header action it replaces. This is a genuine, small addition —
   `createProject` already exists as a mutation ([specs/004](004-projects-list.md)) — not a new
   capability, only a second point of entry to one that exists.
3. The bottom account area keeps `SignOutButton` and gains the signed-in
   account's name from `getCurrentAccount()` — no "Free Plan" badge, because
   this product has no plan/billing tiers (`Settings → Usage` is
   "quota and spend — read-only," per `docs/screens.md`, not a plan
   selector).

### 3.6 Four states, unchanged ownership

Nothing here moves the loading/empty/error/success ownership
[specs/003](003-dashboard.md) §3.6 already assigned. The hero CTA and quick
actions are static content with no query behind them, so they carry no
loading state of their own — they render immediately, same as the page
title. `RecentProjects` keeps its existing skeleton, `EmptyState`, and
inline-error-with-Retry, extended only by the new date column, which is
absent (not a loading skeleton) until the row itself has data.

## 4. Rejected alternatives

**Build the freeform "Ask anything" input as a real text field, wired to
nothing yet.** Tempting because it is the wireframe's single most visually
distinctive element. Rejected because a text input with no destination is
worse than an honest button — it invites a user to type a real request into
a box that silently does nothing, and there is no spec anywhere in this repo
for what receiving that text would even mean (no `Conversation` or
`ChatMessage` type, no endpoint, no job). Building the input now and wiring
it up later inverts the right order: the capability would need its own spec
first.

**Keep `Explore templates` but point it at `/settings/video` and
`/settings/email`.** A tidy-looking compromise — the wireframe's fourth card
survives, just retargeted. Rejected because it re-adds exactly the surface
[specs/001](001-route-map.md) §4 spent a sentence ruling out: a second
navigation path to configuration that already has one, which is what rule 1
exists to prevent regardless of where the second path points.

**Add `Chat`, `Library` and `Team` to the sidebar as disabled/greyed
placeholders**, the way the wireframe itself greys out `Upload a file`.
Rejected on the same reasoning as the prompt box: a disabled nav item for a
product this repo has explicitly decided against (`Chat`), deferred
(`Library`) or never described (`Team`) teaches a future reader that these
are pending work rather than closed questions. `specs/001` already closed
two of the three; this spec is not the place to quietly reopen them by
implication.

**Give the navbar search box its own client-side-only "search," scoped to
just the projects already in the TanStack Query cache.** Avoids every
objection in §2.3 about a new store or a new API method, since it would just
filter data already fetched for the recent-projects list. Rejected because
the dashboard only ever holds the *recent* handful of projects
(`useQuery(qk.projects(status))` on this route is bounded, per
[specs/003](003-dashboard.md)), so a search box here would silently search a
small, arbitrary subset and miss most of a user's actual projects — a
correctness trap disguised as a convenience, worse than not having the box.

**Relative timestamps with a client-side re-render interval (poll every
minute to keep "2 hours ago" honest).** The technically complete fix for the
staleness objection in §3.3. Rejected as disproportionate: a `setInterval`
solely to keep a decorative string accurate is a new moving part on a screen
[specs/003](003-dashboard.md) went out of its way to keep server-static, for
a label whose only job is answering "when," which `formatDate` already
answers without a timer.

**Route the hero CTA to a different, "quick create" flow that skips straight
to file upload without first creating a `Project`.** Would shave one click.
Rejected because `Project` is the unit everything else in the domain model
hangs off (`report`, `recipient`, `analysis`, `script`, `video`, `email`,
`package` all live on it, per `types/domain.ts`), and
[specs/004](004-projects-list.md) already made project-creation a mutation
precisely so there is always a real project to route into before the
workflow renders anything. A shortcut that produces workflow state with no
backing project would need its own spec, not a dashboard-styling decision.

## 5. Consequences

**Files that change.**

```
components/dashboard/
  DashboardHeader.tsx      ← new: greeting + hero CTA card (replaces the
                              header's small "+ Create New")
  QuickActions.tsx         ← new: three-card grid, next/link only, no query
  ProjectRow.tsx           ← gains formatDate(project.updatedAt)
components/shell/
  Sidebar.tsx              ← +New Project action; active-item radius;
                              account name in place of no badge
app/(app)/(shell)/dashboard/page.tsx  ← composes DashboardHeader + QuickActions
                                         above the existing StatRow/RecentProjects
```

`Navbar.tsx`, the query keys, the mock adapter, and every non-dashboard route
are untouched. No new `ApiClient` method, no new domain type, no new store.

**`docs/screens.md`'s dashboard section needs updating** once this is
accepted: the wireframe layout (greeting hero, quick-actions grid) replaces
the current ASCII mock in that file, and its note that the greeting is
absent should be corrected — the greeting returns, per §3.1, now that
authentication makes it renderable.

**What this spec explicitly leaves open, for a future spec rather than a
silent gap:** cross-entity or URL-addressable search (§2.3), a notification
system (§3.4), and any "Team"/collaboration concept (§2.2) — none of these
are refused forever, only refused as a side effect of a dashboard restyle.

## 6. What implementation changed

Built and verified. Four corrections surfaced, all caught before or during
implementation rather than after; none reverses the decision in §3.

1. **`getCurrentAccount()` is `import "server-only"`** (`lib/auth/dal.ts`),
   and it reads the session cookie, so it can be called only from a Server
   Component, and calling it anywhere makes that segment dynamic. §3.1's "the
   same client component that already owns the stats and recent-projects
   queries" was wrong as written — the account name is fetched once in
   `dashboard/page.tsx` (the existing Server Component) and passed into
   `DashboardHeader` as a prop; the client component only resolves the
   time-of-day half, which genuinely cannot move to the server (§2 below).
   §3.5's sidebar account-name line is **dropped** — confirmed with the
   product owner rather than assumed: showing the name in `Sidebar.tsx` would
   have taken every `(shell)` route dynamic, not just the dashboard, since
   the sidebar is shared chrome for `/projects`, `/campaigns`, `/analytics`
   and `/settings` too. The sidebar keeps `SignOutButton` only. Verified by
   build output: `ƒ /dashboard`, `○` everywhere else under `(shell)`.
2. **The greeting's time-of-day half uses `useSyncExternalStore`, not
   `useEffect` + `setState`.** §3.1 said "computed client-side... not a
   Server Component" without naming the mechanism, and the first
   implementation (a mount effect calling `setState`) failed this repo's own
   lint config: `react-hooks/set-state-in-effect` flags synchronous
   `setState` inside an effect body as a cascading-render risk.
   `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` is the
   API React ships for exactly this shape — a value that legitimately
   differs between the server's render and the browser's (the server's
   clock/timezone is not the visitor's) — and it resolves the client value
   immediately after hydration without a manual effect or a
   `suppressHydrationWarning` escape hatch.
3. **`--radius-lg` was wrong for the quick-action cards and the sidebar's
   active-item highlight.** `docs/design-system.md` §3 is explicit and names
   "large radii on dense content cards" as its own anti-pattern: `rounded-lg`
   and up (20px+) is reserved for floated/artwork surfaces — the sanctioned
   light inversion, illustration frames — not workspace cards. Both places
   use `rounded-md` (8px) instead, still inside the documented "dense
   content" band and still a visible step up from the pre-existing
   `rounded-xs`. The hero CTA card follows the same rule: `bg-surface` with a
   hairline border, no `--shadow-float` (reserved for `PreviewPane`'s
   inversion, "one per screen at most," and not built yet).
4. **The new date on `ProjectRow` uses `text-body-foreground`, not
   `text-muted-foreground`, and a semantic `<time>` element.** §3.3 did not
   specify a token. `docs/design-system.md` §1's own documented contrast trap
   applies directly: `--muted-foreground` on `--surface` measures 4.30:1,
   under the rule-10 floor, and `ProjectRow`'s rows sit inside exactly that
   `--surface` card. `components/projects/ProjectTableRow.tsx` had already
   solved this same problem for `/projects`'s own date column — its own
   comment names `ProjectRow.tsx` as "the second of two places the
   temptation arises" — so `ProjectRow` now matches its `<time
   dateTime={...}>` / `tabular-nums` / `text-body-foreground` treatment
   exactly, rather than inventing a second convention for the same field.

Verified rather than assumed: `npm run typecheck`, `npm run lint` and
`npm test` (289/289) all pass; `npm run build`'s route table shows `ƒ
/dashboard` with `/projects`, `/campaigns`, `/analytics` and every
`/settings/*` route unchanged at `○`.

## 7. Unverified

- **Whether the greeting's brief neutral-to-personalised swap (or, in a real
  SSR/hydration pass, `getServerSnapshot`'s `null` state) is worth building
  at all**, versus simply dropping the time-of-day half and keeping "Hello,
  {name}." This is the same class of judgement call specs/003 §8 left open
  for the sidebar's pre-paint script — implemented and correct, effect on
  perceived quality unmeasured.
- **The pre-existing sidebar active-route highlight was found unimplemented
  during this work**, not introduced by it (`components/shell/Sidebar.tsx`
  has no `usePathname` call despite `docs/screens.md` describing the
  behaviour). Left as found and flagged in both files' comments; closing it
  is real follow-up work, not part of this spec.

## 8. Addendum — stat tiles and Recent Projects removed from the page

By direct instruction, after §3–§7 above shipped: `StatRow` and
`RecentProjects` no longer render on `/dashboard` at all.
`app/(app)/(shell)/dashboard/page.tsx` now composes only `DashboardHeader`
and `QuickActions`. This is a narrower page than §3 decided — §3.6 explicitly
kept both components' "four states" ownership on this route — and the
narrowing is recorded here rather than folded silently into §3, because it
reopens something §3 had settled rather than merely restyling it.

Neither component was deleted. Both still exist in `components/dashboard/`,
still export normally, and both test files (`StatRow.test.tsx`,
`RecentProjects.test.tsx`) still pass, since they render the components
directly rather than through the page. `hooks/use-stats.ts` and its backing
`api.getStats()` method are consequently unreached from any route today —
`hooks/use-projects.ts` is not affected, since `components/projects/ProjectsTable.tsx`
still consumes it for the `/projects` list. This is dead code left in place
on purpose rather than deleted speculatively: deleting a component, its
tests, its hook and its `ApiClient` method is a bigger and less reversible
action than removing two JSX lines, and it was not asked for. Whoever next
touches this page should either give `StatRow`/`RecentProjects` a home again
(this page, or elsewhere — `/analytics` already covers some of the same
ground `StatRow`'s numbers did) or remove them outright; leaving them
unrendered indefinitely is the one outcome nobody has actually decided on.

## 9. Addendum — the quick-action cards removed as well

By direct instruction, in the same session as §8: `QuickActions` — the
Projects/Campaigns/Analytics card grid §3.2 decided — no longer renders on
`/dashboard` either. `app/(app)/(shell)/dashboard/page.tsx` now composes only
`DashboardHeader`: the greeting and the hero "Start a new project" CTA. That
CTA is the entire page, besides the greeting.

Same treatment as §8, for the same reason: `QuickActions.tsx` and its own
test file are untouched and still pass — nothing currently imports the
component. Its three destinations are not stranded, though — `Sidebar.tsx`
already links to `/projects`, `/campaigns` and `/analytics` on every `(shell)`
route, so removing the card grid removes a second path to those routes, not
the only path. This is the same category of "leave it un-rendered, don't
delete it, don't silently patch the plan-of-record" call the same page has
now made twice; if a third such instruction arrives, that is a signal this
page's actual scope has settled somewhere §3 did not anticipate, and is worth
a fresh decision rather than a third addendum.

## 10. Addendum — `DashboardHeader` recomposed as a centred, single-focus hero

§9 flagged a third *removal* instruction as the signal to stop patching and
re-decide. What arrived instead was a *recomposition* instruction, given a
reference screenshot of a chat product's home screen (greeting, centred;
below it, one large rounded prompt surface; nothing else on the page) with
explicit instructions that the reference's shape should be followed but not
its function — "for Project reason[s]," not a box anyone can type into. That
is a smaller, more scoped change than §8/§9's removals, so it earns a
decision here rather than a fresh spec: the page's *content* is unchanged
(still exactly the hero action §3.1 and §8/§9 left as the entire page); only
its layout and the hero card's visual weight change.

`DashboardHeader` is now `flex min-h-[60vh] flex-col items-center
justify-center`, so the greeting and the card sit centred in the remaining
viewport rather than anchored top-left under the navbar — the composition
the reference actually showed, and one that only reads as intentional once
the page has nothing else on it (§8, §9 made that true first; this would
have looked broken as a hero above three quick-action cards and a projects
list). The small `"Create personalised client communications"` caption line
is dropped — the reference has no equivalent second line under its greeting,
and with the page this spare, one clean line reads better than two.

The card itself moves from `rounded-md` to `rounded-2xl`. §3's and §8/§9's
own reasoning against large radii on dense content still holds everywhere
else in this app; it does not hold here, for the reason
`docs/design-system.md` §3 itself gives — that band is for "floated and
artwork containers," and its own worked example is "the inverted prompt
surface." This card is not inverted, but it is now the one and only floated
surface on an otherwise empty page, which is a closer match to that carve-out
than to an ordinary dense workspace card. This is a narrow, named exception,
not a precedent for radius elsewhere on the dashboard.

**What was not built, and why, restated because the reference makes the
temptation sharper than the first pass through this question did:** the
reference's box is a real text input with a blinking cursor. This one is
not, and does not pretend to be — no placeholder-styled fake caret, no
`<input readOnly>`. `specs/015` §3.1 and §4 already gave the reason (rule 1,
no `Conversation`/`ChatMessage` type, no defined output for arbitrary text),
and the instruction that produced this addendum explicitly asked for the
reference's *look*, "than any[one] typ[ing]... anything... in the chat" —
confirming the same conclusion, not reopening it. The card keeps exactly the
one action it already had: a labelled, accessible button that starts a
project, laid out where the reference's send control sits.

Verified: `npm run typecheck`, `npm run lint`, and
`components/dashboard/DashboardHeader.test.tsx` all pass unchanged — the
component's props, greeting logic and accessible button name are untouched;
only its JSX layout and class names changed. Checked visually in both themes
in a running `next dev` session.

## 11. Addendum — the card gets a real text field and a working attach control

§10 shipped a static placeholder line and a decorative "+" — and said so:
"no placeholder-styled fake caret." The next instruction pointed at that
decision by name: the "+" did not visibly do anything, and a reviewer asked
for a real, typable field, "for Project reason[s]... not anyone typ[ing]...
anything... in the chat" — the same phrase §10 already cited, this time
disambiguating it in the direction of *build a real field, scoped to
starting a project* rather than *the placeholder text is close enough*.
That is a narrower, buildable request, and this addendum is the decision to
build it rather than a reversal of §10's actual boundary.

**What changed.** The card's static line is now a genuine controlled
`<input>`: typed text becomes the new project's name. `ApiClient.createProject`
gained one optional parameter — `createProject(name?: string)` — rather than
a new method or a new domain concept; the mock adapter trims it and falls
back to its existing `"Untitled project"` default exactly as before when
nothing is typed. The "+" is now a real, accessible file-attach control (a
`<label>` wrapping a visually-hidden `<input type="file">`, with the
`aria-label`-equivalent "Attach a report" text a screen reader announces —
the previous version was `aria-hidden` with no control behind it at all,
which is the literal bug report: *"here + icon not working."* The whole card
is now a drop target too, mirroring `ReportStep`'s dropzone.

**What "Start a new project" does now, in order:** create the project
(named from the typed text, or the default), and — only if a file was
attached — call the same `api.uploadReport` mutation `ReportStep` calls,
then record its job id in `useWorkflowStore` under that project's `"parse"`
key. Landing on `/projects/{id}` afterwards therefore shows the parse
already in progress, rather than an empty dropzone unaware that a file was
just picked. Validation is not duplicated: both this card and `ReportStep`
import the same `rejectionForReportFile` from the new
`lib/report-validation.ts` (extracted from `ReportStep.tsx`, which now
imports it too rather than keeping its own copy) — one rule, enforced
identically in both places a report can be picked.

**What is still not built, because the request did not ask for it and the
product still has no shape for it:** the typed text is a name, not a
request. Nothing reads it for meaning, summarises it, or hands it to a
model — it is `Project.name` and nothing else. There is still no
`Conversation`/`ChatMessage` type, no endpoint that accepts arbitrary text
and decides what to do with it, and rule 1's "at most 3–5 controls, a
defined output" still governs. If a future instruction asks for the typed
text to *do* something beyond naming the project — summarise it, extract a
recipient from it, pre-fill Analysis from it — that is a new capability
needing its own decision, not an extension of this one.

Tests were rewritten rather than patched, since the component's shape
changed materially: `DashboardHeader.test.tsx` now covers typing a name,
Enter-to-submit, attaching and removing a file, the upload-and-track-job
path, and the drag-and-drop rejection path (dropped rather than picked,
because `@testing-library/user-event`'s `upload()` filters candidates
against the input's own `accept` attribute — the same non-enforcement MDN
documents for real browsers, just simulated in the opposite direction, so
the invalid-file test exercises the drop handler instead). Verified:
`npm run typecheck`, `npm run lint`, and the full suite (296/296) all pass;
checked visually in a running `next dev` session — typing, submitting with
no file, and submitting with an attached PDF all reach `/projects/{id}` with
the typed name visible in the `/projects` list afterwards.

## 12. Addendum — the "+" opens a menu instead of sharing the row with the button

§11 put two controls on the card's bottom row: the "+" file-attach control on
the left, "Start a new project" pinned on the right. The next instruction,
given two reference screenshots of a chat product's own composer (a "+" next
to the message field that, on click, reveals an "Add files or photos" row),
asked for that interaction specifically — collapse the row's two actions
behind the single "+", opened as a menu, with "Start a new project" as its
second item and the standalone button removed. That is a request about this
row's interaction shape, not about what the card is for; §11's boundary
(typed text is a name, not a request; no `Conversation` type; no AI reads
this field) is untouched.

**What changed.** The "+" is now a real `<button type="button">` with
`aria-haspopup="menu"` / `aria-expanded`, no longer the file input's own
`<label>`. Clicking it toggles a `role="menu"` popover, positioned below the
button (`absolute top-full`; see §14 for why this replaced an initial
above-the-button placement). The
menu holds two `role="menuitem"` buttons: "Add files or photos" (calls
`inputRef.current?.click()` on the same hidden `<input type="file">` §11
already wired up, now associated by `id`/`htmlFor` instead of by wrapping)
and "Start a new project" (calls the same `start.mutate()` the name field's
Enter handler already called). Selecting either item, clicking outside the
menu, or pressing Escape closes it — the last two via one `mousedown` /
`keydown` listener pair attached to `document` only while the menu is open,
removed on close or unmount. Escape also returns focus to the trigger, so
keyboard use never drops focus into the page body.

**Why a hand-rolled popover instead of a library.** No popover or
dropdown-menu primitive is vendored into `components/ui/` and no Radix
package beyond `react-slot` is a dependency (`package.json`) — this is one
trigger, one two-item list, and no nested submenus, focus trap, or portal
requirement, well inside what `docs/design-system.md`'s "CSS only, no motion
library" precedent already sets for this codebase's default: reach for a
dependency when a keyframe (or, here, a `useEffect` and two DOM listeners)
cannot express the interaction, not before.

**What did not change.** `ApiClient.createProject`'s signature, the upload
mutation's shape, `lib/report-validation.ts`, the drop-zone behaviour, and
the accessible name "Start a new project" the button carried before all
carry over unchanged — only where that control lives moved.
`DashboardHeader.test.tsx` was updated to open the menu (click "Add to this
project") before asserting on the "Start a new project" `menuitem`, plus new
cases for the menu's own open/closed state, the file-picker handoff, and
Escape-to-close. Verified: `npm run typecheck` and the full
`DashboardHeader.test.tsx` suite (13/13) pass; checked visually in a running
`next dev` session in both themes — opening the menu, choosing each item,
clicking outside, and Escape all behave as described.

## 13. Addendum — Settings moves from the sidebar footer into the "+" menu

The next instruction, given a screenshot of `Sidebar`'s footer, asked for its
"Settings" link removed from there and added as a third item in the "+" menu
§12 had just built — "when user tap[s] the + icon button ... show total 3
options." §12's menu already had exactly the right shape for a third item
(one more `role="menuitem"` button), so this is an extension of §12, not a
reopening of it.

**What changed.** `components/shell/Sidebar.tsx` no longer renders a
`Settings` link — the footer row now holds only `SidebarToggle` and
`SignOutButton`. `DashboardHeader`'s menu gained a third `menuitem`,
"Settings", which calls `router.push("/settings")` and closes the menu, the
same shape as the other two items. Because the trigger button and the menu's
own `aria-label` were named "Add to this project" for a two-item, both-
additive menu, and "Settings" is neither additive nor project-scoped, both
were renamed to "More options" — the accessible name a screen-reader user
hears no longer overpromises what the menu contains.

**The consequence, stated plainly because it is a real one.** Before this
addendum, Settings was reachable from every page under `(shell)` via the
persistent sidebar footer. After it, the only persistent path to `/settings`
from inside the workspace is the dashboard hero's "+" menu — which only
renders on `/dashboard`. A user on `/projects`, `/campaigns` or `/analytics`
has no sidebar link, navbar link, or menu to reach Settings from; they would
need to navigate to the dashboard first. This was not asked to be solved
(no "and also keep a link somewhere else" was said), and nothing in `docs/`
or the non-negotiable rules requires Settings to be reachable from every
screen, so this addendum does not invent a second entry point beyond the one
requested. It is recorded here, rather than silently accepted, so that a
future instruction to restore broader Settings reachability is a two-line
diff against a documented decision, not an undiscovered regression.

**What did not change.** `/settings` and its nine sections, the settings
sub-navigation, `revalidatePresetsAction`, and every other route under
`(shell)` are untouched — only the link's location moved.
`Sidebar.test.tsx`'s "renders the five fixed destinations" test became "four
fixed destinations" (Settings dropped) plus a new test asserting no
`Settings` link renders; `DashboardHeader.test.tsx` gained a "Settings"
assertion in the three-item menu-contents test and a new test that choosing
it calls `router.push("/settings")` and closes the menu. Verified: `npm run
typecheck`, `npm run lint`, and both components' test files pass; checked
visually in a running `next dev` session in both themes — the sidebar footer
now shows only the collapse toggle and sign-out, and the "+" menu's third
item navigates to `/settings`.

## 14. Addendum — the menu opens downward, not upward

§12 opened the menu above the "+" (`absolute bottom-full`), reasoned as
avoiding an off-screen drop below the card. With three items instead of two
(§13), that placement instead overlapped the "Good morning" heading and the
top of the card itself — shown, not described, in the next instruction's
screenshot, followed by "its not looking good ... show this Properly." The
fix is a one-line direction flip: `absolute top-full` with `mt-2` instead of
`bottom-full` with `mb-2`, so the menu now drops below the button into the
empty space beneath the card, the same direction the reference screenshots
in §12 (a chat composer's own "+") used to begin with. Nothing else about
the menu — its contents, closing behaviour, or accessibility attributes —
changed. Verified: `npm run typecheck` passes and `DashboardHeader.test.tsx`
(14/14, unaffected by a class-name-only change) passes; checked visually in
a running `next dev` session that the menu now renders below the "+" without
overlapping the heading.
