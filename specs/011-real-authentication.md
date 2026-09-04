---
Spec:        011
Title:       Real authentication — accounts, sessions, and the working /login specs/010 said would need them
Status:      draft
Created:     2026-09-03
Supersedes:  010
---

# 011 · Real authentication — accounts, sessions, and the working `/login` specs/010 said would need them

Builds the precondition `specs/010` §6 named for revisiting `/login`: a
persisted account store and a decided session strategy. Both are built here,
by direct instruction, ahead of "when `lib/api/real/` becomes real" —
`specs/001` §5's original trigger for auth as its own spec. This file is that
spec.

## 1. Problem

`specs/010` closed with a specific, falsifiable precondition rather than a
vague "later": *"specifically, when there is a persisted account store
(`createAccount` writing somewhere `/login` could read from, mock or real)
**and** a session strategy decided for this app... because §2.1 and §2.3 are
what block this today, not the UI."* That precondition has now been chosen
directly rather than discovered by need: a SQLite-backed account store via
Drizzle ORM, and a stateless, `jose`-signed session cookie following the
[Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)'s
own reference pattern. This spec records that choice, checks it against
`CLAUDE.md`, and updates the two specs whose reasoning it changes.

## 2. Constraints

### 2.1 This directly overrides `CLAUDE.md`'s opening premise, by instruction, not by accident

`CLAUDE.md` opens: *"This repo is frontend only. No backend, no DB, no real
AI-vendor calls — the UI talks to a typed service layer (`lib/api/`) that is
mock-backed today."* Everything this spec builds — a SQLite database, Server
Actions that write to it, a session cookie, a route-protection layer — is a
backend and a DB. This is not a loophole in that sentence; it contradicts it
directly. It is built anyway because the user chose to build it, after being
told explicitly what the trade-off was (`specs/010`'s report named the
departure before the user picked it). Per this project's own process for
writing specs, that conflict does not get routed around quietly — this
paragraph is it, named first, not buried in consequences.

The scope of the override is deliberately narrow: **only the account/session
subsystem is real.** `docs/screens.md` and every workflow screen (`/projects`,
`/campaigns`, `/analytics`, the six workflow steps) stay exactly as
mock-backed as `CLAUDE.md` describes. §2.4 explains the mechanism that keeps
the two from bleeding into each other.

### 2.2 `CLAUDE.md` rule 3 has no bucket for a session — this spec is the one that gets to add one

`specs/010` §2.3 identified the gap precisely: rule 3's state split —
TanStack Query for server state, Zustand for wizard/draft/UI state — was never
written to hold cross-request identity, and `specs/001` §5 reserved exactly
this decision for "auth's own spec, because it also decides where `Recipient`
PII is allowed to live." This is that spec, and §3.4 below is the addition.

### 2.3 The Next.js Authentication guide's own model is the primary source for the mechanism, not a memory of how auth "usually" works

