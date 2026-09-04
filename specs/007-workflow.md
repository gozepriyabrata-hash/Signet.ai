---
Spec:        007
Title:       The workflow — seven steps, six routes
Status:      accepted
Created:     2026-09-02
Supersedes:  —
---

# 007 · The workflow — seven steps, six routes

Defines `/projects/[id]/{report,recipient,analysis,video,email,review}`: the
seven-step golden path the product exists to run, how a generation becomes a
job rather than a spinner, where an unsaved edit lives, and why the one function
that sends must never become a Server Action.

Everything shipped so far reads. Specs 002–006 built a landing page, a
dashboard, two lists, a detail page and a reporting surface, and not one of them
writes anything. This spec is where the product starts doing its job, and it is
the first that has to answer for rules 2, 4 and 5 — none of which has any
implementation today.

**This spec is deliberately larger than its predecessors**, because the
decisions in it are cross-cutting: where draft state lives, how jobs are polled,
how the stepper derives completion, and how the send stays reachable from
exactly one place. Those cannot be settled six times, once per screen. What it
does *not* do is specify each screen's contents — `docs/screens.md` already
does, in more detail than any other part of that document, and this file defers
to it. §6 says how the work splits.

## 1. Problem

**The golden path does not run.** `app/(app)/(focus)/projects/[id]/` holds six
routes that each render a placeholder saying the screen is not built. A user can
create a project and be redirected to the right step, and then nothing. No
report can be uploaded, nothing can be generated, nothing can be sent.

Underneath that, five specific gaps.

1. **Nine of fifteen seam methods throw.** `uploadReport`, `analyzeReport`,
   `generateScript`, `generateVideo`, `generateEmail`, `getJob`, `listPresets`,
   `buildPackage` and `sendPackage` all raise `notImplemented()`. Every method
   built so far returns a value; these return a `Job` envelope, which is a
   different shape of problem.
2. **Rule 5 has no implementation at all.** There is no `hooks/use-job-polling.ts`,
   so nothing in this codebase can render `queued → running → succeeded → failed`
   with real progress. Four of the six steps are unbuildable without it.
3. **Rule 3's other half is missing.** `stores/` contains only `ui-store.ts`.
   There is nowhere for an unsaved edit to live between steps, which is what
   `docs/data-model.md` says makes back-navigation lossless.
4. **`components/ui/` has two primitives.** `button` and `skeleton`. The
   workflow needs at least input, textarea, select, dialog, form, progress and
   card, and rule 7 says they are vendored and edited rather than wrapped.
5. **`CLAUDE.md`'s own conventions section points at a mistake.** It gives
   `sendPackageAction` as the example of the Server Action naming convention.
   §2.2 is why that specific function is the one that must not be one, and §4
   treats it as the conflict it is.

## 2. Constraints

### 2.1 From `CLAUDE.md`

Five rules bind here and three of them decide structure rather than styling.

> **Never auto-send.** `sendPackage` is reachable only from the Review screen,
> and only after an explicit approval interaction. No send on mount, no send in
> an effect, no "send" as a side effect of another action.

> **State split is fixed.** Server state (projects, reports, jobs, presets) →
> TanStack Query. Wizard step, draft edits, UI preferences → Zustand. Never
> fetch inside a Zustand store. Never keep the step index in Query cache.

> **All AI output is editable.** … render every one into a real form field with
> a regenerate affordance. Never present AI output as read-only prose.

> **Generation is a job, not a spinner.** … Render real progress and a stage
> label. Failures are recoverable in place with a Retry — never a dead end or a
> full-page error.

> **Validate uploads client-side** — PDF/DOCX only, size-capped — before the
> file reaches the service layer.

Rule 1 governs what each step is allowed to contain, and it is the reason the
Video step has five controls rather than fifteen. Rules 9, 10 and 11 apply in
full; rule 11 is at its sharpest on the Recipient step, which is the screen that
collects the PII in the first place.

### 2.2 From Next.js 16 — a Server Action is a public POST endpoint

This is the constraint that decides the most important thing in the spec, and it
is a direct quote rather than an inference:

> A Server Action runs as a POST request against the page that invokes it. …
> The implementation stays on the server, but **the route is reachable to anyone
> who can send the same POST. Treat every action as an untrusted entry point.**
> — [Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions)

and, on the same page, the sentence that dismantles the obvious defence:

> **Render-time gating (only rendering a form on an authenticated page) is not a
> security boundary**, because requests can be sent without going through the UI.

The getting-started page states the mechanism plainly:

> Behind the scenes, actions use the `POST` method, and only this HTTP method
> can invoke them.
> — [Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data)

Rule 2's whole design is that there is no address that means "send". A Server
Action is an address that means send — an action ID that accepts a POST,
independent of whether anybody ever rendered Review.

### 2.3 From Next.js 16 — Server Actions cap request bodies at 1MB

