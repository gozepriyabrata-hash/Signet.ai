# Screens

Every screen below lists: **purpose**, **layout**, the **controls it is allowed
to show**, **entry/exit conditions**, and **where its data comes from**.

The "allowed controls" line is binding. If a control you want is not listed, it
belongs in Settings — see rule 1 of `CLAUDE.md`.

---

## Landing — `app/(marketing)/page.tsx`

**Purpose:** the public front door. Explain, to someone who has never seen the
product, what it turns a client report into and why a human still approves every
send — then hand them one obvious way in.

This is the only screen in the app with a persuasive job. Everything after it is
a work tool.

```
┌──────────────────────────────────────────────────────────┐
│  Logo          How it works  Pricing  Security   [ Open ]│
├──────────────────────────────────────────────────────────┤
│  Turn any client report into a personalised              │
│  video + email — approved by you, never auto-sent.       │
│  Upload the report. Review the package. Send it.         │
│            [ Open the workspace ]  [ See how it works ]  │
│  ┌────────────────────────────────────────────────────┐  │
│  │        product shot — Review screen                │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  trusted-by logo strip                                   │
├──────────────────────────────────────────────────────────┤
│  How it works — the seven steps, as a horizontal rail    │
│  Report → Recipient → Analysis → Video → Email → Review  │
├──────────────────────────────────────────────────────────┤
│  Three proof blocks, each with one real screenshot       │
│   · Nothing sends itself — the human gate                │
│   · Every AI word is editable                            │
│   · Configure once in Settings, not on every send        │
├──────────────────────────────────────────────────────────┤
│  Named testimonial with a number, beside the CTA         │
├──────────────────────────────────────────────────────────┤
│  Pricing preview · Security note · FAQ · Final CTA       │
├──────────────────────────────────────────────────────────┤
│  Footer — product, company, legal, status                │
└──────────────────────────────────────────────────────────┘
```

**Allowed controls:** the marketing nav (three in-page anchors — Pricing and
Security are sections, not routes — plus a quiet `/login` link), one primary
CTA repeated at top and bottom (**"Create a workspace"** → `/signup`,
specs/012), one secondary anchor CTA to `#how-it-works`, and footer links. No
forms, no email capture, no chat widget, no cookie-banner theatre in v1.

- **Server Component, fully static.** No data fetching, no TanStack Query, no
  Zustand. The only `"use client"` leaf is the mobile nav disclosure.
- **The hero must show the real product.** A screenshot of the Review screen —
  video, CTA and attached report in one frame — carries the proposition better
  than any copy. Placeholder art is worse than no art.
- **The differentiator is the approval gate, not the AI.** Every competitor
  claims AI generation. "A human approves every package before it sends" is the
  line that does the work; give it its own block.
- The seven-step rail reuses the real `WorkflowStepper` visual language so the
  landing page and the product look like the same software.
- Testimonials sit adjacent to a CTA, not in an isolated carousel, and each
  carries a name, a role and a quantified outcome.

**Design system exception — read before building.** `docs/design-system.md`
bans gradient heroes and reserves `--accent` for AI actions. Both rules exist to
stop the *workspace* looking like a landing page; the landing page is the one
surface where the accent may act as brand rather than as an AI signal. It still
draws only from the `@theme` tokens — no new hexes, no glassmorphism, no neon.
One accent-forward hero, and the rest of the page neutral.

**Entry:** unauthenticated root. **Exit:** `/dashboard`.
**Data:** none. Any logo, metric or testimonial ships as a typed constant in
`app/(marketing)/_content.ts` — never a fetch, never invented social proof.
---

## Sign up — `app/(marketing)/signup/page.tsx`

**Purpose:** capture who is asking and open a real, password-protected
workspace (specs/009, specs/011). **Layout:** minimal header (wordmark only,
no nav), a single `max-w-md` form. **Controls:** name, work email, company,
password — nothing else; no terms checkbox (`/legal/terms` does not exist).
**Entry:** direct URL, or the "Already have a workspace? Log in" link on
`/login`. **Exit:** `/dashboard` on success, via `signupAction`. **Data:** a
real SQLite row (`lib/db/schema.ts`), never mock-backed — specs/011 §2.1.

## Log in — `app/(marketing)/login/page.tsx`

**Purpose:** re-open an existing workspace (specs/011 — narrows specs/001 §5's
original rejection of `/login`; see specs/010 for the argument that held until
a real account store existed to check a credential against). **Layout:**
identical shell to `/signup`. **Controls:** work email, password. A wrong
password and an unknown email render the **same** generic error — this screen
never confirms which one was wrong. **Entry:** direct URL, the "Log in" link
on `/signup`, or `proxy.ts` redirecting an unauthenticated visitor away from a
protected route (`?from=<path>`). **Exit:** `/dashboard`. **Data:** real,
same store as `/signup`.

## Forgot password — `app/(marketing)/forgot-password/page.tsx`

**Purpose:** start a password reset (specs/014). **Layout:** the `/login`
shell. **Controls:** work email, and nothing else.