Verified against
[nextjs.org/docs/app/guides/authentication](https://nextjs.org/docs/app/guides/authentication)
(current for Next 16.3.4, the version installed here — confirmed by reading
`node_modules/next/dist/docs/01-app/02-guides/authentication.md` directly, not
recalled): the guide's own reference implementation uses a `<form action={...}>`
Server Action (not a fetch call, not `useMutation`), `jose`'s `SignJWT`/
`jwtVerify` for a stateless, `httpOnly`-cookie session, a `cache()`-wrapped
`verifySession()` Data Access Layer, and a `proxy.ts` doing only an
*optimistic* cookie check before the DAL does the *secure* one. §3 follows
this shape directly rather than inventing a different one; the one deviation
(§3.3, no `sessions` table) is named and justified on its own.

Also verified against
[`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy):
Next 16 renders the file `middleware.ts` **deprecated**, renamed to `proxy.ts`
— "The `middleware` file convention is deprecated and has been renamed to
`proxy`." Using the old filename would silently not run at all on this
version; `proxy.ts` at the repo root is required.

### 2.4 `lib/api/index.ts`'s mock/real switch is global, which is why auth cannot go through it

`lib/api/index.ts` picks `mockClient` or `realClient` for the **entire**
`ApiClient` in one line: `process.env.NEXT_PUBLIC_USE_MOCKS === "false" ?
realClient : mockClient`. Every method of `realClient` except the ones this
spec would add is still `notImplemented(...)` (`lib/api/real/index.ts`).
Adding `login` to `ApiClient` and implementing it only in `realClient` would
mean the only way to use real login is `NEXT_PUBLIC_USE_MOCKS=false` — which
breaks every other screen in the app, since nothing else in `realClient` is
implemented. Auth therefore cannot be a `lib/api` concern; it has to be a
separate, always-real subsystem that sits in front of an app whose workflow
data keeps using the mock adapter exactly as it does today, regardless of
which `ApiClient` is selected.

### 2.5 `specs/003` §3.3 already committed every `(app)` route to client-only data fetching — which sets the ceiling on what route protection can mean here

No `(app)` route does server-side prefetching (`specs/003-dashboard.md` §3.3:
a `prefetchQuery` would dehydrate seed data the browser's `sessionStorage`-backed
mock disagrees with). That means there is no server-rendered protected data
for a Data Access Layer guard to sit in front of — the entire protection
surface this spec can add is Proxy's optimistic cookie check at the edge. That
is consistent with the Next.js guide's own scoping of Proxy ("useful... to
protect static routes that share data between users") but it is worth stating
plainly: this is not the finished security boundary the guide's own DAL
section describes for data access, because there is no server-side data access
on these routes yet for a DAL to guard. The DAL built here (§3.4) exists for
the Server Actions themselves, and for whichever future spec moves real
workflow data behind auth too.

## 3. Decision

### 3.1 Storage: SQLite via Drizzle ORM, self-hosted Node

One new table, `accounts` (`id`, `name`, `workEmail` unique, `company`,
`passwordHash`, `createdAt`). `next.config.ts` sets no `output` mode today, so
`next start` already runs as a long-lived Node process — a local SQLite file
needs nothing new from the deployment to keep working. No `sessions` table:
sessions are stateless, carried entirely in the signed cookie (§3.2), which
removes an entire table's insert/expire/cleanup lifecycle for no loss of
function at this scope.

### 3.2 Session: a stateless, `jose`-signed `httpOnly` cookie

Following the guide's "Stateless Sessions" path exactly: `SignJWT`/`jwtVerify`
keyed by a `SESSION_SECRET` environment variable, payload limited to
`{ accountId, expiresAt }` — never email, name or company, per the guide's own
tip that a session payload should carry "the minimum, unique user data" and
never PII. Cookie: `httpOnly`, `sameSite: "lax"`, `secure` only in production
(so local `next dev` over plain HTTP keeps working), 7-day expiry.

### 3.3 Credential: email + password, hashed with `crypto.scrypt`

This reopens `specs/009` §3.1's "no password field" decision for `/signup`
specifically — see §5 of this spec for why that reasoning no longer holds once
a real account store and a real login exist to check the credential against.
Hashing uses Node's built-in `crypto.scrypt` (promisified) with a random
16-byte salt per account and a `crypto.timingSafeEqual` comparison at verify
time — zero new dependency for the hashing itself, and no `===` string
comparison anywhere near a secret.

### 3.4 Rule 3's third bucket: session/identity, read via `cookies()` + a DAL, never cached client-side

`CLAUDE.md` rule 3 is extended, not replaced: **"State split is fixed. Server
state → TanStack Query. Wizard/draft/UI state → Zustand. Session/identity
state → read fresh via `cookies()` in Server Components and Server Actions,
through a Data Access Layer (`lib/auth/dal.ts`); never fetched into a Query
cache, never stored in Zustand."** The reasoning: a session is neither
`Query`-shaped server data (it has to be legible *before* any query fires,
and rule 3 already forbids fetching inside a Zustand store) nor UI/draft
state — it's cross-request identity, verified fresh on the server, which is
exactly why the Next.js guide's own model keeps it out of client state
entirely and reads it through `cookies()` on every request instead.

### 3.5 `ApiClient.createAccount` is retired

Account creation and login are Server Actions (`lib/auth/actions.ts`:
`signupAction`, `loginAction`, `logoutAction`) called directly from
`useActionState`, per §2.3 and §2.4. `createAccount` is removed from
`ApiClient` (`lib/api/types.ts`), and its mock (`lib/api/mock/index.ts`) and
real-stub (`lib/api/real/index.ts`) implementations are deleted.
`WorkspaceAccount` and `SignupInput` (`types/domain.ts`) are kept — they are
still the right shapes — but their doc comments move from describing
`api.createAccount` (specs/009 §3.2) to describing `lib/auth/actions.ts`
(this spec).

A pleasant side effect, not a goal in itself: `specs/009` §3.5's scoped
`QueryClientProvider` workaround around `SignupForm` — needed only because
`useMutation` requires a query client and `(marketing)` deliberately has none
— disappears. A Server Action via `useActionState` needs no query client at
all, so `SignupForm` sheds that provider entirely once it moves off
`useMutation`.

## 4. Where this meets the constitution

**This is a direct, acknowledged departure from `CLAUDE.md`'s opening premise**
(§2.1) — the most important paragraph in this spec, not a footnote. It is a
genuine exception in the sense that `specs/009` used the term (a considered,
narrow carve-out with its own argument), not a sign the rest of `CLAUDE.md`'s
architecture is wrong: everything *outside* `lib/auth/` and its one new table
stays exactly as mock-backed as before.

**Rule 3 is amended, in the open, by the spec `specs/001` §5 always said would
get to amend it** (§3.4). No other rule's state-management split changes.

**Rule 11** — `Recipient` PII discipline — is engaged for real for the first
time by this spec, not merely by analogy the way `specs/009` §2.4 treated
`WorkspaceAccount`. A password hash is exactly the kind of secret rule 11's
spirit was written to protect even though the rule's letter names `Recipient`:
it is never logged, never returned from any Server Action or DAL call (§3.5's
DTO discipline — `getCurrentAccount()` returns `WorkspaceAccount`, which has
no `passwordHash` field), and never placed in the session cookie payload
(§3.2).

**Rule 2 — "never auto-send" — is not implicated.** Nothing here touches
`sendPackage` or the Review screen.

**The Server Action naming convention already in `CLAUDE.md`'s "Conventions"
section is followed, not exempted from:** `signupAction`, `loginAction`,
`logoutAction` use the existing `...Action` suffix, and the existing rule that
forbids a Server Action is scoped specifically to `sendPackage`
(`specs/007-workflow.md` §3.2's reachable-POST-endpoint argument) — a
signup/login/logout Server Action is not that argument's target, and is what
the Next.js guide's own canonical implementation uses for exactly this
purpose.

## 5. Rejected alternatives

**Hosted serverless Postgres (e.g. Neon, Vercel Postgres) instead of SQLite.**
Considered directly, as a way of not locking out a serverless deployment
later. Rejected for this pass: nothing in the repo today names a hosting
target, a provider, or a `DATABASE_URL` convention, so choosing a managed
service now would be provisioning infrastructure this spec has no evidence
the deployment actually needs, in exchange for an external dependency and a
secret this repo has never had to manage before. SQLite is reversible — Drizzle's
query builder is portable across both — without having built anything
serverless-specific prematurely.

**Passwordless "magic link" email login**, preserving `specs/009`'s
"no password" spirit instead of reopening it. Considered directly. Rejected:
this repo has no outbound-email capability at all today — `EmailDraft` and
`CommunicationPackage` are the *product's* feature (an AI-drafted email a
human reviews and a real send integration eventually delivers, per
`CLAUDE.md`'s golden path), not a transactional-email sender the app itself
could reuse to deliver a sign-in link. Building one is a materially larger
scope increase for one login flow than adding a password field and a hashing
utility that needs no new dependency at all.

**Keep `/signup` password-free and add a separate "set a password" step
after account creation.** Would have preserved `specs/009` §3.1 verbatim.
Rejected because it defers the exact information `loginAction` needs to exist
at all — a account with no password cannot be logged into — so it does not
avoid reopening `specs/009` §3.1, it only delays the moment of reopening it by
one extra screen, for no benefit named anywhere in this research.

**`specs/010`'s already-rejected alternatives — traditional login checked
against nothing, and a `localStorage`-faked session — are not reconsidered
here.** Both were rejected in `specs/010` §5 for reasons that had nothing to
do with the absence of a real backend (the first is dishonest regardless of
what exists to check against; the second was rejected as throwaway
architecture even relative to the *mock* adapter's own conventions). Building
a real backend does not revive either.

## 6. Consequences

- New: `lib/db/schema.ts`, `lib/db/client.ts`, `lib/auth/password.ts`,
  `lib/auth/session.ts`, `lib/auth/dal.ts`, `lib/auth/actions.ts`, `proxy.ts`,
  `drizzle.config.ts`, `.env.local.example`.
- New route: `app/(marketing)/login/page.tsx` +
  `components/marketing/LoginForm.tsx`. New:
  `components/shell/SignOutButton.tsx`.
- `components/marketing/SignupForm.tsx` is rewritten: password field added,
  `useMutation`/`api.createAccount`/scoped `QueryClientProvider` replaced by
  `useActionState(signupAction, ...)`.
- `lib/api/types.ts`, `lib/api/mock/index.ts`, `lib/api/real/index.ts`:
  `createAccount` removed. `types/domain.ts`: `SignupInput` gains `password`;
  new `LoginInput`; both types' doc comments repointed at this spec.
- New dependencies: `drizzle-orm`, `better-sqlite3`, `jose`, `server-only`
  (runtime); `drizzle-kit`, `@types/better-sqlite3` (dev).
- New required environment variable: `SESSION_SECRET`. First `.env*` file
  this repo has needed — `.gitignore` already covers `.env*.local`; `/data/`
  (the SQLite file) is added to it.
- `specs/010-login.md`'s frontmatter `Status` becomes `superseded`, with a
  `Superseded-by: 011` line — its body is left exactly as written, as the
  historical record of a decision that was correct against the constraints
  that existed when it was made.
- `specs/009-signup.md` §3.1 gets an addendum noting the password field and
  the mechanism change (`ApiClient` → Server Action); the rest of that spec's
  reasoning (three-fields-become-four's siblings, the page layout, the
  unconditional-redirect pattern) is untouched.
- `CLAUDE.md` amended, on explicit sign-off obtained at implementation time
  (not bundled into this spec's own approval): the opening paragraph now
  names `lib/auth/` and its one SQLite table as the sole exception to
  "frontend only, no backend, no DB," and the stack table gained an `Auth`
  row pointing at this spec.
- `docs/data-model.md` and `docs/screens.md` need the same maintenance every
  recent spec has needed for these files (`specs/008` §6) — the accounts
  table, the `/login` screen, and the dashboard greeting note, once auth is
  live.

## 7. Unverified, and open

- The exact current API surface of `drizzle-orm`'s `better-sqlite3` driver
  (import paths, `drizzle()` call signature) was not verified against
  Drizzle's own documentation in this research pass — Drizzle is not part of
  the Next.js/React/Tailwind verification `CLAUDE.md` asks for, and should be
  checked against [orm.drizzle.team](https://orm.drizzle.team) at
  implementation time rather than assumed from training data.
- Whether `better-sqlite3`'s native bindings build cleanly in whatever
  environment eventually runs `npm install` for this repo was not verified —
  it is a native (non-pure-JS) dependency, which is a real installation risk
  this spec is naming rather than papering over.
- This spec does not decide what happens to the SQLite file across restarts
  in a real deployment (backup, migration on deploy, multi-instance access) —
  those are deployment questions with no answer available from the frontend
  repo alone, consistent with how `specs/008` §3.8 deferred the CSP question
  to "whoever configures the deployment."