> **Body size limit.** Action requests are capped at 1MB by default. Configure
> `serverActions.bodySizeLimit` when accepting larger payloads.
> — [Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions)

`docs/screens.md` specifies a 25MB cap on the uploaded report. Routing that file
through a Server Action means raising a framework limit twenty-five-fold on an
endpoint §2.2 has just described as an untrusted entry point.

### 2.4 From Next.js 16 — navigation can be blocked, but only through `Link`

> An event handler called during client-side navigation. The handler receives an
> event object that includes a `preventDefault()` method, allowing you to cancel
> the navigation if needed.
> — [`Link` · `onNavigate`](https://nextjs.org/docs/app/api-reference/components/link#onnavigate)

The same page documents a React Context pattern for blocking navigation "when a
form has unsaved changes", and states the limits: `onNavigate` "only runs during
client-side navigation", does not fire for modifier-key clicks, and does not
fire for external URLs. It says nothing about the browser Back button, the
address bar, or a `router.push` that does not originate from a `Link` — none of
which pass through it.

### 2.5 From TanStack Query — the polling contract, verified against the installed version

`docs/data-model.md` specifies the job-polling hook with a function-valued
`refetchInterval`. That signature holds in `@tanstack/query-core@5.102.8` as
installed:

```ts
refetchInterval?: number | false |
  ((query: Query<…>) => number | false | undefined);
```

The adjacent option matters more than it looks:
`refetchIntervalInBackground` "defaults to `false`", so **polling pauses while
the tab is in the background**. A video render is the longest job in this
product, and it is exactly the thing a user switches away from.

### 2.6 From this codebase — the adapter still lives in the browser

The mock's store is `sessionStorage`-backed and the server cannot read it (spec
[003](003-dashboard.md) §3.3). Inherited by every spec since, and it independently
forecloses Server Actions for the whole workflow today: an action running on the
server would find seed fixtures and none of the user's work.

Spec [005](005-campaigns.md) §3.2 already split `qk.package` from
`qk.packageForProject`, and named Review as the call site for the second. This
is that call site arriving.

Spec [006](006-analytics.md) added a fixture set of seventeen projects; the
workflow's mock jobs run against the same store.

### 2.7 From ARIA — there is no stepper pattern, so the markup has to be argued

The ARIA Authoring Practices Guide publishes patterns for Accordion, Breadcrumb,
Tabs, Disclosure, Meter, Feed and two dozen more. **It has no pattern for a
stepper, a wizard, or a multi-step progress indicator**
([APG Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)). There is nothing to
follow, which means the markup is a decision rather than a lookup.

One attribute is defined for precisely this, and it is the one
`docs/design-system.md` already specifies:

> `step`: Represents the current step within a process such as the current step
> in an enumerated multi step checkout flow.
> — [MDN, `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current)

### 2.8 From the HTML spec — client-side file validation is a hint, not a control

Rule 12 requires client-side upload validation. It is worth being exact about
what that buys, because the phrasing invites a misreading:

> The `accept` attribute **doesn't validate** the types of the selected files;
> it provides hints for browsers to guide users towards selecting the correct
> file types. It is still possible (in most cases) for users to toggle an option
> in the file chooser that makes it possible to override this… Because of this,
> you should make sure that the `accept` attribute is backed up by appropriate
> server-side validation.
> — [MDN, `<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file)

