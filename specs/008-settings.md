---
Spec:        008
Title:       Settings — where configuration lives
Status:      accepted
Created:     2026-09-02
Supersedes:  —
---

# 008 · Settings — where configuration lives

Defines the nine `/settings/*` routes and the `/settings` redirect: the tree
rule 1 has been sending work to since the first spec, what stops it becoming
the settings form this product was designed not to be, why a deleted preset
would corrupt the record of what was already sent, and why the Content Security
Policy two earlier specs deferred to "the security spec" is still not landing
here.

This is the last group of routes in spec [001](001-route-map.md)'s map. It is
also the first spec whose subject is a *consequence* of another rule rather than
a product surface in its own right: every screen here exists because rule 1
refused to let it exist somewhere else.

## 1. Problem

**Rule 1 protects the workflow by exiling configuration to Settings, and
nothing protects Settings.**

> **Config belongs in Settings, not the workflow.** The requirements list ~39
> configurable items… A workflow step exposes **at most 3–5 controls**;
> everything else reads from a saved preset defined under `app/settings/`. This
> rule is what keeps the product a premium AI workspace instead of a settings
> form with a stepper on top.

That rule worked. Spec [007](007-workflow.md) shipped a Video step with exactly
five controls and a Video Studio that cannot create a preset, because rule 1
said the creating happens here. But the rule caps the workflow and says nothing
about the destination, so the sentence "everything else lands in Settings" has
been writing cheques against this tree for seven specs, and this is the first
one that has to honour them. Thirty-nine items, nine screens, no constraint.

Four more concrete problems sit under that.

1. **The seam is read-only.** `ApiClient` has `listPresets(kind)` and nothing
   else — no create, no update, no delete, no set-default. Every screen in this
   tree is a write surface for an interface that cannot write.
2. **Three of the nine screens have no data model at all.** There is no saved-
   recipient store — `Recipient` exists only as a field on `Project` — yet
   `docs/screens.md`'s Recipient step already promises a "Load from saved
   recipient" control against it. There is no type for usage or quota, and none
   for tracking preferences.
3. **Deleting a preset would corrupt the record of what was sent.**
   `CommunicationPackage` stores `email.ctaId`, `email.signatureId`,
   `video.avatarId` and `video.voiceId` as references, and `/campaigns/[id]` is
   a historical record. Delete the CTA preset and that record can no longer say
   what call to action went out. Spec [005](005-campaigns.md) §8 already noted
   those ids resolve to nothing today; deletion would make that permanent.
4. **Two specs deferred a Content Security Policy to this one.** Spec 005 §9
   and spec [006](006-analytics.md) §7 both said their "no third-party request"
   rules were discipline rather than enforcement, and that a CSP "belongs with
   `/settings/security`". §3.8 answers that, and the answer is not the one those
   specs assumed.

## 2. Constraints

### 2.1 From `CLAUDE.md`

Rule 1 is quoted in §1 and is the reason this tree exists at all.

Rule 11 binds `/settings/recipients` harder than it bound any screen so far:

> **Recipient data is client PII.** Never log it, never place it in a URL query
> string, never send it to a third party the user did not configure.

Every previous screen touched recipient data in passing — a name on a campaign
row, an address on a detail page. This one is a *store* of it: a list whose
entire content is client identity, with create, edit and delete. Rules 3, 8, 9,
10 and 12 apply in full; rule 12 returns in §3.10 for custom avatar and voice
uploads.

### 2.2 From Next.js 16 — a config redirect never reaches React

> Redirects are checked **before the filesystem** which includes pages and
> `/public` files.
> — [`redirects`](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)

and, on the same page, the cache consequence of getting the status code wrong:

> `permanent` `true` or `false` — if `true` will use the 308 status code which
> instructs clients/search engines to **cache the redirect forever**, if `false`
> will use the 307 status code which is temporary and is not cached.

### 2.3 From Next.js 16 — a nonce-based CSP forces dynamic rendering

This is the constraint that decides §3.8, and it is stated flatly:

> Every time a page is viewed, a fresh nonce should be generated. This means
> that you **must use dynamic rendering to add nonces**.
> — [Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)

The documented alternative preserves static rendering and carries a warning:

> As an alternative to nonces, Next.js offers **experimental** support for
> hash-based CSP using Subresource Integrity (SRI). This approach allows you to
> maintain static generation while still having a strict CSP.
> — same page, which adds: "This feature is experimental".

### 2.4 From this codebase — the app has inline scripts it cannot hash away

Two scripts run before React does. `app/(app)/layout.tsx` injects a pre-paint
script through `dangerouslySetInnerHTML` so the sidebar renders at its saved
width on the first frame, and `next-themes` injects its own to avoid a theme
flash. Under `script-src 'self'` with no nonce and no hash, both are blocked:
the sidebar snaps shut on every load and the theme flashes.

The second of those is not ours to hash — its content is generated by a
dependency and changes with its props and version.

Six of eighteen routes currently build static, including the landing page, which
spec [002](002-landing-page.md) §3.4 pinned with `dynamic = 'error'` precisely
so it could not drift.

### 2.5 From Next.js 16 — reading the active sub-nav item

> `useSelectedLayoutSegment` is a **Client Component** hook that lets you read
> the active route segment **one level below** the Layout it is called from. It
> is useful for navigation UI, such as tabs inside a parent layout that change
> style depending on the active child segment.
> — [useSelectedLayoutSegment](https://nextjs.org/docs/app/api-reference/functions/use-selected-layout-segment)

### 2.6 From ARIA — the sub-nav is a set of pages, not a process

Spec 007 §2.7 established that the workflow stepper uses `aria-current="step"`
because it is a position in a process. A settings sub-nav is not:

> **page**: Represents the current page within a set of pages such as the link
> to the current document in a breadcrumb.
> — [MDN, `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current)

### 2.7 From this codebase — inherited, not re-argued

The mock adapter is browser-resident (spec [003](003-dashboard.md) §3.3), so
nothing here prefetches on the server. Mutations invalidate `qk.presets(kind)`,
which is the key the workflow's dropdowns already read.

## 3. Decision

### 3.1 Nine routes, one layout, one repeated shape

`app/(app)/(shell)/settings/layout.tsx` renders a left sub-nav and a detail
pane; each of the nine sections is a route below it. The sub-nav is a client
component using `useSelectedLayoutSegment` (§2.5) with `aria-current="page"` on
the active link (§2.6).

The important part is not the layout. It is that **eight of the nine screens are
the same screen**: a titled list of presets, each row with a name, a
description, a "default" marker, and edit / archive actions, plus one create
control. Avatar, Voice, Video, AI, Email and Recipients differ in what a row
means and in nothing else.

That sameness is deliberate and §3.9 explains why it is the only thing standing
between this tree and the settings form rule 1 exists to prevent.

### 3.2 `/settings` redirects in `next.config.ts`, and temporarily

```ts
async redirects() {
  return [{ source: "/settings", destination: "/settings/avatar", permanent: false }];
}
```

Not a `page.tsx` calling `redirect()`. §2.2's "checked before the filesystem"
means this never reaches React, never renders, and — the reason that matters
here — is not a file anyone can later add a side effect to. Spec
[004](004-projects-list.md) §3.8 refused `/projects/new` on the grounds that a
page whose render performs an action is a URL that means "do something"; a
config redirect cannot become one.

**`permanent: false`, deliberately.** §2.2 says 308 instructs clients to cache
the redirect *forever*. Which section Settings opens on is a product guess —
Avatar is first because it is first in `docs/screens.md`'s list, not because
anyone decided it is what a user most often wants. A 308 would burn that guess
into every user's browser cache, and the day it changes, the people who visited
most would be the last to see it.

### 3.3 Presets are archived, never deleted

`Preset` gains `archivedAt?: string`. Archiving removes a preset from every
workflow dropdown and from the section's default list; it does not remove the
record.

§1's third problem is the reason. A sent `CommunicationPackage` stores preset
ids, and `/campaigns/[id]` exists to say what was sent. A hard delete makes that
page unable to answer its only question — not by breaking, but by quietly
showing less than the truth about a message that has already reached a client.

So the rule is: **anything a historical record can reference is archived, not
destroyed.** The archive is reachable from each section behind a disclosure, and
an archived preset can be restored. A genuine hard delete is a data-retention
decision, which is `/settings/security`'s subject and not a list row's.

The cost is real and worth naming: a user who creates six avatars while
experimenting cannot tidy them away permanently, and "Archive" is a weaker word
than the "Delete" they expected. §5 records the alternative.

### 3.4 The seam grows in three directions

```ts
// Presets — the write half of a read-only interface.
createPreset(kind: PresetKind, input: PresetInput): Promise<Preset>;
updatePreset(id: string, input: Partial<PresetInput>): Promise<Preset>;
archivePreset(id: string): Promise<Preset>;
restorePreset(id: string): Promise<Preset>;
setDefaultPreset(id: string): Promise<Preset>;

// The saved-recipient store docs/screens.md already promises.
listRecipients(): Promise<Recipient[]>;
saveRecipient(input: Recipient): Promise<Recipient>;
deleteRecipient(id: string): Promise<void>;

// Everything that is a document rather than a list.
getSettings(): Promise<WorkspaceSettings>;
updateSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings>;
```

`listPresets` gains an option to include archived rows; the workflow's call site
does not pass it, which is what keeps archived presets out of the dropdowns
without every caller having to remember.

`deleteRecipient` is a **real delete**, and it is the one place this spec does
not archive. A saved recipient is a person's contact details held at the user's
convenience; "we kept it, just hidden" is the wrong answer to "remove this
person". A sent package keeps its own copy of the recipient it went to
(`CommunicationPackage.recipient` is a value, not a reference), so history
survives the deletion without the store having to.

That asymmetry — presets archived, recipients deleted — is not an inconsistency.
It is the difference between a configuration record and a person.

### 3.5 Two of the nine are documents, not lists

Analytics, Security and Usage do not hold presets. Analytics and Security are
forms over a single `WorkspaceSettings` record; **Usage is read-only** and holds
no controls at all — it reports quota and spend, and a control that changed a
quota would be a billing action, which this product does not have.

Usage being read-only is worth stating because a "Settings" section with no
settings looks like an oversight. It is the correct shape: the section answers
"what have I used", and the answer is not editable.

### 3.6 `/settings/recipients` is a PII store, and is treated as one

This screen is the largest concentration of client identity in the product: a
list whose every row is a person, with their address.

Four rules, all structural rather than advisory:

- **No search parameter.** The list may be filtered, and the filter never enters
  the URL — the same decision spec 004 §4 made for project names, for a much
  weaker reason. There a name *described* client work; here it *is* a client.
- **No recipient field in any `href`.** Row targets are ids.
- **No bulk export.** Spec 005 §3.4 refused a column of email addresses because
  a list is one selection away from leaving the UI; a CSV button is that with a
  filename. Import and export are their own decision, and they belong with the
  retention questions in `/settings/security`, not next to a table.
- **Deleting is confirmed and says what it means.** The dialog names the person,
  states that packages already sent keep their own copy, and does not offer
  "delete all".

### 3.7 `/settings/analytics` is the consent gate, and it starts off

Spec 006 §3.3 defined this screen before it existed:

> `/settings/analytics` decides whether anything is observed about a recipient,
> and what. It is a consent and configuration surface… **`/analytics` may only
> display metrics whose collection `/settings/analytics` has switched on.**

This spec accepts that constraint rather than quietly widening it, and adds the
default: **every tracking option ships off.** A product whose proposition is
that a human approves every send does not open with recipient tracking already
enabled and a checkbox to find.

The screen therefore ships with its options present, off, and honest about what
each would do — including that open tracking is unreliable for the reason spec
006 §2.2 documents, stated on the screen rather than only in a spec. A toggle
that promises a number the product cannot compute is worse than no toggle.

### 3.8 `/settings/security` does not implement a Content Security Policy

Specs 005 and 006 both deferred a CSP to "the spec alongside
`/settings/security`". This is that spec, and the answer is that a CSP is not a
setting and does not belong on this screen — it belongs to whoever configures
the deployment, and the choice is harder than either of those specs assumed.

§2.3 and §2.4 are the argument. There are three routes and each costs something
this codebase has already paid to avoid:

- **A nonce-based CSP requires dynamic rendering on every route it covers.**
  That undoes the static rendering specs 002, 004 and 006 each worked for, and
  it would make `dynamic = 'error'` on the landing page — a guard spec 002 §3.4
  added specifically so the page could not drift dynamic — a contradiction.
- **The hash-based (SRI) alternative preserves static rendering and is marked
  experimental** by Next's own documentation. Building the product's security
  boundary on an experimental flag is a decision, not a detail.
- **A static header with `'unsafe-inline'`** would let the two pre-paint scripts
  in §2.4 keep working and would be the easiest to ship. It is also a CSP that
  permits the injection class it exists to stop — protection in the response
  headers and not in fact, which is worse than none because it reads as done.

So `/settings/security` ships what it actually is: access, retention and
data-handling preferences — how long reports and packages are kept, whether
recipient records are purged with their project, and what a client is told. The
CSP gets its own spec, whose subject is the deployment rather than a screen, and
which has to choose between three costs rather than assume there is a free one.

**This is the second time a spec has been written to say a CSP is coming.** The
right way to stop that recurring is to stop letting screens defer it — hence
this paragraph rather than a fourth deferral.

### 3.9 What protects Settings, now that everything lands here

Rule 1 has no counterpart, so this spec supplies one:

> **A settings screen may not contain a control that belongs to a single
> project.** If a control's value would differ between two projects, it is a
> workflow control and rule 1 does not apply to it.

That is the mirror of rule 1 and it is what stops the traffic flowing both ways.
Without it, "config belongs in Settings" degrades into "anything awkward belongs
in Settings", and a per-project override arrives here wearing a preset's
clothes.

The second defence is §3.1's sameness. A new configurable item is either a
preset of an existing kind — in which case it needs **no new UI at all**, only a
row — or a new `PresetKind`, which is one new route with the same list shape. It
is not a new section with a bespoke form. Nine screens that are variations of
one screen stay navigable at thirty-nine items; nine bespoke forms do not.

### 3.10 Custom avatars and voice clones reuse the Report step's validation, and are equally not a control

Avatar and Voice each accept an upload. Type and size are checked client-side
before the seam is called, exactly as spec 007 §3.6 does for the report, and
with exactly the same caveat: MDN states that `accept` "doesn't validate the
types of the selected files", that a user can override it in the file chooser,
and that it "should be backed up by appropriate server-side validation".

Rule 12 names PDF and DOCX because it was written for the report. It plainly
intends "validate uploads", so these are validated too — image types for an
avatar, audio for a voice sample — and the rule should be read as the general
instruction rather than a closed list. That reading is recorded here rather than
assumed.

**Voice cloning gets one thing the others do not**: a confirmation that names
whose voice is being cloned and states that the sample is uploaded. Cloning a
voice is the most personal thing this product does, and it is the one upload
where the person providing the sample and the person clicking may not be the
same.

## 4. Where this meets the constitution

**Rule 1 is the reason this tree exists, and this is the spec where it stops
being free.** Six specs have deferred work here with a one-line justification.
§3.9's mirror rule and §3.1's repeated shape are what make the deferrals honest
rather than a way of getting complexity out of sight. If a future screen cannot
be expressed as a list of presets or a small document, that is evidence the
thing being configured is not configuration.

**Rule 11 is at its most concentrated here** (§3.6), and one of its four
constraints costs something visible: no export. A user who wants their recipient
list out of this product cannot get it from this screen, which is a real
limitation and is accepted deliberately, because the mechanism that would grant
it is the same mechanism that would leak it.

**Rule 9 applies to nine screens at once**, and the empty state is the one most
likely to be skipped: a section with no presets yet is common, not exceptional,
and "no avatars" needs a create action rather than an apology.

**Rule 12 is read as broader than its wording** (§3.10), and that reading is
recorded rather than assumed.

**Rule 2 is not implicated and that is worth checking rather than assuming.**
Nothing under `/settings` sends anything. The `no-restricted-syntax` guard spec
007 §3.2 established covers the workflow and campaign trees; this spec extends
its `files` list to `components/settings/**` so that stays true by construction
rather than by nobody having tried.

## 5. Rejected alternatives

**Hard-delete presets.** What the word "Delete" leads a user to expect, and what
`docs/screens.md` literally specifies ("create/edit/delete"). It makes
`/campaigns/[id]` unable to say what was sent, silently and only for records
old enough that the preset has since been removed — the worst shape of data loss,
because nothing fails at the moment of the mistake. §3.3 takes the weaker word
and keeps the record.

**Hard-delete presets, but block deletion when one is referenced.** The
compromise: check for references, refuse if any exist. It makes deletability a
function of history, so the same button works on one row and refuses on the row
beside it for reasons the user cannot see, and it gets slower and more
frequently refused the longer the product is used. Archiving behaves the same
way on every row.

**Archive recipients too, for consistency.** Symmetrical and simpler to
describe. A saved recipient is a person, and "removed" has to mean removed —
§3.4's asymmetry is the point rather than an oversight.

**Put `/settings` on a `page.tsx` that calls `redirect()`.** What spec 001's
route map implies by counting it among "redirect-only route files", and what
`/projects/[id]` does. That one has to load a project to know where to send the
user; this one does not, so a config redirect answers it before React starts
(§2.2) and cannot later grow a side effect.

**Make `/settings` an overview page instead of a redirect.** A landing screen
summarising each section — how many avatars, which brand is active. It is a
ninth screen whose content is nine summaries that go stale, and its real job,
navigation, is the sub-nav that is on screen anyway.

**Ship the CSP here, nonce-based.** The documented default, and the one both
earlier specs assumed was waiting. It requires dynamic rendering on every route
it covers (§2.3), which contradicts three specs' static-rendering work and the
landing page's `dynamic = 'error'` guard outright. §3.8.

**Ship the CSP here with `'unsafe-inline'`.** Would take an afternoon and would
let the pre-paint scripts keep working. It permits the injection class a CSP
exists to prevent, while putting a `Content-Security-Policy` header in every
response — the appearance of a control, which stops anyone looking again.

**Adopt the experimental SRI flag now.** It is the only option that keeps static
rendering and a strict policy, and it may well be the right answer. It is also
marked experimental by the documentation, and adopting it inside a spec about
nine settings screens would be deciding the product's security posture as a
side effect of building a form. It gets its own spec.

**One `/settings` page with nine sections and anchor links.** Fewer routes, no
sub-nav, and every setting findable with one Ctrl+F. It is the settings form
rule 1 exists to prevent, drawn at full size — and it makes every section's
loading, empty and error states share one screen, which rule 9 turns into a page
that is partly broken rather than a section that is.

**A per-project override on any preset** — "use this avatar just for this
project". The single most reasonable-sounding request this tree will receive.
§3.9's mirror rule refuses it: a value that differs between two projects is a
workflow control, and granting it once puts a settings screen inside the
workflow's decision space and starts rule 1 leaking backwards.

**Export recipients to CSV.** Genuinely useful, and expected of any screen
holding a list. §3.6 refuses it here because the mechanism that exports is the
mechanism that leaks, and because export belongs with the retention and
data-handling questions one screen over rather than beside a table. It is
deferred, not refused forever.

## 6. Consequences

**`ApiClient` grows by ten methods** (§3.4), the largest single expansion since
it was written, and `docs/data-model.md` needs its sixth correction — after
`getStats` (003), the `listProjects` options object (004), the package methods
(005), `getAnalytics` (006) and `cancelJob` (007). Six specs in a row have had
to correct that file, which is worth reading as a fact about the document rather
than about any one spec.

**`types/domain.ts` gains `WorkspaceSettings` and `Usage`, and `Preset` gains
`archivedAt`.** The `Preset` change touches every existing consumer, all of
which currently assume every preset is live — `listPresets`' new option is what
keeps them correct without edits.

**`docs/screens.md`'s Settings section is nine lines long and is now the older
document.** It specifies "create/edit/delete" and §3.3 ships archive instead;
that line needs correcting, not just supplementing. The same document's Recipient
step promises "Load from saved recipient" against a store §3.4 is only now
creating, so that promise becomes true for the first time.

**Spec 007's dangling link resolves.** The Video and Email steps deliberately
ship no "Manage in Settings" link because the target did not exist (spec 007 §10
note 8). It exists after this spec, and adding the link is part of the work
rather than a follow-up.

**A guard extends.** `components/settings/**` joins the marketing-import
boundary and the `no-restricted-syntax` send ban in `eslint.config.mjs` (§4).

**New in the tree.**

```
next.config.ts                                   ← the /settings redirect
app/(app)/(shell)/settings/layout.tsx            ← sub-nav + detail pane
app/(app)/(shell)/settings/{avatar,voice,video,ai,email,recipients,analytics,security,usage}/page.tsx
components/settings/
  SettingsNav.tsx         ← "use client", useSelectedLayoutSegment
  SettingsSection.tsx     ← shared section chrome
  sections.ts             ← the section registry the nav and pages read
  PresetList.tsx          ← the shape the preset-backed sections share
  PresetRow.tsx
  PresetDialog.tsx        ← create and edit, on the native <dialog>
  UploadPanel.tsx
  AvatarSettings.tsx  VoiceSettings.tsx  VideoSettings.tsx  AiSettings.tsx
  EmailSettings.tsx       ← preset-backed sections
  RecipientsSettings.tsx  ← the PII screen, deliberately not PresetList
  AnalyticsSettings.tsx  SecuritySettings.tsx  ← per-section forms, not one shared form
  UsageSettings.tsx       ← read-only
lib/api/types.ts         ← ten methods
types/domain.ts          ← WorkspaceSettings, Usage, Preset.archivedAt
hooks/use-presets.ts  use-settings.ts  use-recipients.ts
```

**Testing.** Five targets, and the first two are the ones that would go wrong
silently:

1. **An archived preset disappears from the workflow's dropdowns and still
   resolves for a sent package.** The §3.3 regression, and the only way to catch
   a historical record quietly losing its meaning.
2. **No recipient field reaches a URL, an `href`, or a query string** from
   `/settings/recipients`, and there is no export control.
3. Every tracking option in `/settings/analytics` is off by default.
4. A preset mutation invalidates `qk.presets(kind)`, so a workflow dropdown open
   in another tab picks the change up.
5. `/settings` redirects with a 307, not a 308.

## 7. Unverified, and open

- **The nine sections' contents are `docs/screens.md`'s nine lines, expanded.**
  That document allocates ~39 items across them but does not enumerate them, so
  what is in each section is this spec's reading. The allocation should be
  reviewed against the original requirements before the screens are built,
  because getting it wrong is cheap to fix here and expensive once six specs
  have referenced a section by name.
- **Archiving is a decision made without a user having asked for deletion.** The
  reasoning in §3.3 is sound about referential integrity and is a guess about
  what users will accept. The word on the button may need to change even if the
  behaviour does not.
- **`/settings/usage` reports numbers this product cannot yet produce.** Quota
  and spend imply a billing relationship and metered generation, neither of which
  exists. The screen can be built against a seeded `Usage` record, but unlike
  every other section here it is describing a system rather than configuring one.
- **The CSP has now been deferred twice and is deferred again** (§3.8), with a
  reason this time rather than a pointer. That is better and is not the same as
  done, and the third deferral would not be defensible.
- **Whether rule 1's mirror (§3.9) belongs in `CLAUDE.md` rather than in a
  spec.** It is a general constraint that will govern every future settings
  decision, and a rule that lives in one spec is a rule the next reader does not
  find. Adding it is an edit to the constitution and is not this spec's to make
  unilaterally.

## 9. What Phase 1 changed

The seam, the layout, the redirect and one section — Avatar — are built. The
other eight sections have routes and a labelled placeholder, so the sub-nav has
no dead link. Seven notes.

1. **`SEED_PRESETS` stopped being the live collection.** It was a `readonly`
   const that `listPresets` filtered directly, which is precisely why nothing
   could edit a preset. `lib/api/mock/settings-store.ts` now holds presets,
   recipients and the settings document in `sessionStorage`, each behind its own
   key so a corrupt settings document cannot take the preset catalogue down with
   it. `SEED_PRESETS` remains the seed.

2. **Archiving the default hands the default on.** Not anticipated by §3.3: a
   kind with presets and no default leaves the workflow's dropdown with nothing
   to pre-select, so `archivePreset` promotes the next live preset of that kind.
   `setDefaultPreset` refuses an archived preset outright — restore it first.

3. **`createPreset` makes the first preset of a kind its default**, for the same
   reason.

4. **A `"use client"` module's non-component exports are client-reference
   proxies on the server.** `SETTINGS_SECTIONS` lived in `SettingsNav.tsx`;
   `SectionPlaceholder` — a Server Component — imported it and called `.find()`
   on a proxy. It worked in `next dev` and **failed `next build`** with a
   prerender error. The data moved to `components/settings/sections.ts`, a plain
   module. Shared data does not belong in the component that happens to render
   it, and this is the second time in this project that a defect has been
   invisible in dev and fatal in build (spec 004's `<Suspense>` boundary was the
   first).

5. **The settings lint guard is its own block.** Adding the settings paths to
   the campaigns block made a settings file error with a message about "the
   campaign screens" — the same mismatch spec 007 §8 note 5 hit. Settings has
   its own rule and its own text, and it bans **`deletePreset` as well as
   `sendPackage`**: the method does not exist, and the guard is what stops
   someone adding it without reading §3.3.

6. **`CLAUDE.md` gained rule 1's mirror**, with the user's explicit approval and
   the diff shown first. Rule 1 now caps the workflow *and* the destination, so
   §3.9 is findable by someone who never reads this spec — which was the whole
   objection in §7.

7. **`docs/screens.md`'s "create/edit/delete" is corrected, not supplemented.**
   That line was wrong rather than incomplete, and §6 said so.

Verified rather than assumed:

- **`/settings` returns 307, not 308.** Checked with `curl -sI`. A 308 is cached
  forever by the browser, so this is a mistake that would have outlived its fix.
- **All nine sections build `○ (Static)`**, and `/settings` correctly does not
  appear in the route table — it is a config redirect, resolved before the
  filesystem.
- **The archive rule holds end to end**: archiving an avatar in Settings removed
  it from the live list, showed it under "1 archived", and **removed it from the
  Video step's dropdown** — which passes no options and stayed correct without
  knowing archiving exists. The other half, that an archived preset still
  resolves for a package already sent, is pinned by an adapter test.
- **Both lint guards fire with their own message**, confirmed by injecting a
  violation of each.
- Suite is 213 tests across 23 files, up from 182. `typecheck` and `lint` clean.

## 10. Still open after Phase 1

§7 stands in full. Three additions:

- **Eight sections are placeholders.** Bounded, inside a section the user chose,
  and replaced by Phase 2 — but a placeholder is a placeholder, and the count is
  higher here than anywhere else in the product.
- **The "Manage in Settings" links are still absent** from the Video and Email
  steps. `/settings/video` and `/settings/email` are placeholders, so the link
  would resolve to one — better than a 404 and not yet worth adding. It lands
  with the sections it points at.
- **§3.1's claim is proven once, not five times.** Avatar needed `PresetList`
  plus an upload panel and nothing else, which is the evidence the shape is
  right. Voice, Video, AI, Email and Recipients are what would disprove it, and
  Recipients is the one to watch: §3.6 gives it four constraints no preset
  section has, and if it cannot use `PresetList` that is a finding rather than a
  detail.

## 11. What Phase 2 changed

All nine sections are real. `SectionPlaceholder` is deleted, and spec 001's
route map is complete. Seven notes.

1. **§3.1's claim held for five of the six list sections.** Voice, Video, AI and
   Email are `PresetList` plus strings — Video and Email render *two* of them,
   because a section holding two preset kinds is still two lists and giving it a
   bespoke shell is how one shape becomes nine. Avatar and Voice each add an
   upload panel and nothing else.

2. **Recipients could not use `PresetList`, exactly as §10 predicted.** §3.6's
   four constraints — filter never in the URL, no `href` anywhere, no export,
   a confirmation that names the person — are meaningless for a preset, and
   passing four such props into `PresetList` is how a shared component turns
   into a bespoke one wearing a shared name. It is its own component and the
   header says why.

   That is a finding rather than a failure: **two shapes across nine screens**,
   not one, and the second exists because a person is not a configuration
   record. `SettingsSection` is the third — the document shell Analytics and
   Security share.

3. **The upload validation was extracted, and `ReportStep`'s deliberately was
   not.** Avatar and Voice do the same job and would have diverged on the third
   section, so they share `UploadPanel`. The report step keeps its own
   `rejectionFor`: it lives inside a workflow step with different copy and a
   different failure surface, and merging them would mean one function serving
   two audiences.

4. **`getUsage` was missing from the seam.** §3.4 listed ten methods and Usage
   needed an eleventh — the type existed with nothing to fetch it. Caught while
   building the screen rather than by reading the spec back.

5. **The AI section is the first place rule 1's new mirror bit.** Personalisation
   level looks like a setting and is not: it varies per project, the Recipient
   step sets it, and the mirror clause added to `CLAUDE.md` in Phase 1 puts it in
   the workflow. Without that clause it would have landed here, which is exactly
   the leak §3.9 was written to stop.

6. **`/settings/security` says why it has no CSP switch**, in the screen rather
   than only in §3.8. A security section with visibly no security in it invites
   someone to add the toggle that would be theatre; the panel names the three
   costs instead.

7. **Two of my own assertions were false positives.** A native `<dialog>` stays
   in the DOM when closed — `components/ui/dialog.tsx` has to keep it mounted so
   `showModal()` has something to act on — so `queryByText` finds a closed
   dialog's title and asserting on presence proves nothing. Two tests would have
   passed without the dialog ever opening. They now read `.open`.

Verified rather than assumed:

- All nine sections serve 200 and build `○ (Static)`; `/settings` still redirects
  307 and is still not a route.
- Suite is 228 tests across 24 files, up from 213.
- The **"Manage in Settings" links are now live** in the Video and Email steps.
  Spec 007 §10 note 8 withheld them because the targets did not exist; they do.

**Not verified, and it should be:** the browser extension disconnected before a
visual pass, so no section in this phase has been looked at by a human — in
either theme. Spec 006 §10 is the standing warning about exactly that: every
colour there resolved correctly and one of them was still the wrong colour to
use. The screens most worth looking at are Usage, whose meters are the first new
mark type since the analytics charts, and Recipients, which is the densest text
on any screen in the product.

## 12. Still open

§7 stands, less the item note 4 closed. Three additions:

- **Nothing in Phase 2 has been seen rendered.** See above. This is the largest
  block of unlooked-at UI in the project.
- **`/settings/usage` still describes a system that does not exist.** §7 said so
  and building it did not change it: the numbers are a fixture, and the screen
  is the one section that reports rather than configures.
- **The CSP is still deferred**, now for the third time — but §3.8 gave a reason
  rather than a pointer, and `/settings/security` states it on screen. The next
  deferral would need a new argument, not a repeat of this one.
