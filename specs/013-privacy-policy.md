---
Spec:        013
Title:       Privacy policy — publishing on the trigger specs/001 §6 named
Status:      draft
Created:     2026-09-03
Supersedes:  —
---

# 013 · Privacy policy — publishing on the trigger `specs/001` §6 named

Publishes `/legal/privacy`, closing a gap `specs/001` §6 flagged at the start
of this project and named a precise trigger for: *"`/legal/privacy` stops
being optional the moment the mock adapter is replaced: the product ingests
client reports and stores `Recipient` PII, which rule 11 of `CLAUDE.md`
already governs internally but nothing yet states publicly."*

## 1. Problem

That trigger fired. `specs/011` replaced the mock adapter for one subsystem —
accounts — with a real SQLite table. Real names, work emails and password
hashes now persist on a server, not in a browser's `sessionStorage`. The
footer has said "Privacy and terms are published before general availability"
since `specs/002`; there was nothing behind that sentence for real personal
data until now.

## 2. Constraints

### 2.1 This is not a legal-advice task, and the page must not pretend otherwise

Nothing in this repo, this process, or the author qualifies as legal counsel.
A confidently-written policy that overclaims compliance (GDPR, CCPA, a
specific certification) would be worse than no policy — it would be a false
assurance instead of an honest gap. §3.7 below states this on the page itself,
the same way `specs/008` §3.8 stated plainly that `/settings/security` has no
CSP rather than building a control that only looked like one.

### 2.2 The claims have to be checked against what the code actually does, not against what a generic privacy policy says

Every sentence in §3 below is sourced from a specific file, not a template:
`lib/auth/password.ts` (scrypt, random per-account salt, never returned by
any DAL call — `specs/011` §4), `lib/auth/session.ts` (the cookie payload is
`{ accountId }` only — `specs/011` §3.2), `lib/api/mock/store.ts` (report and
recipient data lives in `sessionStorage`, not a server, today), and the
landing page's existing `#security` copy (`app/(marketing)/_content.ts`,
`security.points`), which already makes public claims this page must not
contradict.

### 2.3 `CLAUDE.md` rule 11 already governs the underlying data; this page states it publicly

Rule 11: *"Recipient data is client PII. Never log it, never place it in a URL
query string, never send it to a third party the user did not configure."*
This spec adds no new handling rule — it publishes the one that already
exists.

## 3. Decision

### 3.1 Content lives as a typed constant, like everything else on this shell

`privacyPolicy` in `app/(marketing)/_content.ts` — title, last-updated date,
an intro, and an array of `{ heading, body, points? }` sections
(`PolicySection`, `types/marketing.ts`) — matching the "everything the
marketing shell renders is a typed constant" rule `types/marketing.ts`'s own
header states and `specs/002` §3.1 established. No fetch, nothing rendered
from a CMS.

### 3.2–3.6 Section-by-section sourcing

- **Account information** — sourced from `specs/011` §3.1, §3.3, §4.
- **Client reports and recipient details** — sourced from `CLAUDE.md` rule 11
  and the landing page's own `#security` copy, plus the honest caveat that
  this data is browser-only today (`lib/api/mock/store.ts`, `docs/data-model.md`).
- **Cookies and local storage** — sourced from `lib/auth/session.ts`'s cookie
  config and `stores/ui-store.ts`'s persisted preferences.
- **What this product does not do** — sourced from `specs/002` §3's deferred
  analytics/tracking decision (nothing shipped) and the absence of any real
  AI-vendor integration (`lib/api/real/index.ts`, all `notImplemented`).
- **Retention and deletion** — states plainly that no self-serve deletion
  exists. This was the one section where the honest answer is a gap, not a
  policy, and it says so rather than describing a control that isn't built —
  the same discipline `specs/008` §3.8 used for CSP.

### 3.7 The page names its own limits, on the page

The closing section, "Where this policy stands," states directly that this
was written by the team building the product, not reviewed by counsel, and
will be revised — with a real contact channel — before general availability.
Per §2.1, this is not boilerplate; it is the load-bearing sentence that keeps
the rest of the page honest.

### 3.8 Footer changes: a new Legal column, and a truthful "still pending" note for Terms

`footer.columns` gains a `Legal` heading linking `/legal/privacy`. The
existing `legal` string ("Privacy and terms are published before general
availability") is now half wrong — corrected to state Terms specifically is
still pending, since Privacy no longer is.

## 4. Where this meets the constitution

**Rule 11 is the rule this spec exists to make public**, not extend — §2.3.

**No other rule is implicated.** This is content and one static route, not a
mutation, not a workflow control, not a Server Action.

## 5. Rejected alternatives

**A generic privacy-policy template (the kind a "privacy policy generator"
produces).** Rejected per §2.2 — a template describes what a typical SaaS
does, not what this one verifiably does, and several of its standard claims
("we use cookies to improve your experience," implied analytics, implied
data-sharing-with-processors boilerplate) would be false here today.

**Wait for a real backend and real legal review before publishing anything.**
This is what `specs/001` §6 assumed would happen, on the theory that no real
PII existed yet to protect. `specs/011` changed that fact; waiting further
would mean real account data outliving the policy that was supposed to
precede it, which is the exact ordering `specs/001` §6 was written to avoid.

## 6. Consequences

- New: `app/(marketing)/legal/privacy/page.tsx`, `privacyPolicy` in
  `app/(marketing)/_content.ts`, `PolicySection` in `types/marketing.ts`.
- `footer.columns` gains a `Legal` column; `footer.legal` reworded.
- **Not delivered, on purpose:** `/legal/terms` — nothing in the product
  today involves a contract, a purchase, or a binding agreement that would
  need one. `specs/001` §6 deferred it for the same reason and this spec
  does not reopen that question.
- **Open, deliberately:** a real privacy-request contact channel. §3.7 states
  its absence on the page rather than inventing a support address that would
  not be monitored.
