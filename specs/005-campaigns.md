---
Spec:        005
Title:       Campaigns — sent-package history
Status:      accepted
Created:     2026-09-02
Supersedes:  —
---

# 005 · Campaigns — sent-package history

Defines `/campaigns` and `/campaigns/[id]`: what a "campaign" is in a product
that sends one package to one person, why this is the first screen in the app
permitted to render a recipient's name, and why it has no Resend button.

Like spec [004](004-projects-list.md), this file is doing two jobs at once.
`docs/screens.md` has no Campaigns section — the word appears twice in that
document, once inside an ASCII sidebar sketch and once as the label of a link
from the Send success state, and nothing has described the destination. Spec
[001](001-route-map.md) created both routes with a one-line justification each.
So this spec defines the screens as well as deciding how they are built.

## 1. Problem

**The dead link spec 001 set out to close is still open.** §1 of that spec named
"Review's success state links to *View in Campaigns*, which resolved to nothing"
as one of the two gaps that motivated the whole route map. `/campaigns` was
added to the map, and to `components/shell/Sidebar.tsx`, and to the disallow
list in `app/robots.ts` — but not to `app/`. The sidebar link 404s today.

Around that sit five genuinely open questions.

1. **Nothing in the domain model is called a campaign.** `types/domain.ts` has
   `Project`, `CommunicationPackage`, `Recipient` and no `Campaign`. The route
   name arrived from a sidebar sketch in the original requirements and has never
   been reconciled with the type it is supposed to list.
2. **The service seam cannot answer the question this screen asks.**
   `ApiClient` can `buildPackage(projectId)` and `sendPackage(packageId)`. There
   is no way to ask what has been sent.
3. **`qk.package` is ambiguous, and both meanings are already in writing.**
   `lib/query-keys.ts` declares `package: (id: string) => ["package", id]`,
   while `docs/screens.md` specifies Review's data as `['package', projectId]`.
   One prefix, two different entities. A key factory exists to stop exactly
   this.
4. **This screen cannot do its job without showing client PII**, and every list
   screen shipped so far has been built on the opposite premise. `/projects`
   carries an explicit instruction that recipient data never appears there;
   `components/dashboard/ProjectRow.tsx` carries a boxed warning against adding
   it. A sent-mail history whose rows do not say who the mail went to is not a
   history of anything.
5. **A detail page for something already sent invites a Resend button**, which
   is the most direct route to violating rule 2 that this codebase has yet
   offered.

## 2. Constraints

### 2.1 From `CLAUDE.md`

Rule 2 is binding, and §3.5 is written to it:

> **Never auto-send.** `sendPackage` is reachable only from the Review screen,
> and only after an explicit approval interaction. No send on mount, no send in
> an effect, no "send" as a side effect of another action.

Rule 11 is binding and, for the first time in this codebase, *permissive* in a
way that matters:

> **Recipient data is client PII.** Never log it, never place it in a URL query
> string, never send it to a third party the user did not configure.

The rule names three channels. Rendering to the authenticated user's own screen
is not among them, and §4 is about why that distinction is the whole design of
this screen rather than a loophole in it.

Rules 3, 8, 9 and 10 apply in full. Rule 1 applies by analogy, as it did on the
projects list: neither of these is a workflow step, but a history screen comes
under the same pressure to accrete controls.

### 2.2 From Next.js 16 — `notFound()` is not available where the data is

This is the constraint that shapes `/campaigns/[id]`.

Next's own documentation, shipped inside the installed package at
`node_modules/next/dist/docs` for `next@16.3.4`, scopes the function precisely:

> `notFound()` can be invoked in
> [Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components),
> [Server Functions](https://nextjs.org/docs/app/getting-started/mutating-data),
> and [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).
> — [notFound](https://nextjs.org/docs/app/api-reference/functions/not-found)

Client Components are absent from that list, and the omission looks deliberate:
the sibling page for
[`redirect`](https://nextjs.org/docs/app/api-reference/functions/redirect) names
Client Components explicitly and gives a worked example of calling it during a
client render. The two functions are otherwise built the same way, both throwing
a digest-tagged error, so a difference in what is documented is the only signal
available about what is supported.

The same page states the mechanism, which is why the scoping matters:

> Invoking `notFound()` throws a `NEXT_HTTP_ERROR_FALLBACK;404` error and
> terminates rendering of the route segment where it was thrown.

That constraint collides with §2.4: the lookup for `/campaigns/[id]` happens in
the browser, so the one place that knows the id is bad is a place where
`notFound()` is not documented to work.

### 2.3 From Next.js 16 — metadata is server-only

> The `metadata` object and `generateMetadata` function exports are **only
> supported in Server Components**.
> — [generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

Dynamic segments reach `generateMetadata` the same way they reach a page, as an
awaited `params` promise
([Dynamic Route Segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)),
so a per-package title is expressible in principle. It is not expressible here,
for the reason in §2.4 — and §3.7 argues we would not want it even if it were.

### 2.4 From this codebase — the mock lives in the browser

The mock adapter's store is `sessionStorage`-backed and the server cannot read
it (spec [003](003-dashboard.md) §3.3, restated in `lib/api/mock/store.ts`).
Every screen since has inherited the consequence: no server prefetching, all
fetching client-side.

Spec 005 inherits it, and inherits the precedent set for `/projects/[id]`, where
the resume redirect had to resolve in the browser for the same reason and render
its own not-found state rather than calling `notFound()`.

### 2.5 From `docs/design-system.md`

Tables sit in the 4–8px "dense content" radius band, and semantic colour is
constrained:

> Semantic colours are reserved for job outcomes. A green tick means a job
> succeeded — not "this thing is good".

A send is a job outcome, so `--success` and `--danger` are legitimate on this
screen. That is a narrower licence than it first appears, and §3.6 spends it
once per row.

## 3. Decision

### 3.1 A campaign is one sent `CommunicationPackage`. No new domain type.

`/campaigns` lists `CommunicationPackage` records that have reached a terminal
send state. There is no `Campaign` interface, no grouping, and no batch.

The word is wrong and we are keeping it. "Campaign" implies one-to-many — a send
to a segment — and this product's entire subject is the opposite: one report,
one person, one package, reviewed by a human. But the name is already
load-bearing in three places a rename would have to move in step: spec 001's
accepted route map, the sidebar, and the disallow list in `app/robots.ts`; and
`docs/screens.md` tells the user the destination is called Campaigns at the
moment they finish sending. §5 records the rename we did not do.

What this costs is written down in §7: if batch sending ever arrives, this route
means something different and this spec is the one to supersede.

### 3.2 `/campaigns/[id]` is keyed by `CommunicationPackage.id`

Not `Project.id`. The package is the thing that was sent, it carries its own id
already, and a project that one day produces a second package would silently
break a project-keyed URL.

This forces the fix to problem 3. `qk.package` becomes unambiguous:

```ts
package:           (packageId: string) => ["package", packageId] as const,
packageForProject: (projectId: string) => ["package", "for-project", projectId] as const,
```

`/campaigns/[id]` uses the first. Review — which asks "what is the package for
this project?" before any package id exists — uses the second. The two entries
never held colliding *strings*, since a project id and a package id differ; they
held colliding *meanings*, which is the failure a key factory exists to prevent
and much the harder one to notice. Review belongs to the workflow spec, so this
spec adds the key and names the call site rather than rewriting it.

### 3.3 Two methods join the seam

```ts
listPackages(): Promise<CommunicationPackage[]>;
getPackage(id: string): Promise<CommunicationPackage>;
```

`listPackages` takes no options, and that is a decision rather than an omission:
it is §3.9 made structural. When a filter is justified it arrives as an options
object, the way `listProjects` gained one in spec 004.

The mock implements both against its existing store. Both currently throw
`notImplemented()`, along with the other nine unimplemented methods.

### 3.4 The list shows the recipient's name and company. It does not show their email address.

This is the first screen in the app to render a `Recipient` field, and the split
is deliberate.

The list answers "what went out, and to whom" at a glance, and a name plus a
company answers it. The **detail page shows the full recipient record as sent,
email address included**, because that page's job is to let a human verify what
actually left the building — and an email history that will not show you the
address it used is not evidence of anything.

The reason for the split is that a list is the artefact that gets exported,
screenshotted and pasted. A column of client email addresses is a mailing list
sitting in the UI, one selection away from leaving it; the same addresses one
per page, behind a click, are a record. §4 argues this is proportionate rather
than theatre.

Columns: **Subject · Recipient · Sent**. All three come off the package itself
(`email.subject`, `recipient.name` with `recipient.company`, `sentAt`), so the
screen needs nothing denormalised onto it and nothing joined from `Project`.

A real `<table>`, for spec 004 §3.5's reasons: this is a scan-and-compare
screen, and column headers give screen-reader users context a stack of list
items cannot.

### 3.5 There is no Resend, and `/campaigns/*` never imports `sendPackage`

Both routes are strictly read-only. They call `listPackages` and `getPackage`
and nothing else. No mutation, no job, nothing that runs on mount.

The follow-on action on a campaign is **Duplicate for another recipient**,
already named in `docs/screens.md`'s Send success state. It creates a *new
project* at step 1 and walks the whole workflow, ending — as everything ending
in a send must — at Review with an explicit human approval.

A Resend button would be the shortest path in this codebase to breaking rule 2.
Not because a click is not an approval, but because "resend" is a control whose
own name argues that the review already happened. The rule says `sendPackage` is
reachable **only** from the Review screen; one send button outside Review makes
that sentence false, and the second one is easier to add than the first.

This is enforceable rather than aspirational: no module under
`app/(app)/(shell)/campaigns/` or `components/campaigns/` may import
`sendPackage` or `buildPackage`, and §6 makes that a test.

### 3.6 Failed sends belong in the history, and their row links to Review

`/campaigns` lists packages whose status is `sent` **or** `failed`. It excludes
`assembling`, `ready`, `approved` and `sending`: those are mid-workflow states
belonging to a project, and a history screen that shows work in progress is a
second projects list.

A failed row is the one place `--danger` appears, and it links to
`/projects/{projectId}/review` rather than to `/campaigns/{packageId}`. Rule 5
requires failures to be recoverable in place with a Retry, and the only place a
send may be retried from is Review (§3.5). Sending the user to a read-only
detail page for a failure they can do nothing about would satisfy the letter of
"no dead end" and none of its purpose.

### 3.7 A static title. The recipient's name never reaches the `<title>`.

Both routes export a plain `metadata` object — "Campaigns", and "Campaign" for
the detail page. No `generateMetadata`.

Two independent reasons land on the same answer, which is worth noticing. The
mechanical one is §2.3 and §2.4: metadata is server-only, the data is in the
browser, so a per-package title is not reachable even if we wanted it.

The reason that would still hold with a real backend is rule 11. A `<title>` is
not merely on screen. It is the label of the browser history entry, the text of
the tab, the OS window title, the default name of a bookmark, and the string
that appears in screen-sharing switchers and thumbnails. "Q3 Portfolio Review —
Jane Fairweather" as a tab title puts a client's name into more surfaces than
the page it describes. The static title is the correct answer on its own terms,
and §5 records the version we rejected.

### 3.8 `/campaigns/[id]` renders its own not-found state

Because of §2.2 and §2.4, an unknown package id cannot go through `notFound()`.
The route renders an `EmptyState` — "That campaign no longer exists", with a
link back to `/campaigns` — from the same client component that owns the query.

This is the pattern `/projects/[id]` already established for the same reason, and
it is inherited rather than re-argued. The distinction between "no such package"
and "the lookup failed" comes from `isNotFoundError` in `lib/api/errors.ts`: the
first is a dead end that needs a way back, the second is recoverable and needs a
Retry (rules 5 and 9). Without the distinction the page would have to offer a
Retry that can never succeed.

### 3.9 Zero controls in v1

No search, no date range, no status filter, no sort, no pagination. The list is
every terminal package, most recently sent first.

Spec 004 shipped `/projects` with three controls and argued each one. This screen
ships with none, and the asymmetry is the point. A status filter over a two-value
set is a toggle pretending to be a filter. A date range is the control a history
screen accretes first and justifies last. And a search box here would be a search
box over recipient names — the one control on this screen that rule 11 would have
to be argued about rather than obeyed, so v1 does not have that argument at all.

Pagination is deferred for spec 004 §3.7's reason unchanged: choosing offset
versus cursor against a mock is a guess about a backend nobody has built,
encoded permanently into `ApiClient`.

### 3.10 Campaigns is not Analytics, and ships no beacon

`/campaigns` answers *what was sent, to whom, and when*. It does not answer *how
it performed*. Open rates, click-through, view counts and engagement charts
belong to `/analytics`, which spec 001 created as a distinct route for exactly
this reason.

Concretely: no page on either route may load a tracking pixel, an embedded
third-party player, or any external request. Rule 11's third clause — never send
recipient data to a third party the user did not configure — is at its most
literal on the one screen that holds a list of client identities, and an
analytics snippet added "just to see how it's doing" would breach it silently.
`/settings/analytics` is where a user configures tracking, and nothing on this
screen may assume they have.

## 4. Where this meets the constitution

**Rule 11 permits this screen, and the reasoning has to be exact, because
getting it wrong in either direction is expensive.**

Read literally, rule 11 forbids three things: logging recipient data, putting it
in a URL query string, and sending it to a third party the user did not
configure. Rendering it to the authenticated user — whose own client the
recipient is, and who typed the address into the Recipient step themselves — is
not one of the three. It cannot be. The Review screen already displays the
recipient's name and email in a confirmation dialog, `docs/screens.md` requires
it to, and a rule that forbade showing a user their own client data would forbid
the product.

So the question this spec has to answer is not "may we show it" but "what
discipline replaces the blanket prohibition the other list screens enjoy". Four
things:

1. **Nothing recipient-derived enters a URL.** Row hrefs are
   `/campaigns/{packageId}` and `/projects/{projectId}/review`, both opaque ids.
   There is no query string on either route — §3.9 means there is none to abuse.
2. **Nothing recipient-derived enters the document title** (§3.7), which is the
   channel rule 11's URL clause is really protecting: history, bookmarks, and
   anything that reads a tab.
3. **No third-party request of any kind** (§3.10).
4. **The email address is behind a click** (§3.4), so the aggregate — a column
   of addresses — never exists as a selectable artefact.

Point 4 is the one that could be dismissed as security theatre, and it is not
load-bearing on its own; a determined user can open six pages. It is a
proportionality choice: the list's job is served without the addresses, so
showing them buys nothing and costs the one shape of this data that gets
mishandled by accident.

**Rule 2 constrains the feature set, not just the implementation** (§3.5). The
obvious detail-page action is the one we are refusing to build, and the refusal
is the reason the rule stays true. Recording it here matters more than the code
does: the code is a missing button, which is invisible, and a future reader would
otherwise see a gap rather than a decision.

**Rule 1 in spirit** (§3.9). Zero controls on a screen whose natural form has
five.

**Rule 9 in full.** Both routes ship loading skeletons, empty, error and success.
`/campaigns` has one empty — "Nothing sent yet" — and it is a genuine empty
rather than a filtered one, because there are no filters. `/campaigns/[id]` has
two distinct failures, per §3.8.

**Rule 3 is satisfied and, on this screen, uneventful.** Packages are server
state and live in TanStack Query. There is no wizard step, no draft and no UI
preference, so there is nothing for Zustand to own.

## 5. Rejected alternatives

**Rename the route to `/sent`.** Honest in a way `/campaigns` is not: it
describes what the screen lists, it does not promise batch sending, and it would
not need a paragraph of apology in §3.1. It loses on cost and on continuity —
spec 001 is accepted with `/campaigns` in the route map, `app/robots.ts` already
disallows that path, the sidebar ships the label, and `docs/screens.md` tells the
user at the moment of sending that the destination is called Campaigns.
Reconsider it in the same spec that decides whether batch sending exists, when
the name is either vindicated or clearly wrong; renaming now costs four files to
settle an argument nobody has had yet.

**Make `/campaigns` a saved view of `/projects?status=sent`.** Nearly free: the
projects list already filters by status, and spec 004 put that filter in the URL
precisely so views like this are linkable. Rejected because the two screens list
different entities. `/projects` lists work and deliberately shows no recipient;
this lists correspondence and cannot do its job without one. Collapsing them
means either adding a recipient column to `/projects` — which its own spec and a
boxed warning in `ProjectRow.tsx` both forbid — or shipping a history that will
not say who anything went to.

**Key `/campaigns/[id]` by project id.** Tempting, because `Project` is the
entity everything else is keyed by and it would let the detail page reuse
`getProject`. It hard-codes a one-package-per-project assumption into a URL,
which is the most expensive place to keep one, and "Duplicate for another
recipient" is already a hint that packages outlive the project shape. §3.2 pays
one query-key correction to avoid it.

**Derive the list from `listProjects()` and read `project.package`.** No seam
change, and it works today because the mock hangs everything off `Project`. The
screen would then have to filter out projects whose `package` is undefined —
rendering the *absence* of the thing it exists to list — and a real backend would
certainly serve sent mail from its own endpoint. Spec 004 rejected client-side
filtering for the same reason and the argument has not changed: the seam exists
so the swap is one file, and spending it to avoid an interface change is a bad
trade.

**Ship a Resend button.** The single most requested feature on a page like this,
and defensible on the surface: the user clicks it, so a human is in the loop. It
makes rule 2's actual sentence false. See §3.5.

**Ship "Retry" on failed rows, in place.** A softer version of the same thing,
and it looks like rule 5 rather than a violation of rule 2. Rejected because a
retry from a history screen re-sends without re-reviewing, and a package that
failed to send may have failed for reasons a human should look at before it goes
again. §3.6 sends the user to Review instead, which is one extra click and the
correct one.

**Put open and click metrics on the campaign detail page.** The obvious next
thing, and `/settings/analytics` implies tracking will exist. It makes
`/campaigns` and `/analytics` the same screen with different defaults, which is
spec 001 §4's Templates problem in a new place. It also requires a third-party
beacon on the screen holding client identities (§3.10).

**Show the recipient's email address in the list.** More informative, one column,
and the address is already inside the record being rendered. §3.4 and §4 explain
the trade; this is the rejection most worth revisiting if users report that
name-plus-company is genuinely ambiguous for them, because then the column is
buying something and the calculation changes.

**Add a search box over recipients.** The most useful control this screen could
have, and the reason v1 has none. It would put client names into a text box whose
value has to be kept out of the URL by discipline — spec 004 §4 already found
that argument costs something real — and it would do so on the one screen where
the entire dataset is client identity. Deferred until the list is long enough
that the absence hurts, at which point it is its own decision with its own spec.

**Use `generateMetadata` to title the page with the subject line.** No recipient
name, so it looks safe, and it would make browser history genuinely more useful.
Email subject lines in this product are AI-generated *from* the client's report
and routinely name the client — the seed fixtures in `lib/api/mock/fixtures.ts`
demonstrate the same effect on project names — so "subject line" is not a
PII-free field, it is a PII field nobody has labelled. §2.3 makes it unreachable
today; §3.7 is why it stays rejected once it is reachable.

**Server-render `/campaigns/[id]` and use `notFound()`.** The idiomatic App
Router shape, and what §2.2's documentation is written for. Impossible while the
adapter is browser-resident (§2.4): the server would 404 every package it cannot
see, which is all of them. This becomes the right answer at the same moment
server prefetching does, which is the spec that makes `lib/api/real/` real.

**Reuse `ProjectsTable`.** Both are tables of rows with a date and a link, and
they would start nearly identical. They diverge on the first column — one shows a
status, the other a recipient — and on row targets, and a shared component grows
a prop per difference. Spec 004 §3.5 took the same duplication between the
dashboard list and the projects table, with the same reasoning, and it has held.

**Add a `Campaign` type that groups packages by report or by segment.** It would
make the route name true, and `PresetKind` already includes `segment`, so the
vocabulary exists. It is a data model invented for a feature nobody has
specified, and the grouping key — report, segment, or date — is exactly the guess
that would be wrong. §3.1 keeps the model honest and the name slightly wrong,
which is the cheaper of the two errors to fix later.

## 6. Consequences

**A link promised by spec 001 finally resolves.** `docs/screens.md`'s Send
success state points **View in Campaigns** at `/campaigns/{package.id}` — the
detail page, not the list. The user has just sent that package; landing them on a
list to find it again would be a strange reward.

**`ApiClient` grows two methods**, so `docs/data-model.md` needs its third
correction: spec 003 found `getStats()` missing from its interface listing, spec
004 changed `listProjects`, and this adds `listPackages` and `getPackage`.

**`lib/query-keys.ts` changes shape**, and one of the two call sites is not ours
to fix. `qk.package` is now unambiguously package-keyed and `qk.packageForProject`
is added for Review. `docs/screens.md`'s Review section still specifies
`['package', projectId]` and must be corrected to name the new key; the Review
screen itself belongs to the workflow spec.

**`docs/screens.md` gains a Campaigns section**, as it gained a Projects section
in spec 004. Two routes created by a spec and described by no document is now a
pattern rather than an accident, and it is worth noticing that both times the
implementing spec has had to invent the screen.

**`app/robots.ts` already covers both routes.** `disallow: ["/campaigns"]` is a
path prefix, so `/campaigns/{id}` is covered, and the workspace root layout
already sets `robots: { index: false, follow: false }`. Nothing to change —
recorded because a screen holding client names is the one where somebody should
have checked.

**New in the tree.**

```
app/(app)/(shell)/campaigns/page.tsx           ← the list
app/(app)/(shell)/campaigns/[id]/page.tsx      ← awaits params, renders the client detail
components/campaigns/
  CampaignsTable.tsx      ← "use client", the query and the four states
  CampaignRow.tsx         ← recipient name + company; never the email address
  CampaignDetail.tsx      ← "use client", getPackage, both failure states
lib/api/types.ts          ← listPackages, getPackage
lib/api/mock/index.ts     ← both implemented against the existing store
lib/query-keys.ts         ← package / packageForProject split
hooks/use-packages.ts     ← the list query
```

Both routes sit in `(shell)`, not `(focus)`. They are destinations with a
sidebar, not workflow steps.

**Testing.** Six targets, and the first two are the ones that matter.

1. **Nothing under `components/campaigns/` or the campaigns routes references
   `sendPackage` or `buildPackage`.** A static assertion, pinning §3.5 so a
   Resend button cannot be added without a test failing.
2. **No recipient email address appears in the list's DOM**, and no
   recipient-derived string appears in any `href` on either route. The rule 11
   regression, in the one place the rule is being read permissively.
3. All four states on both routes, including `/campaigns/[id]`'s two distinct
   failures.
4. A failed package's row links to `/projects/{projectId}/review`, not to the
   campaign detail.
5. Packages in non-terminal states do not appear in the list.
6. Neither route mutates on mount.

**What this unblocks.** `/analytics` — spec 001's remaining core route — can be
specified against a screen that now exists, with a clear boundary: campaigns is
the record, analytics is the reading of it.

## 7. Unverified, and open

- **Whether "Campaigns" survives contact with a real requirement.** §3.1 keeps a
  name that describes a one-to-many send for a screen listing one-to-one sends,
  on continuity grounds. If batch sending to a `segment` preset is ever
  specified, this route's meaning changes and this spec should be superseded
  rather than amended.
- **The column set is this spec's proposal, not a product decision.** With no
  Campaigns section in `docs/screens.md` to implement, Subject · Recipient · Sent
  is an argued guess and should be reviewed as one — as spec 004 §8 said of the
  projects table, which has held so far.
- **Whether `CommunicationPackage` needs the project name denormalised onto it.**
  §3.4 avoids the question by showing the email subject instead. If the subject
  turns out to be a poor row label in practice, the alternative is a join the
  mock can do trivially and a real backend may not, and that is a seam decision
  rather than a screen one.
- **That "no third-party request" is discipline, not enforcement.** §3.10 forbids
  beacons; nothing in the build prevents one. A Content Security Policy would
  make it structural, and there is no CSP in this repo. That belongs with
  `/settings/security`, and this file should not be read as evidence the
  guarantee is enforced.
- **The `notFound()` scoping in §2.2 is read from documentation, not from a
  failing experiment.** The docs list three contexts and Client Components are
  not among them; we did not build a client-side `notFound()` and watch it fail.
  The decision does not rest on that alone — §2.4 makes a server lookup
  impossible regardless — but the claim should not be repeated as a tested fact.

## 8. What implementation changed

Built and verified. Seven notes; none reverses a decision above.

1. **"Duplicate for another recipient" is not built.** §3.5 names it as the
   follow-on for a sent package, and it needs a `duplicateProject(projectId)`
   seam method plus a workflow to land in — neither exists. Shipping the button
   disabled was considered and rejected: spec 001 §1 was written about dead
   links, and a control that goes nowhere is the same bug wearing a tooltip. The
   detail page ships **Back to campaigns**, and **Open in Review** on a failed
   package.

2. **`ctaId` and `signatureId` are not resolved.** They are preset references,
   and turning them into labels needs `listPresets`, which the workflow spec
   owns. The detail page renders what the package literally carries rather than
   inventing a label. This is the open item §7 did not anticipate.

3. **Rule 2 is enforced by ESLint, not by the test §6 promised.**
   `no-restricted-imports` cannot express the ban: `api` is what gets imported
   and `sendPackage` is a method on it, so nothing forbidden ever appears in an
   import statement. A `no-restricted-syntax` selector over
   `MemberExpression[property.name=/^(sendPackage|buildPackage)$/]`, scoped to
   the campaigns routes and components, catches the member access instead. The
   test is kept as well — a lint rule is one config edit from deletion.

   Verified by injecting `api.sendPackage(packageId)` into `CampaignDetail` and
   watching `npm run lint` fail with §3.5's message, then removing it. This is
   the discipline spec 004 §7 applied to the `<Suspense>` boundary: a guard
   nobody has watched fail is not a guard.

4. **The fixtures gained packages, and one project's status changed.** No
   fixture carried a `package`, so `/campaigns` would have been permanently
   empty. Three existing projects gained one — Northgate and Pemberton, plus
   Orrin Wealth promoted from `email_pending` to `sent` so the history has more
   than one success row. No new projects were added, because
   `mock-client.test.ts` asserts against `SEED_PROJECTS.length` and a changed
   number there would quietly mean something different.

   **A side effect worth naming**: giving the Pemberton project a full package
   changes what `/projects/prj_9ab3d1` resumes to, from Report to Review. That
   is more correct — the send is what failed, and every earlier step has its
   output — and it is what makes the campaigns → Review link meaningful. It is
   still a behaviour change to a route shipped earlier.

5. **Seed packages carry no `posterUrl` or `playbackUrl`.** §3.10 forbids
   external requests from these routes, and a poster URL is the one field a
   component would put straight into a `src`. The detail page renders a
   placeholder frame plus the video's real metadata instead. The rule is written
   into `fixtures.ts` where the temptation to add a "realistic" CDN URL lives.

6. **A date formatter moved to `lib/utils.ts`.** `ProjectTableRow` had a
   module-private `Intl.DateTimeFormat` with an explicit locale and a comment
   explaining why the locale is pinned. Campaigns needed the same thing plus a
   date-and-time variant, so `formatDate` and `formatDateTime` are now shared
   and the codebase has one pinned locale rather than two copies of the same
   trap.

7. **A Vitest interaction cost more time than the feature.** A `beforeEach` that
   clears or resets the `api` module mock makes a rejection that mock later
   produces surface as an **uncaught error** rather than as the query's error
   state — the test fails with the rejection reason even though every assertion
   in it passed. Reproduced down to a bare `useQuery` over a mocked module: a
   `beforeEach` calling `mockClear()` fails, a no-op `beforeEach` passes, and
   `afterEach(vi.clearAllMocks)` alone passes while still giving each test a
   clean call count. Both campaign test files use the `afterEach`-only shape and
   say why.

   `components/workflow/ProjectResumeRedirect.test.tsx` still has the
   `beforeEach` reset and still passes, so the interaction depends on something
   about file shape that was not pinned down. It is latent fragility in that
   file rather than a live failure, and it was left alone rather than churned.

Verified rather than assumed:

- `npm run build` emits `/campaigns` static and `ƒ /campaigns/[id]` dynamic.
- All seven campaign and workflow routes answer 200; the suite is 108 tests
  across 15 files, with `typecheck` and `lint` clean.
- The lint guard fails on an injected violation, with the intended message.

## 9. Still unverified

Everything in §7 stands. Two additions:

- **That no third-party request is made** was argued, written into the fixtures
  and the components, and is covered by no automated check. jsdom cannot assert
  it. It needs a look at the network panel, and structurally it needs the CSP
  §7 already calls for.
- **The screen has never been seen with a long list.** Three seed packages is
  enough to prove the states and nothing about whether §3.9's zero controls
  survive fifty rows. That is the moment the deferred search and date range stop
  being deferred.