The IANA-registered types themselves are `application/pdf` and
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`
([MDN, Common MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types)),
and that page also notes that some operating systems report non-standard types
for common extensions — so even an honest browser may not report what the file
actually is.

## 3. Decision

### 3.1 Seven steps, six routes, and Send has no address

The six routes are `report`, `recipient`, `analysis`, `video`, `email`,
`review`. Send is the confirmed state of Review, rendered after a successful
`sendPackage`, and it gets no route of its own.

This is not tidiness. **It is what makes rule 2 checkable rather than
aspirational**: there is no URL that means "sending", so no URL, bookmark,
refresh, Back button or pasted link can trigger one. A `/projects/[id]/send`
route would be a page whose render performs an irreversible side effect — the
same objection spec [004](004-projects-list.md) §3.8 raised against
`/projects/new`, except that here the side effect reaches a client's inbox.

### 3.2 `sendPackage` is never a Server Action, and the naming convention is wrong

**This is the most important decision in the spec.**

`CLAUDE.md`'s conventions section reads: *"Server actions suffixed `Action`
(`sendPackageAction`)."* The example it chose is the one function in this
product that must never be one.

§2.2 is the argument. A Server Action compiles to an action ID that accepts a
POST, and Next's own documentation says the route "is reachable to anyone who
can send the same POST" and that render-time gating "is not a security
boundary, because requests can be sent without going through the UI". Rule 2
says `sendPackage` is reachable **only** from the Review screen. If sending were
a Server Action, "only from Review" would be describing which page renders the
button — which is exactly the render-time gating the documentation disqualifies.
Rule 2 would degrade from a structural property to a UI convention, and nothing
would fail when it broke.

So: sending goes through `api.sendPackage(packageId)` on the client seam, called
from one event handler, on one screen, after an explicit confirmation. Today
that is forced anyway, because the adapter lives in the browser (§2.6). The
decision matters for the day it is not forced, and it is written down now
because that is the day it would otherwise be made by accident.

The convention in `CLAUDE.md` should keep its naming rule and lose its example.
§6 records that as a correction to make.

**What this does not say.** Server Actions are not banned from this codebase.
When a real backend arrives, the natural place for authorisation to live is
inside a server function — with an authorisation check inside it, as §2.2
requires, rather than a rendered button standing in for one. What is banned is
treating "the Review screen is the only page with a send button" as the
enforcement.

### 3.3 One hook owns every job, and nothing else calls `getJob`

`hooks/use-job-polling.ts`, exactly as `docs/data-model.md` specifies: poll
while `queued` or `running`, stop on a terminal status, invalidate
`qk.project(projectId)` on success so the workflow picks up the new asset.

Two additions that document does not make.

**Polling pauses in a background tab, and the UI must not lie about it.**
`refetchIntervalInBackground` defaults to `false` (§2.5), so a user who switches
away during a two-minute video render returns to a progress bar frozen at
whatever it read when they left, which then jumps. That is correct behaviour —
polling a hidden tab is waste — but a bar that has not moved for ninety seconds
reads as a hang. On regaining focus the hook refetches once immediately rather
than waiting out the interval, so the first thing a returning user sees is the
truth.

**A job that fails is not an error state of the screen.** Rule 5 is explicit
that a failure is recoverable in place, so a failed job renders a
`JobProgressCard` in its failed state with the message and a Retry *inside the
card*. It never throws to an error boundary, and it never replaces the step.

### 3.4 Draft edits live in Zustand, keyed by project id, persisted — and navigation is not blocked

`stores/workflow-store.ts` holds the unsaved edits for each step, keyed by
project id so two projects open in two tabs do not overwrite each other, and
persisted so a refresh mid-workflow loses nothing. Committed data is refetched
through TanStack Query. This is rule 3 as written and `docs/data-model.md`
restates it.

**There is no navigation guard, and that is the decision.** §2.4 documents
`onNavigate` with `preventDefault()`, and it works — for `Link` clicks. It does
not fire for the browser Back button, an address-bar navigation, or a
`router.push` that does not originate in a `Link`. A guard that catches some
exits and not others is worse than none: it teaches the user that leaving is
protected, and then loses their work the one time they press Back.

Persistence solves the actual problem. If the draft survives leaving, there is
nothing to warn about, and "are you sure?" on a workflow the user is expected to
move around inside is friction charged for no benefit.

### 3.5 The stepper derives completion from data, never from history

`WorkflowStepper` computes which steps are complete from the `Project` — the
same predicates `lib/workflow.ts` already uses to resolve `/projects/[id]` to a
resume step. That function was written for the redirect; the stepper is its
second consumer, and the two must not be allowed to disagree about what "done"
means.

Route history is not a source of truth: a user who visited a step and left it
half-finished has visited it, and has not completed it.

Only completed steps are clickable, per `docs/design-system.md`. Markup is
`<nav aria-label="Workflow progress">` around an ordered list with
`aria-current="step"` on the current node — which §2.7 shows is a decision
rather than a pattern lookup, since the APG has none. Future steps are rendered
as plain text, not as disabled links: a disabled control in the tab order is
something a keyboard user has to skip past on every step.

### 3.6 Upload validation happens client-side, and the spec says what that is worth

Type and size are checked before `uploadReport` is called: `application/pdf` and
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`
(§2.8), 25MB cap, extension checked as a fallback because §2.8 notes some
operating systems report non-standard types. Rejections render inline on the
dropzone, never as a toast — a message about the file belongs where the file is.

**Rule 12 is a UX requirement, not a security control, and reading it as one
would be a mistake.** §2.8 quotes the HTML spec: `accept` does not validate, a
user can override it in the file chooser, and it must be backed by server-side
validation. Client-side checking exists so a user learns in 50ms rather than
after a 25MB upload. When `lib/api/real/` becomes real, the same checks must
exist on the far side, and this spec is not the authority for what happens there.

### 3.7 The seam grows `cancelJob`, because the design system already promised it

`docs/design-system.md` gives `JobProgressCard` an `onCancel?` prop and
`docs/screens.md` says Cancel is available while a video renders. No method
exists to do it. `ApiClient` gains:

```ts
cancelJob(jobId: string): Promise<Job<unknown>>;
```

Cancelling is the one job transition a user initiates. It resolves the job to
`failed` with a non-retryable, recognisable error rather than inventing a
`cancelled` status — adding an eighth `JobStatus` would touch every consumer of
the envelope to express a state whose only UI difference is the wording.

That trade is worth flagging: it means "you cancelled this" and "this broke" are
the same status with different messages. §7 records it as the decision most
likely to be revisited.