**This screen hands the reset link back in its own response instead of emailing
it, and says so on the page behind an explicit "Dev mode" label.** There is no
email infrastructure in this repo — the same wall `specs/011` §5 hit for
passwordless login. The two honest options were to disguise the gap ("check your
inbox", where nothing arrives) or to name it; the label is the second. It is
**not** gated by `NODE_ENV`: a flow that behaves differently in production than
in the environment it was tested in is a flow nobody has actually tested.

**The response is identical for a known and an unknown address**, exactly as
`/login` gives one generic error for a wrong password and an unknown email. A
form that confirms which addresses have accounts is an account-enumeration
oracle.

**Entry:** the "Forgot password?" link on `/login`. **Exit:** `/reset-password`
via the returned link. **Data:** `passwordResetTokens` — real.

## Reset password — `app/(marketing)/reset-password/page.tsx`

**Purpose:** consume a reset token and set a new password. **Layout:** the same
shell. **Controls:** new password, submitted with the token from the URL.

- **Tokens are single-use, database-backed and SHA-256-hashed**, and the row is
  deleted the moment it is consumed. Not a signed JWT: revocability is the one
  property this token needs that a session cookie does not (`specs/014` §3.2).
- **Known gap, named rather than hidden:** resetting a password does not
  invalidate existing sessions. `specs/014` records it, together with the
  rate-limiting question it shares with `specs/011`.

**Entry:** the link from `/forgot-password`. **Exit:** `/login`.
**Data:** real. An expired, unknown or already-used token renders a plain
explanation and a way back, never a stack trace.

## Privacy policy — `app/(marketing)/legal/privacy/page.tsx`

**Purpose:** say what this product stores about people, because `specs/011`
made real account PII persist server-side — the exact trigger `specs/001` §6 set
for publishing one (`specs/013`).

**Every claim on the page is sourced from this codebase's actual behaviour**
rather than from boilerplate, and the page names its own limits — no legal
review, no self-serve deletion yet — instead of implying either exists. A
privacy policy that describes a product you did not build is worse than none,
because it is the one document a reader is entitled to take literally.

**Controls:** none. Static Server Component. **`/legal/terms` stays deferred**;
nothing in the product yet needs one.
---

## App shell — `app/(app)/(shell)/layout.tsx`

There is no top-level `app/layout.tsx`. `(marketing)` and `(app)` each own a
root layout, so `/` and `/dashboard` render in different shells and navigating
between them is a full page load — which is what we want at that boundary.

**The workspace has three layouts, not one.** `app/(app)/layout.tsx` is the root
layout and owns only `<html>`, `<body>`, the shared font and the providers — no
chrome. Two nested route groups sit beneath it:

```
app/(app)/
  layout.tsx              ← root: html, body, fonts, providers. No chrome.
  providers.tsx           ← "use client" — TanStack Query + theme
  (shell)/layout.tsx      ← navbar + collapsible sidebar   ← THIS SCREEN
  (focus)/layout.tsx      ← the workflow. No sidebar, by construction.
```

The split exists because the shell cannot both live in the workspace root
layout and be absent from the workflow: everything under `(app)` would inherit
it. Hiding the sidebar conditionally would mean reading the route, and
`usePathname` is a client hook — the whole shell would become a Client
Component to hide one element. Neither group is a root layout, so moving between
the dashboard and a workflow step is still a client-side transition. See
`specs/003-dashboard.md` §3.1.

Top navbar plus a collapsible left sidebar. Server Component; only the sidebar
toggle and theme switch are client.

```
┌─────────────────────────────────────────────────────────────┐
│  Logo    Dashboard  Projects  Templates  Analytics   ⚙  👤  │
└─────────────────────────────────────────────────────────────┘
┌──────────────┐  ┌──────────────────────────────────────────┐
│  Dashboard   │  │                                          │
│  Projects    │  │            MAIN CONTENT                  │
│  Campaigns   │  │                                          │
│  Analytics   │  │                                          │
│  ───────     │  │                                          │
│  Settings    │  │                                          │
└──────────────┘  └──────────────────────────────────────────┘
```

Reports, Videos, Templates and Recipients are deliberately absent —
`specs/001-route-map.md` §4 resolved each of them away rather than building a
route. Templates in particular would be a second configuration surface, which
rule 1 of `CLAUDE.md` forbids.

- Sidebar collapses to icons below `lg`, becomes a drawer below `md`.
- The active route is marked with a neutral filled background — **not** accent.
- **The workflow routes hide the sidebar entirely.** Once a user is inside
  `projects/[id]/*`, the stepper replaces sidebar navigation. Focus is the point.

Data: none. Sidebar collapse state lives in the `ui-store` Zustand slice,
persisted to `localStorage`.

---

## Dashboard — `app/(app)/(shell)/dashboard/page.tsx`

**Purpose:** answer "what is happening in my system?" in one glance, and make
`+ Create New` the obvious next action.

```
┌─────────────────────────────────────────────────────┐
│ Dashboard                                           │
│ Create personalised client communications           │
│                                    [ + Create New ] │
├─────────────────────────────────────────────────────┤
│  Active Projects    Videos Generated   Emails Sent  │
│        24                 186              142      │
├─────────────────────────────────────────────────────┤
│ Recent Projects                                     │
│  Client Report A     Video Ready      Review →      │
│  Client Report B     Generating       Open →        │
│  Client Report C     Sent             View →        │
└─────────────────────────────────────────────────────┘
```

**Allowed controls:** `+ Create New`, a status filter on the recent list, and
row-level open/review links. Nothing else — no settings, no config, no bulk
actions in v1.

**No time-of-day greeting, still.** This screen opened with "Good morning,
{name}" until neither half turned out to be renderable: there is no user name
until authentication exists (`specs/001` §5), and the time of day in a
statically prerendered Server Component is evaluated once at build, so every
visitor would be told good morning. Authentication now exists (specs/011),
which resolves the first half — but the greeting itself was left unrestored on
purpose, as separable follow-up work, not a gap in specs/011. Restore it
computed client-side from `getCurrentAccount()` (`lib/auth/dal.ts`). See
`specs/003-dashboard.md` §3.10.

**Data:** `useQuery(qk.projects(status))` and `useQuery(qk.stats())`, both
fetched **client-side only**. The mock adapter keeps its state in
`sessionStorage`, which the server cannot read, so a server prefetch would
dehydrate fixture data the browser disagrees with. Revisit when
`lib/api/real/` is real — `specs/003` §3.3.
**States:** skeleton stat tiles + 3 skeleton rows; `EmptyState` with a
"Create your first communication" action when there are zero projects; inline
error card with Retry.

---

## Projects — `app/(app)/(shell)/projects/page.tsx`

**Purpose:** find one project among all of them. The dashboard shows only the
most recent handful; this is the real list, and it is what the sidebar's
"Projects" destination points at.

```
┌──────────────────────────────────────────────────────────────┐
│ Projects                                    [ + Create New ] │
│ Every communication package, and where each one has got to.  │
├──────────────────────────────────────────────────────────────┤
│ Search [                              ]   Status [ All   ▾ ] │
├──────────────────────────────────────────────────────────────┤
│ Project                   Status            Last updated     │
│ Client Onboarding Pack    Draft             31 Aug 2026  →   │
│ Risk Exposure Briefing    Analysing         30 Aug 2026  →   │
│ Q3 Portfolio Review       Ready for review  29 Aug 2026  →   │
└──────────────────────────────────────────────────────────────┘
```

**Allowed controls:** a status filter, a free-text search over project names,
`+ Create New`, and row-level open/review links. Nothing else. No sorting, no
saved views, no bulk selection, no column configuration in v1 — a list screen
accretes all four, and each one is a step toward a settings form.

- **A real `<table>`**, not the dashboard's list of rows. This screen exists to
  scan and compare, where column headers give screen-reader users row and column
  context. The dashboard's three-to-five rows are a summary; a list element is
  honest there and not here.
- **The status filter lives in the URL** — `/projects?status=ready_for_review`
  is shareable, bookmarkable, and restored by Back after opening a project.
  Written with `router.replace`, not `push`, so trying three filters does not
  cost three Back presses.
- **The search query deliberately does NOT go in the URL.** Project names
  describe client work, so a `?q=` parameter would put client identifiers into
  browser history and into any pasted link. That is rule 11's purpose even
  though `Project.name` is not formally a `Recipient` field, and it is the one
  place on this screen where following the rule costs something real: a searched
  view cannot be shared. See `specs/004-projects-list.md` §4.
- The search is debounced before it reaches the query, and rows persist while a
  changed filter loads rather than blanking to skeletons.
- **No pagination in v1.** Choosing offset versus cursor against a seven-row
  mock would encode a guess about a backend nobody has built into `ApiClient`.
  It belongs to the spec that makes `lib/api/real/` real.
- **There is no `/projects/new` route.** `+ Create New` is a mutation followed
  by a redirect, not a page: a URL whose render performs a side effect
  misbehaves on refresh, on Back and from a bookmark.

**Entry:** the sidebar, or a shared filter link. **Exit:** `/projects/{id}`.
**Data:** `useQuery(qk.projects(status, query))`, client-side only, for the same
reason as the dashboard.
**States:** five skeleton rows; two distinct empties — "No projects yet" with a
create action when nothing is filtered, and "No projects match these filters"
with a way back when something is; inline error card with Retry.

**Recipient data never appears here.** The table shows name, status and last
updated. Not the recipient's name, company or email — a table with room for one
more column is exactly where a "Client" column gets added.

---

## Campaigns — `app/(app)/(shell)/campaigns/page.tsx`

**Purpose:** answer "what have we actually sent, and to whom?". This is the
record of finished work, distinct from `/projects`, which is the record of work
in flight. It is where the Send success state's **View in Campaigns** lands, and
it closes the dead sidebar link `specs/001-route-map.md` §1 was written about.

A campaign here is **one sent `CommunicationPackage`** — one report, one person,
one package. There is no `Campaign` type and no batch send. The name is
inherited from the original sidebar sketch and promises a one-to-many product we
do not build; `specs/005-campaigns.md` §3.1 keeps it deliberately and says what
that costs.

```
┌──────────────────────────────────────────────────────────────┐
│ Campaigns                                                    │
│ Every package that has been approved and sent, and who it    │
│ went to.                                                     │
├──────────────────────────────────────────────────────────────┤
│ Subject                        Recipient        Sent         │
│ Your benefits renewal…         Priya R.         22 Aug 2026  │
│                                Northgate                  →  │
│ What changed in the fund…      Daniel O.        28 Aug 2026  │
│                                Orrin Wealth               →  │
│ Your custody migration…        Marguerite D.    26 Aug 2026  │
│ Send failed                    Pemberton                  →  │
└──────────────────────────────────────────────────────────────┘
```

**Allowed controls: none.** No search, no date range, no status filter, no
sorting, no pagination. The asymmetry with `/projects`, which ships three
controls, is deliberate: a status filter over a two-value set is a toggle
pretending to be a filter, and a search box here would be a search box over
client names — the one control rule 11 would have to be argued about rather than
obeyed. See `specs/005` §3.9.

- **A real `<table>`**, for the same reason `/projects` uses one: this screen is
  scanned and compared, and column headers give screen-reader users row and
  column context. It does **not** share a row component with the projects table.
- **Terminal states only.** A row appears when its package reaches `sent` or
  `failed`. `assembling`, `ready`, `approved` and `sending` are mid-workflow and
  belong to the project; a history that shows work in progress is a second
  projects list.
- **A failed row links to `/projects/{projectId}/review`**, not to the campaign
  detail. Rule 5 wants the failure recoverable in place and rule 2 puts the only
  Retry that may re-send on Review, so the row leaves this screen entirely.
- **No metrics.** Opens, clicks and engagement belong to `/analytics`. Adding
  them here makes the two screens the same screen with different defaults, and
  it would require a third-party beacon on the one page holding a list of client
  identities. No page under `/campaigns` may make an external request.

**Recipient data appears here, and this is the only list in the app where it
does.** The row shows `Recipient.name` and `Recipient.company` — a sent-mail
history whose rows do not say who the mail went to is not a history of anything.
It does **not** show `Recipient.email`: a list is the artefact that gets
exported, screenshotted and pasted, and a column of client addresses is a
mailing list one selection away from leaving the UI. Row `href`s are opaque ids,
and the link's accessible name uses the subject rather than the recipient so a
screen reader does not read client identity aloud on every row.

**Entry:** the sidebar, or **View in Campaigns** from the Send success state.
**Exit:** `/campaigns/{packageId}`, or a failed row's Review step.
**Data:** `useQuery(qk.packages())` → `api.listPackages()`, client-side only,
for the same reason as the dashboard and the projects list.
**States:** five skeleton rows; one empty — "Nothing sent yet", with no create
action, because the way to arrive here is to finish a workflow; inline error
card with Retry.

---

## Campaign — `app/(app)/(shell)/campaigns/[id]/page.tsx`

**Purpose:** the record of one sent package — what went out, to whom, and who
approved it. Read-only.

Keyed by `CommunicationPackage.id`, **not** by project id. The package is the
thing that was sent; a project that one day produces a second package would
silently break a project-keyed URL (`specs/005` §3.2).

```
┌──────────────────────────────────────────────────────────┐
│ Your benefits renewal, in three minutes                  │
│ Sent · 22 Aug 2026, 16:20                                │
├──────────────────────────────────────────────────────────┤
│ SENT TO                                                  │
│  Priya Raghunathan      p.raghunathan@northgate.example  │
│  Head of Reward         Northgate                        │
├──────────────────────────────────────────────────────────┤
│ WHAT WAS SENT                                            │
│  [ video · 2m 48s · Landscape · Captions on ]            │
│  Email preview · 📎 benefits-renewal.pdf                 │
├──────────────────────────────────────────────────────────┤
│ APPROVAL                                                 │
│  Alex Warrender         22 Aug 2026                      │
└──────────────────────────────────────────────────────────┘
```

**Allowed controls:** Back to campaigns, and — on a failed package only — Open
in Review.

- **There is no Resend, and the absence is the decision.** Rule 2 says
  `sendPackage` is reachable only from Review; one send button outside Review
  makes that sentence false, and "resend" is a control whose own name argues the
  review already happened. `eslint.config.mjs` enforces this with a
  `no-restricted-syntax` rule over the campaigns routes and components, because
  a missing button is invisible and reads as an oversight rather than a rule.
- **Duplicate for another recipient** is the intended follow-on and is not built
  yet: it needs a `duplicateProject` seam method and somewhere to land. It
  arrives with the workflow spec rather than shipping as a dead control.
- **The full recipient record is shown, email address included.** This page's
  job is to let a human verify what actually left the building, and an email
  history that will not show the address it used is not evidence of anything.
- **The video is a placeholder frame plus metadata**, never an `<img>` pointed at
  `posterUrl`. No external requests from this route.
- **The approval trail is the point of the page.** `approvedBy` and `approvedAt`
  are what turn "nothing sends itself" from a claim into a record.
- **A static `<title>`, never the recipient's name.** A title is the browser
  history label, the tab text, the OS window title and the default bookmark
  name, so a client name there reaches more surfaces than the page it describes.

**Entry:** a campaigns row, or the Send success state.
**Exit:** back to `/campaigns`, or into Review for a failed send.
**Data:** `useQuery(qk.package(packageId))` → `api.getPackage(id)`, client-side.
**States:** skeleton; **two** distinct failures — "That campaign no longer
exists" with a way back for an unknown id, and an inline error with Retry for
everything else. `notFound()` is not available: Next documents it for Server
Components, Server Functions and Route Handlers only, and this lookup is
client-side because the mock store lives in the browser.

---

## Analytics — `app/(app)/(shell)/analytics/page.tsx`

**Purpose:** answer "what did we make, how much of it went out, and where does
the work get stuck?". It reports on **production, not performance** — the
product's record of its own work, never anything observed about a recipient.

```
┌──────────────────────────────────────────────────────────────┐
│ Analytics                                                    │
│ What you have made, how much of it went out, and where the   │
│ work is sitting.                     Period [ Last 30 days ▾]│
├──────────────────────────────────────────────────────────────┤
│ Packages sent                                                │
│  12                                                          │
│  1 did not reach their recipient.                            │
├───────────────┬───────────────┬──────────────┬───────────────┤
│ Success rate  │ Median time   │ Videos       │ Emails sent   │
│ 92%           │ 26h           │ 186          │ 142           │
├───────────────┴───────────────┴──────────────┴───────────────┤
│ Packages sent over time                                      │
│      ╭─╮      ╭──╮                                           │
│  ╭───╯ ╰──────╯  ╰───╮                                       │
│  › Show the numbers                                          │
├──────────────────────────────────────────────────────────────┤
│ Where work is sitting                                        │
│  Draft            ████░░░░░░░░░░░░░  1                       │
│  Ready for review ████░░░░░░░░░░░░░  1                       │
│  Sent             ████████████████  12                       │
└──────────────────────────────────────────────────────────────┘
```

**Allowed controls: one.** A period selector — 7 days, 30 days, 90 days, all
time. No metric picker, no comparison mode, no segment selector, no goal
setting, no export. A reporting screen is the most accretive surface in any
product and every one of those is a preference wearing a chart's clothing; rule
1 sends preferences to Settings. See `specs/006-analytics.md` §3.11.

### There is no open rate, and there is no click-through rate

This is the screen's defining decision, and the first reason is measurement
rather than privacy.

Open tracking infers a read from a request for a remote image. Apple's Mail
Privacy Protection "downloads remote content in the background by default —
regardless of whether you engage with the email", which means an open rate
computed from pixel loads reports something other than what its label claims for
a large share of recipients. This product sends one package to one named person,
so there is no aggregate for that noise to average out against — "estimated
opens: 1" is either true or it is Apple's proxy, and nothing on the screen can
say which.

The second reason is that measuring it means instrumenting the recipient: a
pixel in a named client's inbox, or their CTA rewritten through a redirector.
That is a decision for `/settings/analytics`, not for a reporting screen.

**The boundary with `/settings/analytics`.** That screen decides *whether
anything is observed about a recipient, and what* — it is the consent gate.
This screen reports what the product already knows about its own work. Today
they do not intersect, because v1 observes nothing. When tracking is specified,
the rule becomes hard: **`/analytics` may only display metrics whose collection
`/settings/analytics` has switched on.**

### Aggregates only, permanently

The screen renders counts, rates and distributions. It never renders a row, a
list or a leaderboard keyed to a person. A per-recipient breakdown here is a
rule 11 violation regardless of what is being counted and regardless of whether
tracking is ever switched on — behavioural data about a named client is a
profile, and building one inside a workspace tool is the thing the rule exists
to prevent.

This is why the seam returns counts rather than records. Deriving these figures
in the browser would mean holding every `CommunicationPackage`, each carrying a
full `Recipient`, in the memory of the one screen forbidden to display them.

### Charts

- **Hand-written inline SVG, no charting library.** Rule 6 is the reason: every
  chart library is configured with literal colour values, so giving one this
  project's OKLCH tokens means either passing `var(--…)` strings it was not built
  to receive or resolving computed styles to hex — which breaks on the theme
  switch. An inline `<path>` takes `fill-foreground` and `stroke-border` like
  any other element.
- **Every chart is single-series**, so none needs a legend or a categorical
  hue — which is how this screen ships while the design system has no
  categorical palette. "Where work is sitting" is a sequential job: length
  carries the magnitude and the status is named in a label beside its bar.
- **Colour carries meaning in exactly one place** — the `sent` and `failed`
  bars, where each bar is a job outcome, which is the only thing
  `docs/design-system.md` reserves the semantic colours for. The success-rate
  tile is deliberately NOT tinted: a rate is an aggregate of outcomes, not an
  outcome, and colouring a ratio is the "this thing is good" reading the design
  system forbids. What flags a problem is the sentence under the hero figure,
  which names the failure count instead of implying a verdict. `--accent`
  appears nowhere on this screen: nothing here is an AI action.
- **Every chart ships its numbers as a table**, in a `<details>` disclosure
  rather than an `sr-only` block. W3C WAI asks for a text alternative for
  complex images and makes a point of saying it should be available to everyone;
  it is also the honest fallback on a narrow viewport, where a twelve-point
  chart degrades and a table does not.
- **Hover is an enhancement, not the mechanism.** Invisible per-bucket hit
  targets drive a tooltip for mouse users; the table remains the keyboard and
  screen-reader path, so the hover layer's absence breaks nothing.

### The one figure the period selector does not move

**Where work is sitting** counts across all projects, not through the date
range. "Where is work sitting" is a present-tense question, and filtering it
through a window would make the chart answer something nobody asked. It also
stays on screen in a period with no sends, which is when it is most useful.

**Entry:** the sidebar, or a shared `?range=` link.
**Exit:** nothing — this is a terminal screen.
**Data:** `useQuery(qk.analytics(range))` → `api.getAnalytics(range)`,
client-side only for the same reason as every other list, with
`keepPreviousData` so changing the period dims rather than blanks.
**States:** skeleton tiles; inline error card with Retry; and **two empties** —
"Nothing sent yet" when the product has never sent anything, and "Nothing was
sent in this period" with a way to widen the range when the period is the
reason. Note that `successRate` and `medianHoursToSend` are `null`, never `0`,
when a period holds no sends: a `0%` success rate rendered from an absence reads
as a catastrophe.

**No external requests.** Nothing under `/analytics` loads a script, beacon,
font or image from another origin. This is the screen most likely to acquire a
"just to see how the reporting page is used" snippet, and it sits inside a
workspace holding client reports.

---

# The workflow

Route base: `app/(app)/(focus)/projects/[id]/` — six routes, seven steps. Every
step renders inside `StepShell` with `WorkflowStepper` above it, both supplied
by `WorkflowChrome`. Each `page.tsx` is a thin Server Component that renders the
matching component from `components/workflow/steps/`.

```
● Report ─── ● Recipient ─── ● Analysis ─── ○ Video ─── ○ Email ─── ○ Review ─── ○ Send
```

The draft lives in the `workflow-store` Zustand slice, keyed by project id and
persisted so a refresh does not lose work. Committed data is refetched through
TanStack Query. A step is "completed" when its exit condition is met; the
stepper derives completion from the store, never from route history.

---

## Step 1 — Report · `report/`

**Purpose:** get the source document in and parsed.

```
┌──────────────────────────────────────┐
│ Upload Report                        │
│ ┌──────────────────────────────────┐ │
│ │        Drop PDF here             │ │
│ │        or Browse Files           │ │
│ └──────────────────────────────────┘ │
│ Supported: PDF, DOCX · max 25 MB     │
│                       [ Continue → ] │
└──────────────────────────────────────┘
```

**Allowed controls:** the dropzone, Browse, and Remove on the uploaded file.
That is all.

- Validate type and size **client-side before** calling `uploadReport`. Show the
  rejection inline on the dropzone, never as a toast.
- After upload, a `JobProgressCard` runs the parse job (extracting text, page
  count, detected sections). Show the parsed filename, page count and a
  collapsed text excerpt so the user can confirm the right file landed.

**Entry:** always reachable. **Exit:** a report with `status === "parsed"`.
**Data:** `uploadReport` mutation → `['job', jobId]` polled → `['report', id]`.

## Step 2 — Recipient · `recipient/`

**Purpose:** capture the personalisation context. This is the input that makes
the whole product worth using.

```
┌────────────────────────────────────────────────┐
│ Recipient Information                          │
│ Name       [ Rahul Sharma                  ]   │
│ Role       [ Chief Executive Officer       ]   │
│ Company    [ ABC Technologies              ]   │
│ Industry   [ SaaS                       ▾ ]   │
│ Business Priorities                            │
│ [ Market expansion, Revenue growth         ]   │
│ Personalisation   ○ Low  ● Medium  ○ High     │
│                              [ Generate → ]    │
└────────────────────────────────────────────────┘
```

**Allowed controls:** the six fields above, plus "Load from saved recipient".
Segments, tags, CRM sync and bulk import live in Settings → Recipients.

- react-hook-form + zod. Name, role and company are required; industry and
  priorities are strongly recommended and the form says why.
- Business priorities is a multi-value tag input, not a free-text blob.
- Personalisation level is a three-stop segmented control with a one-line
  explanation of what changes at each level.
- **Never** put these values in the URL — this is client PII.

**Entry:** report parsed. **Exit:** form valid.
**Data:** Zustand draft slice; committed with the `analyzeReport` mutation.

## Step 3 — Analysis · `analysis/`

**Purpose:** show the user what the AI understood, *before* it generates
anything. This is the transparency screen and it is what earns trust in the
output — do not let it degrade into a loading gate.

```
┌─────────────────────────────────────────────────────────┐
│ AI Report Analysis                                      │
│ Executive Summary                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ The report identifies 3 major opportunities…        │ │
│ └─────────────────────────────────────────────────────┘ │
│ Key Insights                                            │
│   ✓ Market opportunity                                  │
│   ✓ Revenue growth                                      │
│   ✓ Competitive risk                                    │
│ Recommended Talking Points                              │
│   1. Market expansion                                   │
│   2. Cost optimisation                                  │
│   3. Competitive positioning                            │
│                        [ Continue to Video → ]          │
└─────────────────────────────────────────────────────────┘
```

**Allowed controls:** edit any field, reorder/remove talking points, toggle a
talking point in or out of the script, Regenerate.

- Every block is an `AIEditableField`. The summary is a textarea; insights and
  talking points are editable lists.
- While the analysis job runs, this screen is a `JobProgressCard` with staged
  labels ("Reading report" → "Extracting insights" → "Drafting talking points"),
  not a blank spinner.

**Entry:** recipient valid. **Exit:** analysis exists and at least one talking
point is selected.
**Data:** `['analysis', projectId]`; edits held in the draft slice until Next.

## Step 4 — Video · `video/`

**Purpose:** generate the personalised avatar video.

```
┌─────────────────────────────────────────────────────────────┐
│ Video Studio                                                │
├───────────────────────┬─────────────────────────────────────┤
│                       │  Avatar   [ Priya — Executive  ▾ ]  │
│   ┌───────────────┐   │  Voice    [ Priya Voice        ▾ ]  │
│   │               │   │  Style    [ Executive          ▾ ]  │
│   │   AI AVATAR   │   │  Format   ○ Landscape ○ Portrait    │
│   │       ▶       │   │  Captions [ ON ]                    │
│   │               │   │                                     │
│   └───────────────┘   │        [ Generate Video ]           │
└───────────────────────┴─────────────────────────────────────┘
```

**Allowed controls:** exactly five — Avatar, Voice, Style, Format, Captions.

Each dropdown lists **presets defined in Settings**; the panel does not create,
upload, clone or configure anything. Avatar creation, voice cloning,
avatar-voice mapping, video templates and branding all live under
`app/settings/`. Each dropdown carries a "Manage in Settings" link at the
bottom of its list. Branding is applied automatically from the active brand
preset and shown as a read-only line, not a picker.

- The **script** is shown above the settings panel in an `AIEditableField`
  (collapsed by default, expandable). The user must be able to fix the words the
  avatar will say without leaving this step.
- Generation is long-running: `JobProgressCard` with stages
  ("Synthesising voice" → "Rendering avatar" → "Compositing"), the generation
  pulse on the preview placeholder, and Cancel available while running.
- On success the preview becomes a real player with a duration readout and a
  Regenerate action.

**Entry:** analysis complete. **Exit:** a video job with `status === "succeeded"`.
**Data:** `['presets', 'avatar' | 'voice' | 'style']`, `generateVideo` mutation,
`['job', videoJobId]` polled.

## Step 5 — Email · `email/`

**Purpose:** compose the message that carries the video, the CTA and the report.

```
┌──────────────────────────────┬──────────────────────────────┐
│ EDITOR                       │ LIVE PREVIEW                 │
│ Subject                      │ ┌──────────────────────────┐ │
│ [ Your personalised report ] │ │ To: Rahul Sharma         │ │
│ Greeting                     │ │ Hi Rahul,                │ │
│ [ Hi Rahul, ]                │ │ Based on your business…  │ │
│ Body                         │ │        🎥 Video          │ │
│ ┌──────────────────────────┐ │ │   [ Watch Video ]        │ │
│ │ Based on your report…    │ │ │   [ Book a Meeting ]     │ │
│ └──────────────────────────┘ │ │   📎 Report.pdf          │ │
│ CTA   [ Book a Meeting   ▾ ] │ │ Regards, Your Name       │ │
│ Signature [ Your Name    ▾ ] │ └──────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────┘
```

**Allowed controls:** Subject, Greeting, Body, CTA (preset picker), Signature
(preset picker), Regenerate.

- Subject, greeting and body are `AIEditableField`s.
- CTA and Signature choose from presets managed in Settings → Email. The CTA
  target URL is set with the preset, not typed here.
- The preview is a `PreviewPane` and updates live, debounced ~300ms. It renders
  the video as a poster-frame thumbnail with a play badge — that is what the
  recipient will actually receive in an inbox, and it should look like it.
- The report attachment appears in the preview automatically; it cannot be
  removed here (the package definition requires it).

**Entry:** video succeeded. **Exit:** subject and body non-empty, CTA selected.
**Data:** `['email', projectId]` seeded by `generateEmail`; edits in the draft
slice.

## Step 6 — Review · `review/`

**Purpose:** the mandatory human gate. Nothing has been sent, and this is the
only screen from which sending is possible.

```
┌──────────────────────────────────────────────────────────┐
│ FINAL REVIEW                                             │
│  ✓ Report analysed    ✓ Video generated                  │
│  ✓ Email generated    ✓ CTA added    ✓ Attachment added  │
├──────────────────────────────────────────────────────────┤
│ To: Rahul Sharma                                         │
│ Subject: Key Insights from Your Report                   │
│ ┌────────────────────────────────────────────────────┐   │
│ │  Email · 🎥 Video · [ Book a Meeting ] · 📎 Report  │   │
│ └────────────────────────────────────────────────────┘   │
│        [ ← Edit ]              [ Approve & Send → ]      │
└──────────────────────────────────────────────────────────┘
```

**Allowed controls:** the readiness checklist (each row deep-links back to its
step), the full package preview, Edit, and Approve & Send.

- Every checklist row is a link to the step that produced it. An unmet row is a
  warning with the fix one click away, and **Approve & Send stays disabled**
  until all five are met.
- Approve & Send opens a single confirmation dialog naming the recipient and
  their email address. This is the last irreversible moment — spell out exactly
  what is about to happen and to whom.
- No auto-send. No send from a keyboard shortcut. No send on mount.

**Entry:** email complete. **Exit:** user approves.
**Data:** `qk.packageForProject(projectId)`, `sendPackage` mutation. NOT
`qk.package(id)` — that key is the package's own id and belongs to
`/campaigns/[id]`. The two were a single `['package', id]` entry meaning both
things at once until `specs/005-campaigns.md` §3.2 split them.

## Step 7 — Send · `review/` success state

Not a separate route — the confirmed state of Review.

Shows a success panel with what was sent, when, and to whom, plus three next
actions: **View in Campaigns** — `/campaigns/{package.id}`, the detail page
rather than the list, because the user has just sent this package and making
them find it again is a strange reward — **Duplicate for another recipient** (the
highest value follow-on — same report, new recipient context), and **Back to
Dashboard**.
While sending, the button shows a determinate progress state; a failure keeps
the user on Review with the error inline and the package intact.

---

## Settings — `app/(app)/(shell)/settings/*`

Where the full ~39-item configuration surface lives. A left sub-nav with a
detail pane on the right; every section is its own route. `/settings` itself is
a **temporary** redirect to `/settings/avatar`, declared in `next.config.ts`
rather than in a `page.tsx` that calls `redirect()` — so it never reaches React,
and so it is not a file anyone can later add a side effect to. `permanent: false`
deliberately: which section Settings opens on is a product guess, and a 308
would burn that guess into every user's browser (`specs/008` §3.2).

```
Settings
├── Avatar      · avatars, custom avatar upload
├── Voice       · voices, voice cloning (the one upload that confirms)
├── Video       · templates, formats, branding
├── AI          · script styles, and what is deliberately not configurable
├── Email       · CTAs, signatures
├── Recipients  · saved recipients, segments
├── Analytics   · the consent gate
├── Security    · retention and data handling
└── Usage       · quota and spend — read-only
```

**Eight of the nine are the same screen.** `PresetList` renders a section
header, a create action and a list of `PresetRow`s, with a section-specific
panel slotted in as children. That repetition is the evidence for `specs/008`
§3.1's claim that rule 1's overflow has somewhere to go that stays navigable at
thirty-nine items — and it is why a tenth section is cheap when one is genuinely
needed.

**Allowed controls, everywhere in this tree:** create, edit, **archive**,
restore, set-as-default, and each section's own upload or document fields.
**Never delete**, and never send. `eslint.config.mjs` enforces both with a
`no-restricted-syntax` block over the settings routes and components, because
`specs/008` §4 asks that it hold by construction rather than by nobody having
tried it.

**The mirror of rule 1 governs what may be added here.** A settings screen may
not contain a control that belongs to a single project. If a control's value
would differ between two projects, it is a workflow control. Without that
clause, "config belongs in Settings" degrades into "anything awkward belongs in
Settings", and a per-project override arrives here wearing a preset's clothes
(`specs/008` §3.9).

### The seven preset sections

`avatar`, `voice`, `video`, `ai`, `email`, `recipients` — plus the branding and
segment kinds carried inside Video and Recipients.

- **Avatar** — `avatar` presets plus an `UploadPanel` for a custom portrait
  (PNG/JPEG/WebP, 8MB cap). The first section built, and the one the other eight
  were measured against.
- **Voice** — `voice` presets plus the clone upload (WAV/MP3/M4A, 25MB cap).
  **This is the only upload in the product that asks before it happens**, and
  the asymmetry is the decision. A custom avatar is a picture of someone who
  chose to be in a video; a cloned voice can be made to say anything, and it is
  the one upload where the person supplying the sample and the person clicking
  may not be the same. The dialog asks for **the name of the person in the
  recording** — that is the point rather than a form field, because someone who
  cannot say whose voice it is should not be cloning it. It is a different job
  from the send confirmation: that one guards an irreversible outward action,
  this one guards a claim about consent (`specs/008` §3.10, `CLAUDE.md` rule 13).
- **Video** — `videoTemplate` and `branding` presets. Format and captions are
  the two the Video step exposes per project; everything else is template config.
- **AI** — `scriptStyle` presets, plus a Guardrails panel that **answers rather
  than implements**. Every generated string is editable before use and nothing
  sends without human approval; those are structural, so there is no switch to
  turn them off, and the panel says that is the answer rather than an omission.
  **Personalisation level is deliberately absent** — it varies per recipient, so
  rule 1's mirror puts it in the Recipient step. This was the first screen built
  after that clause was added, and the first place it would have been broken.
- **Email** — `cta` and `signature` presets. A CTA's target URL is set here,
  never typed in the workflow.
- **Recipients** — the saved-recipient store behind the Recipient step's "Load
  from saved recipient". **`deleteRecipient` is a real delete — the one place
  `specs/008` does not archive.** A saved recipient is a person, and "we kept
  it, just hidden" is the wrong answer to "remove this person". History survives
  because a sent package holds its own copy rather than a reference (§3.4).

### `/settings/analytics` — the consent gate

Not a preset list. Three toggles on one `WorkspaceSettings.tracking` document:
opens, clicks, and whether the recipient is told anything is measured.

**Every toggle defaults to off**, and that is a product decision rather than a
placeholder (`specs/008` §3.7). A product whose proposition is that a human
approves every send does not open with recipient tracking already enabled and a
checkbox to find.

**The boundary with `/analytics` is hard**: this screen decides whether anything
is observed about a recipient and what; that screen reports what the product
already knows about its own work. `/analytics` may only display metrics whose
collection this screen has switched on (`specs/006` §3.3). The open-tracking
toggle carries the Mail Privacy Protection caveat **beside it** — a switch that
promises a number the product cannot compute is worse than no switch.

### `/settings/security` — retention

The other half of the same document: `retention.reportDays`,
`retention.packageDays` (days; `0` means keep), and whether deleting a project
also removes its recipient record.

Patches merge one level deep on the adapter's side, so this screen can change
`retention` without resending `tracking`. Two screens editing one document must
not be able to overwrite each other's half.

### `/settings/usage` — read-only, on purpose

Quota and spend for the current period. **There is no control here at all.** A
control that changed a quota would be a billing action, and this product has no
billing (`specs/008` §3.5). The section answers "what have I used", and the
answer is not editable. Money is held in minor units, so nothing is a float.

**Data:** `qk.presets(kind, includeArchived)` per preset section — Settings is
the **one** caller that passes `includeArchived: true`, which is what keeps
archived presets out of every workflow dropdown without `VideoStep` knowing
archiving exists (`specs/008` §3.4). Mutations invalidate both variants so the
workflow picks up changes immediately. `qk.settings()` for Analytics and
Security, `qk.usage()` for Usage, `qk.recipients()` for Recipients.

### What the PRD asks of this tree and has not got

The PRD's eight setup areas do not map cleanly onto nine routes.
**Report-reading configuration has no home at all** — `analyzeReport` takes no
options — and it is the strongest current argument for a tenth section. Sender
profiles, campaign templates, avatar-to-voice matching, languages, name
pronunciation, sending method and per-role permissions are all named in the PRD
and none is built. `docs/prd-alignment.md` §4 is the full mapping, area by area.
