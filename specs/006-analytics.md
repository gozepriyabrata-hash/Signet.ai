---
Spec:        006
Title:       Analytics — the reporting surface
Status:      accepted
Created:     2026-09-02
Supersedes:  —
---

# 006 · Analytics — the reporting surface

Defines `/analytics`: what a product that sends one video and one email to one
person can honestly report on, why v1 contains no open rate and no click-through
rate, and how a screen made of charts gets built in a design system that has no
categorical palette.

This is the last unbuilt core route from spec [001](001-route-map.md), and it is
the only one that arrived with no idea of what it would contain. Spec 001 gave it
a single line — "Reporting surface. Distinct from `/settings/analytics`, which is
tracking *preferences*" — and `docs/screens.md` has never had a section for it.
As with specs [004](004-projects-list.md) and [005](005-campaigns.md), this file
therefore invents the screen as well as deciding how it is built.

## 1. Problem

**The product cannot measure the thing an "analytics" screen is expected to
show.** There is no open, click, view, reply or engagement data anywhere in this
codebase: not in `types/domain.ts`, not in `ApiClient`, not in the mock adapter,
not in any fixture. What exists is `DashboardStats` — three counters — and
whatever can be derived from `Project` and `CommunicationPackage`.

Around that sit four more open questions.

1. **Spec 005 wrote a cheque this spec has to honour or refuse.** Its §3.10 kept
   metrics off `/campaigns` on the grounds that "opens, clicks and engagement
   belong to `/analytics`". That sentence assumed a home existed. Nothing has
   ever decided whether those numbers belong anywhere in this product.
2. **Measuring them means instrumenting the recipient.** An open rate is a
   tracking pixel in a client's inbox; a click-through rate is the CTA URL
   rewritten through a redirector. Both are things done *to* a person the user
   named, and rule 11 governs recipient data. No spec has authorised either.
3. **The design system has no categorical palette, and charts need one.**
   `--accent` means "AI is acting", the semantic colours are reserved for job
   outcomes, and the six pastels are marked artwork-only. There is no defined set
   of hues for "series 1, series 2, series 3", and rule 6 forbids inventing one
   inline.
4. **The boundary with `/settings/analytics` is a one-line assertion.** Spec 001
   distinguished them in nine words and no document has separated them since.

## 2. Constraints

### 2.1 From `CLAUDE.md`

Rule 11 is binding and is the reason §3.2 and §3.4 exist:

> **Recipient data is client PII.** Never log it, never place it in a URL query
> string, never send it to a third party the user did not configure.

Rule 6 is binding and decides the charting question in §3.7:

> **Tailwind v4 only.** Tokens live in `app/globals.css` under `@theme`. Do
> **not** create `tailwind.config.js`. Never hardcode a hex or an arbitrary
> value like `bg-[#242424]` — use a semantic token.

Rule 1 applies by analogy, as it has on every non-workflow screen: a reporting
surface is under constant pressure to grow controls until it is a settings form
with charts on top.

Rules 3, 8, 9 and 10 apply in full. **Rule 5 does not apply at all** and it is
worth saying so: nothing on this screen is a generated artefact, so there is no
job, no progress and no Retry-inside-a-card. The only asynchrony is a read.

### 2.2 The measurement constraint — an open rate is not a real number

This is the constraint that decides the whole screen, and it is technical before
it is ethical.

Open tracking works by embedding a remote image and inferring a read from the
request for it. Apple's Mail Privacy Protection removes that inference. In
Apple's own words:

> Mail Privacy Protection downloads remote content in the background by default —
> regardless of whether you engage with the email.
> — [Apple, *Mail Privacy Protection & Privacy*](https://www.apple.com/legal/privacy/data/en/mail-privacy-protection/)

and, on the same page, the consequence for the sender: they can no longer learn

> when and how many times you opened their email

Apple's user-facing documentation describes the same mechanism as hiding the IP
address and downloading remote content privately in the background "when you
receive a message (instead of when you view it)"
([Use Mail Privacy Protection on Mac](https://support.apple.com/guide/mail/mlhl03be2866/mac)).

The share of mail this affects is large. Litmus, whose figures come from over a
billion tracked opens, puts Apple's share of email opens around 64% in 2026
([Litmus, *Email Client Market Share*](https://www.litmus.com/email-client-market-share)).
**That number must be read with care and §7 says so**: it is a share of *opens*,
and MPP's preloading inflates precisely the bucket being cited, so it cannot be
used as a clean measure of how many humans are affected. It is enough to
establish that the affected population is a large minority at least, which is all
this spec needs.

The practical result, which the vendor documentation says out loud, is that a
campaign's open rate can roughly double without any change in reader behaviour
([Postmark, *How Apple's Mail Privacy Changes Affect Email Open Tracking*](https://postmarkapp.com/blog/how-apples-mail-privacy-changes-affect-email-open-tracking)).

### 2.3 From Next.js 16 — a date range in the URL costs a Suspense boundary

Inherited from spec 004 §2.2 rather than rediscovered, and still true in the
documentation shipped inside `next@16.3.4`:

> If a route is prerendered, calling `useSearchParams` will cause the Client
> Component tree up to the closest `Suspense` boundary to be client-side
> rendered.

with the failure mode that makes it worth repeating:

> In development, routes are rendered on-demand, so `useSearchParams` doesn't
> suspend and things may appear to work without `Suspense`.
> During production builds, a static page that calls `useSearchParams` from a
> Client Component must be wrapped in a `Suspense` boundary, otherwise the build
> fails with the Missing Suspense boundary with useSearchParams error.
> — [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)

### 2.4 From this codebase

The mock adapter's store lives in `sessionStorage` and the server cannot read it
(spec [003](003-dashboard.md) §3.3), so nothing here is prefetched on the server.
Inherited, not re-argued.

`package.json` contains no charting dependency — and, as specs/007 later
established while auditing the same file, **no motion dependency either**.
Framer Motion is named in `CLAUDE.md`'s stack table but has never been
installed; spec [002](002-landing-page.md) §3.6 records that as "a deliberate
non-use, not an oversight". So the tree has no visual library at all, which
makes spec 002 §5's rejection of adding one for a single screen's benefit
stronger here rather than weaker.

The data actually available is: `Project` (`status`, `createdAt`, `updatedAt`),
`CommunicationPackage` (`status`, `approvedAt`, `approvedBy`, `sentAt`), and the
three `DashboardStats` counters. Nothing else exists to report on.

### 2.5 From `docs/design-system.md`

Three colour rules constrain every mark on this screen:

> **`--accent` (blue) means "AI is doing something, or is about to."** … Never on
> navigation, tabs, links or decoration.

> Semantic colours are reserved for job outcomes. A green tick means a job
> succeeded — not "this thing is good".

and, of the six pastels:

> These live **inside illustration and rendered product chrome only** — never on
> a button, never on type, never as a surface.

The type scale already anticipates this screen: **metric numerals** are specified
at 48px, weight 300, `tabular-nums`. So is its empty state — `EmptyState` is
documented as serving "the zero-project dashboard, no recipients, and **no
analytics data**". The design system expected `/analytics` before any spec did.

### 2.6 From the house data-visualisation method

The method this project uses for charts supplies four rules that shape §3.8:

- **Form before colour**, and sometimes the honest form is not a chart: a single
  current value is a stat tile, and the number a screen leads with is a hero
  figure — never a one-bar bar chart.
- **One axis.** Never a dual-axis chart; two measures of different scale become
  two charts or an indexed pair.
- **Status colours are reserved** and are never reused as "series 4".
- **A single series needs no legend** and no categorical hues — the title names
  it.

It also requires that any categorical palette be run through a colourblindness
and contrast validator before shipping, rather than eyeballed. That requirement
is why §3.8 is shaped to avoid needing one.

### 2.7 From WAI, on charts

> The long description provides detailed information, including scales, values,
> relationships and trends that are represented visually.
> — [W3C WAI, *Complex Images*](https://www.w3.org/WAI/tutorials/images/complex/)

WAI's guidance is to pair the image with a text alternative — a data table for
structured data — and to make that description available to everyone rather than
only to assistive technology.

## 3. Decision

### 3.1 `/analytics` reports on production, not performance

The screen answers **"what did we make, how much of it went out, and where does
the work get stuck?"** It does not answer "how did it land?".

Every number on it is derived from data the product already owns about its own
work, and none of it is derived from anything observed about a recipient:

| Figure | Form | Source |
|---|---|---|
| Packages sent in the period | hero figure | `CommunicationPackage.sentAt` |
| Videos generated · Emails sent | stat tiles | `DashboardStats` |
| Send success rate, with the failure count | stat tile | package `status` |
| Packages sent over time | single-series area | `sentAt`, bucketed |
| Median time from project created to sent | stat tile | `createdAt` → `sentAt` |
| Where work is sitting | horizontal bars, one hue | `Project.status` |

The last row is the one a user will actually act on. "Eleven projects have been
sitting in Ready for review for over a week" is a finding that changes a
Wednesday. An open rate is not.

### 3.2 No engagement metrics in v1, and the first reason is measurement

There is no open rate, click-through rate, view count or engagement score.

Two independent reasons, and the order matters because the second one alone
would sound squeamish:

**It cannot be measured honestly.** §2.2 is the argument. An open rate computed
from pixel loads, in a world where a majority-share mail client fetches every
pixel on receipt whether or not a human ever looks, is not a low-quality number —
it is a number that means something different from what the label claims. Putting
it on a screen next to real figures launders it. A product whose entire
proposition is "a human reviews everything before it goes" cannot lead its
reporting screen with a metric it knows to be wrong.

**And measuring it means instrumenting the recipient.** A tracking pixel is a
remote asset placed in a named client's inbox that reports back when their mail
client fetches it; click tracking rewrites the CTA the user wrote so it passes
through a redirector first. Both collect behavioural data about an identified
person. Rule 11 governs recipient data, and no spec has authorised collecting a
new class of it — which is a decision `/settings/analytics` has to make before
this screen can display the result.

This is a refusal for v1, not forever. §3.3 says exactly what has to happen
first.

### 3.3 The boundary with `/settings/analytics`, stated properly

Spec 001 separated the two routes in nine words. The full distinction:

**`/settings/analytics` decides whether anything is observed about a recipient,
and what.** It is a consent and configuration surface: tracking on or off, which
signals, retention, and what a client is told. It is the gate.

**`/analytics` reports what the product already knows about its own work.** It is
a read of the user's own production record.

Today the two do not intersect at all, because v1 observes nothing about
recipients — which is why this screen can ship before that one exists. When
tracking is specified, the relationship becomes a hard rule: **`/analytics` may
only display metrics whose collection `/settings/analytics` has switched on.** A
number derived from data the user did not enable must not appear here, greyed
out, sampled, or "for preview".

### 3.4 Aggregate only. There is no per-recipient row, and there never is one.

This screen renders counts, rates and distributions. It never renders a row, a
list or a leaderboard keyed to a person.

Spec 005 §3.4 established that a recipient's *name* may appear on a screen —
carefully, and with the email address held back to the detail page. Behavioural
data about a named person is a different and worse category. "Priya Raghunathan
— opened twice, clicked once" is a profile, and building one about a user's
client inside a workspace tool is not something rule 11's three prohibitions
happen to permit by omission; it is the thing the rule exists to prevent.

So the rule is structural rather than a matter of taste: if a per-recipient
breakdown ever appears under `/analytics`, that is a rule 11 violation regardless
of what is being counted, and regardless of whether §3.3's gate is switched on.
Aggregates over a cohort are the only shape this screen renders.

### 3.5 One seam method, and it aggregates on the far side of the seam

```ts
export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export interface AnalyticsSummary {
  range: AnalyticsRange;
  /** Inclusive ISO bounds, so the screen can label what it is showing. */
  from: string;
  to: string;

  packagesSent: number;
  videosGenerated: number;
  emailsSent: number;
  sendsFailed: number;

  /** null when nothing has been sent in the period — not zero, which would
   *  render as "0% success" and read as a catastrophe rather than as no data. */
  successRate: number | null;
  medianHoursToSend: number | null;

  /** One point per bucket, oldest first. The bucket size is the adapter's
   *  choice, named here so the axis can be labelled honestly. */
  sentOverTime: { bucketStart: string; count: number }[];
  bucket: "day" | "week";

  /** Every ProjectStatus, including the zeroes — a status missing from the
   *  chart and a status at zero are different facts. */
  projectsByStatus: { status: ProjectStatus; count: number }[];
}
```

```ts
getAnalytics(range: AnalyticsRange): Promise<AnalyticsSummary>;
```

Aggregation belongs on the adapter's side, not in the component, and the reason
is not only that counting is a backend's job. Deriving these figures in the
browser would mean calling `listProjects()` and `listPackages()` and holding
**every package, each carrying a full `Recipient`, in the memory of the one
screen that must never show a recipient**. The safest place for data a screen is
forbidden to display is not in that screen's props. Sending counts over the seam
instead of records is a rule 11 decision as much as an architectural one.

### 3.6 The date range lives in the URL

`/analytics?range=30d` is a real address. The reasoning is spec 004 §3.1's,
unchanged: a range is a *view* of the screen, someone who narrows to 7 days and
sends the link means to send that view, and Back after following a link out
should return to it. `AnalyticsRange` is a four-value enum that identifies
nobody, so rule 11 has no objection — the same test that let the projects list's
status filter into the URL while keeping its search box out.

Written with `router.replace`, not `push`, so trying three ranges does not cost
three Back presses. The client component that reads it sits inside a `<Suspense>`
boundary, and that boundary is load-bearing for the reason §2.3 quotes.

### 3.7 No charting library. Inline SVG.

Three reasons, in order of weight.

**Rule 6.** Every charting library ships its own colour and theming layer, and
the way each one is configured is with literal colour values. Wiring
`recharts`'s `fill` or Chart.js's `backgroundColor` to this project's OKLCH
custom properties means either passing `var(--…)` strings the library was not
designed to receive, or resolving computed styles in JavaScript and handing the
library hexes — which is rule 6 defeated at one remove, and it breaks on the
theme switch. Inline SVG takes `className` and Tailwind utilities like every
other element in the app, so `fill-success` and `stroke-border` just work, in
both themes, from the same tokens.

**Proportion.** §3.8 needs two shapes: an area under a line, and a row of
horizontal bars. That is arithmetic and a `<path>`. A charting dependency for one
screen's two shapes is the trade spec 002 §5 already refused when it declined an
animation library for the landing page.

**Control.** The house data-visualisation method has specific requirements —
thin marks, recessive axes, a table view, single-series with no legend — and
meeting them in a library means fighting its defaults. Meeting them in SVG means
writing them.

The cost is real and worth stating: axes, ticks, scales and hover targets are
ours to write and to get wrong, and a third chart shape is the point at which
this decision should be re-opened rather than extended.

### 3.8 Every chart is single-series, which is how this screen ships without a categorical palette

The form choice comes first, and it does most of the work. Of the seven figures
in §3.1, five are **not charts at all**: a hero figure and four stat tiles, both
of which the type scale already specifies. Only two are plotted, and neither
needs to tell series apart:

- **Packages sent over time** — one series, one area. A single series needs no
  legend and no categorical hue.
- **Where work is sitting** — one horizontal bar per `ProjectStatus`, all in one
  hue with length carrying the magnitude. This is a sequential job, not a
  categorical one: the reader compares lengths, and the status is named in a
  label beside each bar rather than encoded in a colour.

So the missing categorical palette (§1, problem 3) turns out not to block this
screen, and this spec does not invent one. That is deliberate on two counts: a
palette invented for one screen would harden into *the* palette, and the house
method requires any categorical set to be run through a colourblindness and
contrast validator rather than chosen by eye — work that belongs to whoever
genuinely needs a second series, with the screen that needs it in front of them.

Colour carries meaning in exactly one place: the **send success rate**, where
`--success` and `--danger` are legitimate because a send is a job outcome, which
is the precise licence `docs/design-system.md` grants. Everywhere else the marks
are drawn in neutral ink — `--foreground` for the series, `--border` for the
recessive grid and axes — and `--accent` appears nowhere on this screen, because
nothing here is an AI action.

### 3.9 Every chart ships its table

Each plotted figure is wrapped in a `<figure>` with a `<figcaption>` naming it,
and the same numbers are available as a real `<table>` beneath it, collapsed by
default and expandable by anyone. This is WAI's guidance from §2.7, and its
closing point — that the long description should be available to everyone, not
only to assistive technology — is the argument for a disclosure rather than an
`sr-only` block. "What was that third bar actually worth?" is a question sighted
users ask too.

The table is also the honest fallback for the thing an SVG cannot do: on a
narrow viewport a six-bar chart degrades, and a table does not.

### 3.10 No third-party analytics on the analytics page

Nothing under `/analytics` loads an external script, a beacon, a font or an
image. The joke writes itself and the rule is serious: this is the screen most
likely to acquire a "just to see how the reporting page is used" snippet, it sits
inside a workspace holding client reports, and spec 002 §5 already deferred
exactly this for the public landing page — where the argument was weaker, because
that page holds nothing.

### 3.11 No controls other than the range

One control. No metric picker, no comparison mode, no segment selector, no goal
setting, no export. Spec 005 §3.9 shipped `/campaigns` with none and `/projects`
with three; this screen gets exactly the one that changes what the numbers mean.

A reporting screen is the single most accretive surface in any product, and every
one of those controls is a preference. Rule 1 sends preferences to Settings, and
the corollary here is that a metric picker is not a chart feature — it is a
settings form that has learned to draw.

## 4. Where this meets the constitution

**Rule 11 shapes three decisions rather than being obeyed once.** §3.2 refuses a
whole class of metric partly because collecting it is unauthorised; §3.4 forbids
the per-recipient breakdown permanently, including after tracking is switched on;
and §3.5 puts aggregation behind the seam so the recipient records never enter
this screen's memory in the first place. The third is the one that would be
easiest to get wrong while believing the rule was satisfied — a component that
never *renders* a recipient but holds a thousand of them is one console
statement and one crash report away from leaking them.

**Rule 6 decides an architecture question, which is unusual for a styling rule.**
§3.7 rejects an entire dependency class because the only way to give a charting
library this project's colours is to hand it literal values. Worth recording as a
case where a rule that reads like a lint preference turned out to be structural.

**Rule 1 is respected in spirit and is under the most pressure it has faced.**
§3.11 ships one control. Every plausible second control — compare to previous
period, choose your metrics, save this view — is a preference wearing a chart's
clothing, and this is the screen where that disguise is most convincing.

**Rule 9 applies in full, and the empty state is not the zero state.** Loading is
skeletons shaped like the tiles and charts. Error is an inline card with a Retry.
Empty is "nothing sent yet" — and it is distinct from a *populated* period in
which `successRate` is legitimately `null` because no send occurred, which is why
§3.5 types those two fields as nullable rather than defaulting them to zero. A
`0%` success rate rendered from an absence reads as a catastrophe.

**Rule 5 does not apply, and saying so is the point.** Nothing here is generated,
so there is no `Job`, no progress bar and no stage label. A reader who arrives
from the workflow screens should not find a `JobProgressCard` on this one.

## 5. Rejected alternatives

**Build open and click tracking, and report it.** The expected feature, and the
one a stakeholder will ask for first. Rejected on §2.2 before any privacy
argument: the primary metric would be wrong in a way that is invisible on the
screen, because Apple's own documentation says remote content is fetched
"regardless of whether you engage with the email". Reconsider when the product
has a delivery pipeline of its own, `/settings/analytics` exists to gate it, and
someone has decided what a client is told — three preconditions, none of which is
met.

**Report opens anyway, labelled "estimated".** The pragmatic compromise the whole
email industry has settled on, and it is defensible for a bulk sender comparing
one campaign against another, where the inflation is at least consistent. It is
not defensible for this product: the unit here is one package to one named
person, so there is no aggregate for the noise to average out against. "Estimated
opens: 1" is either true or it is Apple's proxy, and nothing on the screen can
tell the user which.

**Track clicks only, since MPP does not affect them.** Technically the strongest
version of the rejected alternative — a click is a deliberate human action and
survives MPP. It still requires rewriting the user's CTA URL through a
redirector, which changes what the recipient sees in their status bar and creates
a log of an identified person's behaviour. That is exactly the decision §3.3
assigns to `/settings/analytics`, and taking it here — inside a spec about
drawing charts — would be deciding a privacy question in the wrong document.

**Derive the figures client-side from `listProjects()` and `listPackages()`.** No
seam change, and entirely workable against a seven-project mock. It puts every
`Recipient` in the browser memory of the one screen forbidden to display them
(§3.5), and it moves aggregation logic into a component where a real backend
would have to duplicate it. Spec 004 §3.6 rejected client-side filtering for the
second reason alone; the first makes it worse here.

**Add `recharts`, `visx`, `Chart.js` or `nivo`.** All are good, all are better
than hand-written SVG at the point a screen has six chart types, and all would
have this screen drawn faster. §3.7 is the argument: the colour layer is the
blocker, not the drawing. Worth re-opening when a third distinct chart shape is
needed — and the re-opening should evaluate whether the library can be driven
entirely from CSS custom properties, because that is the criterion that decides
it, not bundle size.

**Define a categorical palette now, so charts have series colours.** Tempting to
do while the subject is charts, and it would unblock any future multi-series
work. Rejected because §3.8 means nothing on this screen needs one, and a palette
defined without a chart that requires it is a guess that hardens: the next person
inherits six hues nobody validated and treats them as settled. The house method
requires the set to be run through a colourblindness and contrast validator, and
that pass should happen with the real chart in view.

**Use the six artwork pastels as the categorical palette.** They already exist as
tokens, they are visually part of the system, and they are the obvious raid.
`docs/design-system.md` scopes them to "illustration and rendered product chrome
only — never on a button, never on type, never as a surface", and a chart is none
of those things — it is data. Redefining what they mean, in a spec about a
reporting screen, would quietly convert the system's decorative reserve into its
data palette. They are also pastels: light, low-chroma, adjacent in hue, and
close to the worst starting point for a set that has to survive a
colourblindness check.

**Fold `/analytics` into the dashboard.** The dashboard already shows three
counters, and one screen is simpler than two. The two answer different questions
at different rhythms — the dashboard answers "what is happening right now, and
what do I do next", `/analytics` answers "how has this been going" over a chosen
period. Merging them means the dashboard grows a date range, which is the first
control on the way to it becoming this screen anyway.

**A dual-axis chart plotting sends against success rate.** The natural way to fit
both trends in one frame, and the single most common charting mistake there is:
two y-scales let the author decide which line looks higher, and the reader cannot
recover the truth. Two charts, or an indexed pair.

**Auto-refresh, live counters, or a polling interval.** A reporting screen that
updates itself feels alive. There is nothing here that changes second to second —
sends are human-approved and comparatively rare — so polling would spend requests
to redraw identical numbers, and a figure that moves while being read is harder
to trust, not easier.

**Export to CSV or PDF.** Genuinely useful, and the first thing a user who
believes these numbers will want. It is a feature with its own decisions — what
is in the file, whether it may contain recipient data (§3.4 says a per-recipient
export is the same violation as a per-recipient table), and how a browser-only
app produces it. It gets its own spec rather than a button added here.

## 6. Consequences

**Spec 005 §3.10's cheque is answered, and the answer is "not yet".** That spec
kept engagement metrics off `/campaigns` on the grounds that they belonged here.
They do belong here — when they exist. Until then §3.10 stands for a stronger
reason than it was written with: the metrics are not elsewhere, they are nowhere,
and no screen in this product should show them.

**`/settings/analytics` now has a job description before it has a route.** §3.3
defines it as the consent gate rather than as "tracking preferences", and binds
`/analytics` to it. Whoever specs that screen inherits a constraint from this
file, and should say whether they accept it.

**`ApiClient` grows a fourth time**, so `docs/data-model.md` needs its fourth
correction — spec 003 found `getStats()` missing, spec 004 changed
`listProjects`, spec 005 added the package methods, and this adds `getAnalytics`
plus the `AnalyticsRange` and `AnalyticsSummary` types.

**`docs/screens.md` gains an Analytics section**, the third screen in a row
created by a spec and described by no document. That is now unmistakably a
pattern, and it suggests `docs/screens.md` should be updated *before* the next
route is added rather than after.

**New in the tree.**

```
app/(app)/(shell)/analytics/page.tsx    ← Server Component, Suspense boundary
components/analytics/
  AnalyticsBrowser.tsx      ← "use client", owns the range in the URL
  RangePicker.tsx           ← the one control
  MetricTiles.tsx           ← hero figure + stat tiles
  SentOverTimeChart.tsx     ← single-series area, inline SVG, with its table
  StatusBreakdown.tsx       ← one-hue horizontal bars, with its table
  ChartFigure.tsx           ← <figure>/<figcaption> + the disclosure table
lib/api/types.ts            ← getAnalytics, AnalyticsRange, AnalyticsSummary
lib/api/mock/index.ts       ← aggregates over the existing project store
lib/query-keys.ts           ← qk.analytics(range)
hooks/use-analytics.ts
types/domain.ts             ← AnalyticsSummary
```

`components/analytics/**` joins the marketing-import boundary list in
`eslint.config.mjs`, as `components/campaigns/**` did.

**The mock's fixtures will need more sends than three.** `lib/api/mock/fixtures.ts`
currently carries two sent packages and one failed, all dated within eleven days.
A throughput chart over that is a straight line with three points, which
demonstrates nothing and makes the screen look broken. Either the fixtures gain a
spread of sends, or the chart's empty and sparse states have to be as designed as
its populated one. §7 flags this as the weakest part of the plan.

**Testing.** Five targets:

1. **No recipient field, from any source, reaches the DOM on this route** — the
   §3.4 regression, and the reason the seam returns counts.
2. The range writes `?range=` with `replace` and restores from a cold load.
3. All four states, plus the distinction between an empty period and a period
   with sends but no failures — `successRate: null` must not render as `0%`.
4. Every chart has an accessible name and a reachable table containing the same
   numbers.
5. No `<img>`, `<script>` or `fetch` on this route targets an external origin.

## 7. Unverified, and open

- **The Litmus market-share figure is partly circular** and §2.2 says so inline.
  It measures opens rather than accounts, and MPP inflates the Apple bucket it is
  being cited from. The decision does not rest on the exact number — Apple's own
  description of the mechanism is sufficient on its own — but the percentage
  should not be repeated as a clean measure of affected users.
- **"Production, not performance" is a product guess.** No user has asked for
  either version of this screen. §3.1's metric set is this spec's proposal, in
  the absence of any section in `docs/screens.md`, and should be reviewed as a
  proposal rather than implemented as a requirement. The specific claim worth
  testing on a real user is §3.1's last row: that "where work is sitting" is more
  actionable than an open rate.
- **Median time-to-send may be untestable against the current mock.** The
  fixtures use fixed ISO dates chosen for stable screenshots, so the median is
  whatever those literals imply. It will look plausible and prove nothing about
  the calculation. A real test needs constructed fixtures, not the seed.
- **The throughput chart has never been seen with sparse data**, which is the
  only kind this mock can produce (see §6). Three points over eleven days is the
  case to design for first, not the smooth curve it is tempting to draw against.
- **No categorical palette has been validated, and none is proposed.** The moment
  a second series appears anywhere in this product, someone must run the house
  validator against a candidate set rather than picking hues that look distinct
  on their monitor. This spec deliberately leaves that undone; it should not be
  read as evidence that the tokens available are sufficient.
- **The SVG charts have not been built, so §3.7's claim that two shapes are
  "arithmetic and a `<path>`" is an estimate.** Axis labelling, tick selection and
  hover hit-targets are where hand-written charts actually cost time, and if that
  estimate proves wrong, §3.7 is the decision to revisit — not the scope.

## 8. What implementation changed

Built and verified. Eight notes; none reverses a decision above.

1. **§3.7's central claim holds, and was checked before a line was written.**
   Tailwind v4 generates `fill-*` and `stroke-*` from the `--color-*` namespace
   ([Tailwind docs](https://tailwindcss.com/docs/fill)), and `app/globals.css`'s
   `@theme inline` block already maps every token. So `fill-foreground`,
   `stroke-border` and `fill-success` work in inline SVG, follow the `.light`
   class, and **nothing had to be added to `@theme`**. The charting-library
   rejection rests on a verified mechanism rather than an assumption.

2. **"Now" is the latest date in the store, not `Date.now()`.** Not anticipated
   by §3.5. The fixtures use fixed ISO dates so screenshots stay stable, and a
   window computed from the real clock would silently empty the whole screen as
   the calendar moved past them. Anchoring the window to the store's own latest
   `updatedAt` keeps a fixed fixture set inside its own range forever. It is a
   mock-adapter concern; a real backend would use the real clock.

3. **The status breakdown sits outside the empty branch.** §3.5 said
   `projectsByStatus` ignores the range; the consequence, which the spec did not
   state, is that the chart must also survive an *empty* period — a window with
   no sends is exactly when "where is work sitting" is the most useful thing on
   screen. It renders above both empty states.

4. **Two empties, not one**, following spec 004 §3.4's distinction: "Nothing
   sent yet" for a product that has never sent anything, and "Nothing was sent
   in this period" with a control to widen the range when the period is the
   reason. §4 only anticipated the first.

5. **The fixture set grew from 7 projects to 17**, with ten sends spread over
   twelve weeks. §6 flagged the sparse-data problem and this is the answer to
   it: every `AnalyticsRange` now shows something real, and `medianHoursToSend`
   is a genuine computation over varied `createdAt` → `sentAt` gaps rather than
   one literal, which §7 named as untestable.

   **Side effects, accepted:** `/projects` now lists 17 rows and `/campaigns`
   13. Both are improvements, and both are still well inside the count that
   specs 004 §3.7 and 005 §3.9 called honest to render without pagination.

6. **The seed set carries one failed send, not three.** The first draft had
   three, which is a 77% success rate — and `MetricTiles` tints anything under
   90% with `--danger`, because a send failure rate above one in ten genuinely
   is alarming for this product. A seed set that trips its own alarm teaches a
   reviewer to ignore the alarm. One failure in thirteen reads as a healthy
   product and still exercises the failed-package path on `/campaigns`.

7. **A PII test had to be made less naive, and the first version was wrong.**
   Asserting that the analytics payload contains no `"email"` fails on
   `emailsSent` and `email_pending`, which are counts. The assertion now checks
   for a `"recipient"` key, an address-shaped string, and the `name`/`company`/
   `role` keys — the things that would actually constitute a leak.

8. **Hover shipped on both charts**, as invisible per-bucket and per-row hit
   targets driving a tooltip. It is mouse-and-focus only by design: the
   disclosure table is the keyboard and screen-reader path, so the hover layer
   is an enhancement whose absence breaks nothing.

Verified rather than assumed:

- `/analytics` builds **`○ (Static)`**, so nothing reached for a runtime API.
- **Removing the `<Suspense>` boundary fails `next build`** with
  *"useSearchParams() should be wrapped in a suspense boundary at page
  /analytics"*, then succeeds again when restored. The boundary is load-bearing
  and the failure is invisible in `next dev` — the same check spec 004 §7 ran on
  `/projects`.
- Suite is 132 tests across 16 files; `typecheck` and `lint` clean.
- No external origin appears anywhere in `components/analytics/` or the route.

## 9. Still unverified

Everything in §7 stands except the median calculation, which note 5 closes. Two
additions:

- **"No external requests" is still discipline, not enforcement.** A source grep
  and a DOM assertion both come back clean, and neither can prove a runtime
  fetch will never be added. The Content Security Policy spec 005 §9 called for
  would cover both screens; it still does not exist.
- **The charts have not been seen at every viewport or in light mode by a
  human.** Both are covered by construction — the SVG scales with its container
  and every mark is a token — but "covered by construction" is what §7 said
  about the median, and note 5 exists because that was not enough.

## 10. Corrected after looking at the screen

§3.8 said colour carries meaning in one place — the send success rate — "because
a send is a job outcome". **That is wrong, and opening the page is what showed
it.**

The seeded thirty-day window is 7 sent and 1 failed. At 87.5% the tile rendered
in `--danger`, so a demo of a healthy product led with an alarming red number in
both themes. The first instinct was to move a fixture date until the alarm
stopped — which is editing the evidence, and it was the *second* time this build
tuned fixtures to satisfy that threshold (§8 note 6 was the first).

The rule the screen was breaking is quoted in §2.5 and was misread:

> Semantic colours are reserved for job outcomes. A green tick means a job
> succeeded — not "this thing is good".

A success *rate* is not a job outcome. It is an aggregate of many, and tinting a
ratio is exactly the "this thing is good" reading the sentence forbids. The
individual outcomes are already coloured, correctly, on the `sent` and `failed`
bars of the status breakdown — where each bar genuinely is one outcome, and
where it reads well in both themes.

So the success-rate tile is neutral ink like every other number, and what tells
a user something went wrong is the sentence under the hero figure — "1 did not
reach their recipient" — which names a count instead of implying a verdict.

Two things worth keeping from this:

- **A threshold that needs the data tuned to look right is the wrong
  threshold.** Having to adjust fixtures twice was the signal, and it was
  available before the screen was ever opened.
- **§7's last bullet was the one that mattered.** It said the charts were
  "covered by construction" in both themes and that this was the same phrase
  that had already proved insufficient once. Every mark did re-colour correctly
  from the tokens — the rendering was fine. What only looking could catch was
  that a correctly rendered colour was the wrong colour to use.