### 3.8 Presets are read-only in the workflow, and this is where rule 1 gets paid for

Every dropdown on the Video and Email steps lists presets from
`listPresets(kind)`. No step creates, edits, uploads, clones or deletes one.
Each list ends with a "Manage in Settings" link, which is a navigation away from
the workflow rather than a modal that lets configuration happen inside it.

Rule 1 caps a step at three to five controls, and the Video step is the test
case: `VideoOptions` has exactly five fields, and `types/domain.ts` already
comments that branding "is applied from the active brand preset, not chosen
here". Branding renders as a read-only line naming the active preset. The moment
that line becomes a picker, the step has six controls and the rule has started
sliding.

**The settings routes do not exist yet**, so `listPresets` returns seeded
presets from the mock and "Manage in Settings" points at routes that 404 until
spec 008. That is a real dangling link and §6 says how to hold it.

### 3.9 Every AI-produced string goes through `AIEditableField`

Summary, insights, talking points, script, subject, greeting, body — all of
them, without exception, in a real editable control with a regenerate
affordance. Rule 4 admits none.

The "AI generated" badge disappears on first edit. That is in
`docs/design-system.md` and it is worth understanding as a claim rather than a
decoration: after a human has changed the words, describing them as AI output is
false, and `Analysis.editedByUser` / `Script.editedByUser` /
`EmailDraft.editedByUser` exist in the domain model to record it.

### 3.10 Regenerate discards, and says so before it does

Every regenerate is a job that replaces content the user may have edited. The
control asks first when `editedByUser` is true, and does not when it is false —
a confirmation on untouched AI output is a dialog that trains people to click
through dialogs.

This is not rule 2 by analogy. Regenerating is reversible in the sense that
nothing leaves the building; the confirmation exists because losing edited work
is annoying, not because it is dangerous.

## 4. Where this meets the constitution

**Rule 2 conflicts with `CLAUDE.md`'s own conventions section, and the
conventions section is wrong.** This is the most important paragraph in the
spec.

The conventions list names `sendPackageAction` as its example of the Server
Action suffix. §2.2 shows that a Server Action is a POST endpoint reachable
without rendering the page that offers it, and that Next's documentation
explicitly disqualifies render-time gating as a boundary. Rule 2 requires
`sendPackage` to be reachable *only* from Review. Those two statements cannot
both hold for the same function.

Rule 2 is a non-negotiable and the conventions list is a style note, so the
resolution is not in doubt — but it is worth being clear that this is a genuine
error in the constitution rather than a tension to be balanced. The naming
convention is fine. Its example needs to be a function that is safe to expose,
and §6 proposes one.

**Rule 12 is satisfied in letter and is weaker than it sounds** (§3.6). The
client-side check is required, is implemented, and is not a security control. A
future reader who takes rule 12 as licence to skip server-side validation would
be making a mistake this spec is trying to prevent.

**Rule 1 is under more pressure here than anywhere else in the product**, and
§3.8 is where it either holds or does not. Every one of the ~39 configurable
items the requirements list could plausibly be argued onto a workflow step by
someone who has just been asked for it by a user. The structural defence is that
a step reads presets and cannot write them.

**Rule 3 is followed exactly, including the awkward part.** The current step is
not in the Query cache and not in Zustand either — it is the URL, because the
step *is* the address. The Zustand slice holds unsaved edits and dropzone state;
`docs/data-model.md`'s table lists "current step" under Zustand, which this spec
reads as meaning the resume position rather than the rendered step. §7 flags
that as a reading rather than a certainty.

**Rule 5 gets its first implementation** (§3.3), and §3.7 adds the method the
design system had already assumed.

**Rule 9's four states are not the same as the job's four statuses**, and
conflating them is the easiest mistake on these screens. A step has loading /
empty / error / success for its *reads*; a job has queued / running / succeeded
/ failed for its *work*. A running job is a success state of the read.

## 5. Rejected alternatives

**Make `sendPackage` a Server Action, per the naming convention.** The
convention says to, the file would be named `sendPackageAction`, and it is what
a reader of `CLAUDE.md` would build. It converts rule 2 from a structural
guarantee into a statement about which page has a button, on a framework whose
own documentation says that is not a boundary. See §3.2 and §4.

**Give Send its own route.** `/projects/[id]/send` would render the success
state at a real address, which is shareable and survives a refresh. It is a URL
whose render performs an irreversible external action, so a refresh, a Back, or
a bookmark could re-send. Spec 004 §3.8 rejected `/projects/new` for the same
shape of reason, and the consequence there was a duplicate project rather than a
duplicate email to a client.

**Upload the report through a Server Action.** The idiomatic React 19 shape: a
form, an action, `useActionState` for pending and error. Two constraints kill it
today and one would remain. It cannot see the browser-resident store (§2.6); it
would need the 1MB body limit raised twenty-five-fold on an untrusted endpoint
(§2.3); and even with a real backend, a 25MB upload wants progress and
cancellation, which a form POST does not give.

**Block navigation when a step has unsaved edits.** `onNavigate` exists for
exactly this and Next documents the Context pattern (§2.4). It covers `Link`
clicks and not Back, not the address bar, not a programmatic push — so it
teaches users that their work is protected and then loses it in the one case
they did not expect. §3.4 persists the draft instead, which removes the problem
rather than warning about it.

**Keep the whole draft in TanStack Query with optimistic updates.** One state
library instead of two, and the mutation story is cleaner. Rule 3 forbids it in
terms, and the reason survives the rule: an unsaved edit is not server state,
has no server counterpart to be optimistic *about*, and putting it in a cache
gives it a lifetime governed by `gcTime` rather than by the user.

**Put the current step in the Zustand store as well as the URL.** It would let
the stepper render without reading the route. Two sources of truth for the same
fact, one of which the user can change with the Back button. The URL wins by
default because it is the address.

**Derive stepper completion from visited routes.** Cheap, and it matches what a
user "has done". It is wrong in the case that matters: a half-finished step has
been visited and is not complete, and a stepper that says otherwise invites the
user past an unmet dependency — which `docs/design-system.md` explicitly
forbids. §3.5 reuses the predicates the resume redirect already relies on.

**Render future steps as disabled links.** Visually equivalent and easy. A
disabled control in the tab order is something a keyboard user skips past on
every step of every project; plain text is not focusable and says the same
thing.

**Add a `cancelled` status to `JobStatus`.** More honest than resolving a
cancellation to `failed`, and it would let the UI say "you stopped this" without
inspecting an error code. It widens a union that every consumer of `Job`
switches on, to express a state whose only difference is wording. §3.7 takes the
narrower change and §7 flags it as the most likely thing to be revisited.

**Poll jobs with `setInterval` in a component.** Fewer moving parts than a
query, and the progression is not really server state in a mock. It reimplements
retry, dedupe, cache invalidation and cleanup, all of which the query client
already does, and it puts a timer in a component that has to remember to clear
it. `docs/data-model.md` already specified the hook; this spec is not reopening
it.

**Poll in the background too, with `refetchIntervalInBackground: true`.** It
would keep the progress bar honest in a hidden tab. It spends requests to
animate something nobody is looking at, and the default exists for that reason.
§3.3 refetches on focus instead, which fixes the observable problem — a stale
bar on return — at one request rather than dozens.

**Let a workflow step create a preset inline** — "＋ New avatar" at the bottom
of the dropdown. It is the single most reasonable-sounding request this product
will receive, and granting it once ends rule 1. A step that can write presets is
a configuration surface, and there is no principled line between one inline
creator and fifteen. "Manage in Settings" costs a navigation and keeps the
boundary somewhere it can be defended.

**Build the six screens before the machinery.** Each screen is more visible than
a hook, and progress would look faster. Four of the six need `use-job-polling`,
all six need `StepShell` and the stepper, and every AI string needs
`AIEditableField` — so screens built first would each grow a private version of
the thing they were waiting for. §6 orders it the other way.

## 6. Consequences

**`CLAUDE.md` needs a correction, and it is in the conventions section rather
than the rules.** *"Server actions suffixed `Action` (`sendPackageAction`)"*
should keep the suffix rule and change the example — `uploadReportAction` is
wrong for §2.3's reason, so something read-only and dull is the right
illustration. The rules themselves are untouched: rule 2 is why this correction
exists.

**`ApiClient` grows `cancelJob`**, which is `docs/data-model.md`'s fifth
correction — after `getStats` (spec 003), the `listProjects` options object
(spec 004), the package methods (spec 005) and `getAnalytics` (spec 006). That
document has been corrected by every implementing spec, which is itself worth
noticing.

**Nine mock methods must simulate job progression**, not just return values. The
mock's existing contract — deterministic latency, forceable failures via
`?mockFail=`, loud `notImplemented` for anything unbuilt — extends to jobs: a
job advances through named stages on a timer, and `?mockFail=video` fails one.
This is the largest single addition to `lib/api/mock/`.

**`components/ui/` roughly quintuples**, vendored from shadcn and edited in
place per rule 7. Every one needs the same audit the existing two got: shadcn's
`accent` is a neutral tint and this system's `--accent` means "AI is acting", so
a primitive dropped in untouched will paint AI-blue on ordinary hover. Both
`button.tsx` and `skeleton.tsx` carry that note already.

**Spec 005's dangling key finds its call site.** Review uses
`qk.packageForProject(projectId)` to ask for the package before one has an id,
and `qk.package(packageId)` afterwards. Spec 005 §3.2 split them and named this
as the consumer.

**`/settings/*` is now blocking something.** §3.8's "Manage in Settings" links
point at routes that do not exist, and the Video and Email steps read presets
whose definitions live there. The workflow can ship against seeded presets, but
it ships with dead links until spec 008. Holding that honestly means either
seeding the presets and marking the links as known-dead in one place, or
building settings first — and §7 says which.

**New in the tree, in the order it should be built.**

```
Phase 1 — the machinery, none of it visible on its own
  stores/workflow-store.ts          ← draft slice, keyed by project id, persisted
  hooks/use-job-polling.ts          ← rule 5, finally
  lib/api/mock/jobs.ts              ← simulated progression + cancelJob
  lib/api/types.ts                  ← cancelJob
  components/ui/{input,textarea,select,dialog,form,progress,card}.tsx
  components/workflow/WorkflowStepper.tsx
  components/workflow/StepShell.tsx
  components/workflow/JobProgressCard.tsx
  components/workflow/AIEditableField.tsx

Phase 2 — the six screens, each replacing a StepPlaceholder
  app/(app)/(focus)/projects/[id]/{report,recipient,analysis,video,email,review}/
  components/workflow/steps/*
```

`components/workflow/StepPlaceholder.tsx` is deleted at the end of phase 2, and
`app/(app)/(focus)/layout.tsx` gains the stepper its own comment already
promises.

**Testing.** The three that matter most are the three rules that have no
implementation today:

1. **`sendPackage` is called from exactly one component, from an event handler,
   after a confirmation** — and from nowhere on mount, in an effect, or in a
   render. The static half of this is the `no-restricted-syntax` rule spec 005
   §3.5 already established for `components/campaigns/`; the behavioural half is
   a test that renders every other step and asserts it is never called.
2. **Every AI string is an editable control.** For each of the seven fields, a
   test that finds it by role and types into it. Rule 4 has no exceptions, so
   the test has no exceptions.
3. **A failed job renders a Retry inside the card** and does not surface an
   error boundary or replace the step.

Then: client-side rejection of an oversized and a wrong-type file before the
seam is called; the stepper refusing to link to an incomplete step; and a draft
surviving a remount.

## 7. Unverified, and open

- **Whether the workflow should ship before settings.** §3.8 leaves "Manage in
  Settings" pointing at 404s, which is the exact class of bug spec 001 was
  written to eliminate. The alternative — settings first — delays the product's
  only reason to exist behind ten configuration screens. This spec assumes
  workflow first with seeded presets and known-dead links, and that assumption
  should be argued rather than inherited.
- **`docs/data-model.md` lists "current step" as Zustand-owned; §4 reads that as
  the resume position rather than the rendered step**, because the rendered step
  is the URL. That reading is this spec's and the document does not say it. If
  the intent was that the store owns the rendered step, §3.5 and §4 are wrong
  and the URL becomes a mirror.
- **Resolving a cancellation to `failed` is the compromise most likely to be
  regretted** (§3.7). It is defensible until the first screen needs to say
  something different about a cancelled job than about a broken one.
- **No estimate has been made of how long a mock job should take.** Too fast and
  the progress UI is never really exercised; too slow and every test and demo
  pays for it. The existing mock's 300–800ms latency was chosen so loading states
  do not rot, and job durations need the same reasoning applied deliberately
  rather than picked.
- **The claim that persistence removes the need for a navigation guard assumes
  the draft actually survives every exit path.** It survives a refresh and a
  route change by construction. It has not been tested against a closed tab, a
  crashed tab, or `sessionStorage` being unavailable — and `lib/api/mock/store.ts`
  already documents that some browsers throw on access rather than returning
  undefined.
- **Rule 1's five-control cap on the Video step is stated in `docs/screens.md`
  and has never been built.** `VideoOptions` has five fields, which is
  encouraging, but the script editor, the preview, the Regenerate action and the
  branding line all live on that screen too. Whether it reads as five controls
  or as fifteen is a question only the built screen can answer.

## 8. What Phase 1 changed

The machinery is built; the six screens are not, and the placeholders still
stand. Nine notes; none reverses a decision above.

1. **The whole adapter is implemented, not just the nine job methods.**
   `listPresets`, `buildPackage` and `sendPackage` went in too, because leaving
   them throwing would mean Phase 2 reopening the adapter to build a screen.
   `lib/api/mock/` now has no `notImplemented` at all, so the "better a loud
   failure than a plausible fake" test moved to `lib/api/real/`, which is where
   an accidental call would otherwise silently do nothing.

2. **Jobs are computed from elapsed time, not driven by timers.** Not
   anticipated by §3.3. A record stores a kind, a start time, a duration and a
   pre-decided outcome; every read derives status, stage and progress from
   `Date.now() - startedAt`. That buys three things a `setTimeout` ladder would
   not: it survives a backgrounded tab (where §2.5 says polling stops), it
   survives a refresh, and there is nothing to clean up. A pre-decided outcome
   also means a job's fate cannot change between two polls of the same job.

3. **`lib/workflow.ts` gained `completedStepsFor`.** §3.5 said the stepper must
   not derive completion a second way; the honest version of that is an export,
   not a convention. The resume redirect and the stepper now call the same
   function, and a test asserts they agree.

4. **Progress is capped at 99 while running.** A bar that sits full while the
   card still says "running" is the fastest way for a progress UI to lose a
   user's trust, and rounding would have produced it for the last second of
   every job.

5. **The ESLint guard is two blocks, not one.** Extending the campaigns rule to
   the workflow initially produced a workflow file erroring with a message about
   "the campaign screens", so the trees now have separate rules with their own
   text. The workflow block's `ignores` list contains exactly one entry —
   `components/workflow/steps/ReviewStep.tsx` — and a comment saying a second
   entry is the rule being broken rather than configured. Verified by injecting
   a violation into each tree and confirming each got its own message.

6. **No dependency was added.** §2.8's file validation and the Recipient form
   need `react-hook-form` and `zod`, which `CLAUDE.md`'s stack table names and
   which are **not installed** — but nothing in Phase 1 uses them, and adding
   three unused packages to a phase that cannot exercise them is churn. They
   land with the Recipient step.

   Two absences were checked and are staying: the send confirmation uses the
   native `<dialog>` with `showModal()`, which MDN records as Baseline widely
   available since March 2022 and which provides focus trapping, Escape and an
   inert backdrop from the browser — so `@radix-ui/react-dialog` would be a
   polyfill for a platform feature. And the generation pulse is `transform` and
   `opacity` only, so it is a CSS keyframe; `docs/design-system.md` describes it
   in Framer Motion's API, but Framer Motion has never been installed and spec
   002 §3.6 records that as deliberate.

7. **`AIEditableField` split into two exports.** `docs/design-system.md` lists
   `input | textarea | list` as one `variant` prop, but a list edits an array of
   objects with reorder and include/exclude while the other two edit a string —
   one component doing both means every caller passes props meaningless for its
   variant. `AIEditableField` and `AIEditableList` share the contract that
   matters: editable, badged, regenerable.

8. **Two test-harness lessons, both self-inflicted.** Faking timers deadlocks
   the adapter, because every method awaits `delay()` and a faked timer nothing
   advances never resolves — the job tests fake `Date` only. And simulating a
   reload of a persisted Zustand store has to read storage *before* resetting
   the in-memory state, since the persist middleware writes through on every
   `set`; the first version of that test cleared the thing it was about to
   assert on.

9. **`specs/006-analytics.md` §2.4 was factually wrong** and is corrected.
   It said "Framer Motion is the only visual library in the tree". It is not in
   the tree; it is in the stack table. The tree has no visual library at all.

**The constitution was edited, with the user's explicit approval.**
`CLAUDE.md`'s conventions line now reads *"Server actions suffixed `Action`
(`revalidatePresetsAction`). **Never for `sendPackage`** …"* with a pointer to
§3.2. §4 argued this was an error rather than a tension; the correction keeps
the naming rule and turns the trap into a warning.

10. **A cancelled job was painted as a failure, and only looking caught it.**
    §3.7 shares the `failed` status between "this broke" and "you stopped this"
    to avoid an eighth `JobStatus`. The card inherited that sharing into its
    *presentation*: a cancellation rendered with the danger border and
    `role="alert"`, so pressing Cancel told the user something had gone wrong.

    Sharing a status is a data-model compromise; sharing the visual language is
    a lie. A cancelled job is now a neutral `role="status"` with a border token,
    and the failure keeps the danger border it has earned. Confirmed in both
    themes by reading computed styles rather than by eye.

    This is spec 006 §10's lesson recurring: every colour resolved correctly,
    and one of them was still the wrong colour to use. It is also the second
    time §3.7's compromise has produced a visible consequence — §9 keeps it on
    the list of things most likely to be revisited.

Verified rather than assumed:

- **Polling stops on a terminal status.** Driven to `succeeded` and to `failed`,
  then held for more than two poll intervals with the call count frozen. This is
  the one behaviour `docs/data-model.md` calls "a bug, not a safety net", and it
  is invisible in the UI.
- **The route table is byte-identical after the build.** Phase 1 adds no routes;
  a diff there would have meant something leaked.
- **Both lint guards fire with their own message**, confirmed by injection.
- **Every token flips between themes**, checked on the rendered cards through
  computed styles — the danger border resolves to a different value in each, and
  the neutral one does too.
- Suite is 169 tests across 20 files, up from 132. `typecheck` and `lint` clean.

## 9. Still open after Phase 1

§7 stands except the job-duration bullet, which note 2 and the duration table in
`lib/api/mock/jobs.ts` close. Three additions:

- **Nothing here has been seen by a human.** Phase 1 ships no route, so the only
  evidence is tests plus two components that can be rendered in isolation. Spec
  006 §10 is the cautionary tale: every colour there rendered correctly and one
  of them was still the wrong colour to use.
- **`AIEditableField` uses `window.confirm` for the regenerate warning.** It is
  correct and accessible, and it is also the one piece of this machinery that
  looks like a placeholder. Whether it becomes the vendored `Dialog` is a Phase
  2 decision, and it should be made deliberately rather than by whoever touches
  it first.
- **The draft store persists to `localStorage` while the mock's projects live in
  `sessionStorage`.** A draft can therefore outlive the project it belongs to.
  Harmless — nothing reads an orphaned draft — but the lifetimes are mismatched
  and, with a real backend, `localStorage` is the right answer for both.

## 10. What Phase 2 changed

The six screens are built, `StepPlaceholder` is deleted, and the golden path
runs end to end. Eight notes.

1. **Three dependencies were added, all named in the stack table**:
   `react-hook-form`, `zod`, `@hookform/resolvers`. Phase 1 deferred them
   because nothing used them yet; the Recipient step does.

   **Nothing else was added.** The send confirmation is the native `<dialog>`
   with `showModal()` — Baseline widely available since March 2022, providing
   focus trapping, Escape and an inert backdrop from the browser, so
   `@radix-ui/react-dialog` would be a polyfill for a platform feature. Preset
   pickers are native `<select>`, following the precedent already set twice in
   this repo.

2. **A job started on one step and consumed on another lost its id, and only
   walking the workflow found it.** The Recipient step's Next starts the
   analysis and navigates immediately; the id lived in that component's state,
   so it died with the component. Nothing polled the job, so nothing ever
   observed it finishing, so its result was never written to the project — the
   user watched a progress bar frozen at 10% forever.

   Every test passed throughout, because **every test renders one step at a
   time**. The fix is `activeJobs` in the workflow store, keyed `projectId:kind`
   and persisted, so a job also survives a refresh rather than being orphaned.
   This is now the clearest argument in the codebase for why draft-adjacent
   state belongs in a store rather than a component.

3. **A settled id is cleared on success only, never on failure.** The first
   version cleared on any terminal status, which would have made a failed job's
   card — and the Retry inside it — vanish the moment it failed. That is exactly
   the dead end rule 5 forbids, introduced while tidying up.

4. **`AIEditableField` splits by concern, and `personalisation` left the form.**
   The React Compiler flags `react-hook-form`'s `watch()` as unmemoizable, and
   it is right: a reactive subscription read inside a component. Personalisation
   is a closed enum with a default and nothing for zod to check, so it is local
   state; the remaining fields use `getValues()` in event handlers.

5. **The Recipient form is a child seeded from props.** The obvious shape — one
   component that mounts empty and `reset()`s in an effect when the project
   arrives — trips `react-hooks/set-state-in-effect`, and the rule is right.
   `RecipientStep` waits, then mounts `RecipientForm` with the values known.

6. **jsdom does not implement `<dialog>`'s methods**, so `vitest.setup.ts`
   stubs `showModal`, `show` and `close`. The stub tracks `open` and nothing
   else: focus trapping and the inert backdrop are the browser's, and a test
   asserting them would be asserting against the stub. Guarding the component
   instead would have let the test environment shape production code.

7. **`userEvent.upload` honours `accept`** and silently refuses a non-matching
   file, so the rejection path was unreachable through it. The upload tests use
   `fireEvent.change` — a real user *can* get past `accept`, which MDN states
   plainly and which is the entire reason §3.6's validation exists.

8. **No "Manage in Settings" link ships**, per the decision recorded before
   implementation. `docs/screens.md` asks for one; the settings routes do not
   exist, and a 404 from inside the core flow is the bug spec 001 was written to
   eliminate. The link arrives with the settings spec.

Verified in a browser, not only in tests:

- The full path runs: upload → parse job → recipient → analysis job → editable
  analysis, with the stepper ticking each step as its output lands.
- **A `.txt` is refused inline on the dropzone and never reaches the seam**; a
  valid PDF starts a real parse job that completes and writes `14 pages` plus an
  excerpt onto the project.
- `JobProgressCard` shows a named stage, a determinate accent bar and elapsed
  time — rule 5 as specified rather than as described.
- The URL carries only ids at every step. No recipient field reaches it.

## 11. Still open after Phase 2

- **The test suite cannot catch a cross-step defect**, which is how note 2
  survived to a browser. Every test mounts one step. A test that drives two
  steps in sequence would have caught it, and none exists.
- **`AIEditableField` still uses `window.confirm`** for the regenerate warning,
  now that a vendored `Dialog` exists beside it. It works and it is accessible;
  it also looks like the placeholder it is.
- **The suite flakes under load.** Running vitest beside the dev server produced
  two different sets of timeout failures on consecutive runs, including in files
  untouched by this work, and passed cleanly on a third. The 5s default timeout
  is tight for this machine; nothing here diagnosed whether the right fix is a
  longer timeout, fewer workers, or not running both at once.
- **`docs/screens.md` has not been updated for the six screens as built.** It
  described them before they existed and is now the older document.
