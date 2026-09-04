---
Spec:        010
Title:       Login — the argument specs/009 asked for, and why it still loses
Status:      superseded
Superseded-by: 011
Created:     2026-09-03
Supersedes:  —
---

> **Superseded by [`specs/011`](011-real-authentication.md).** The rejection
> below was correct against the constraints that existed when it was written:
> no persisted account store and no session strategy anywhere in this
> codebase. `specs/011` builds both, by direct instruction, and revisits
> `/login` on that new footing. This file's body is left unedited — it is the
> record of a decision that was right *then*, not a claim that it is right
> now.

# 010 · Login — the argument specs/009 asked for, and why it still loses

Answers a direct request to build `/login`, styled from `docs/design-system.md`.
The answer is that it is still not built, but not for the reason `specs/001`
gave in 2026-09-01 — this spec re-derives the rejection against the codebase
as it exists today, including the one thing that changed since then: `/signup`
now exists and proves a mock-backed public form *can* be built honestly here.
This is the "own argument" `specs/009` §5 said `/login` would need before
anyone reopened the question, requested sooner than expected.

## 1. Problem

`specs/001` §5 rejected `/login` by name, alongside `/signup` and
`/forgot-password`, as "non-functional theatre" and deferred the whole area to
"when `lib/api/real/` becomes real." `specs/009` then built `/signup` anyway,
by finding a version of it that isn't theatre: no password, no session,
nothing gated — a page that only captures who is asking and hands them the
same unconditional `/dashboard` the landing page already hands out. Having
found that opening for `/signup`, `specs/009` §5 explicitly declined to walk
through it a second time for `/login`, closing with: "If a future spec wants
`/login`, it needs its own argument, not an extension of this one."

That is the request now in front of this spec, made directly and asking for
design fidelity to `docs/design-system.md`. The honest way to answer it is not
to cite `specs/001` again — that citation is exactly what `specs/009` said
would not be enough — but to check whether the same move that rescued
`/signup` rescues `/login`: is there a version of a login page that only
*asks*, implies no boundary, and hands out the same unconditional `/dashboard`?
§2 checks that against what the codebase actually does today, not against what
it did when `specs/001` was written.

## 2. Constraints

### 2.1 There is no account to log in to — not even a mock one

`/signup`'s honesty rests on `createAccount` never persisting anything. Reading
the mock implementation directly:

```ts
// lib/api/mock/index.ts:180-193
async createAccount(input: SignupInput): Promise<WorkspaceAccount> {
  await delay("createAccount");
  if (shouldFail("account")) {
    throw new MockError("MOCK_ACCOUNT", "Could not create your workspace.");
  }
  return {
    id: `acct_${Math.random().toString(16).slice(2, 8)}`,
    name: input.name,
    workEmail: input.workEmail,
    company: input.company,
    createdAt: new Date().toISOString(),
  };
},
```

Every call mints a fresh, random `id` and returns it; nothing is written to a
list, a map, `localStorage`, or any other store the mock adapter can read back
— `specs/009` §3.2 says this outright: "no persistence beyond returning the
record — there is no list-accounts screen for it to seed." `lib/api/real/index.ts:21`
stubs `createAccount` the same as every other unimplemented method, so the real
adapter has no store either, today.

This is the fact `/signup` was able to route around and `/login` cannot.
Signup's operation is "mint a record and hand it back" — it does not need
anything to already exist. Login's operation, by definition, is "find a record
that already exists and check something against it." With zero accounts
persisted anywhere in the codebase, mock or real, there is no *referent* for
that check — not a wrong one, not a fake one, none. A login form here would not
be checking a password against the wrong thing; there would be nothing on the
other side of the check at all.

### 2.2 Next.js's own authentication guide treats login and session as one system, not two pages

The [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)
does not describe login as a standalone form. Signup and login share one
three-part model — "Authentication," "Session Management," "Authorization" —
and the guide's own Proxy example lists them as a matched pair from the first
line of the config:

```ts
// from the Next.js Authentication guide, "Optimistic checks with Proxy"
const protectedRoutes = ['/dashboard']
const publicRoutes = ['/login', '/signup', '/']
```

Building the form is step one of three in that guide; steps two and three are
generating and encrypting a session token, setting an `httpOnly` cookie via
`cookies()`, and — for login specifically — a Data Access Layer that decrypts
that cookie on every protected request. None of that exists in this repo, and
`CLAUDE.md` says it should not yet: "This repo is frontend only. No backend, no
DB, no real AI-vendor calls." `/signup` could be honest without a session
because it never claimed to check anything. `/login` cannot use the same
trick — checking something *is* the page's entire job, per Next's own model of
what the word means, and this repo has nowhere to encode the result of that
check even if the check itself were faked.

### 2.3 `CLAUDE.md` rule 3 has no bucket for what a successful login would produce

> "State split is fixed. Server state (projects, reports, jobs, presets) →
> TanStack Query. Wizard step, draft edits, UI preferences → Zustand."

A session is neither. It is not a `Query` result, because rule 3 also says
"never fetch inside a Zustand store" and a session has to be readable before
any query fires; it is not UI preference or draft state either — it is
cross-request identity, the one category rule 3's split was not written to
hold. `specs/001` §5 anticipated exactly this gap by reserving auth as "its
own spec, because it also decides where `Recipient` PII is allowed to live" —
i.e., a spec that gets to change the state-management rules themselves, not
one that has to fit a login form inside them unchanged. This spec is not that
spec, and inventing a home for session state here would be making that larger
decision by accident, in the smallest possible unit.

### 2.4 The two specs already on record here are unusually explicit about this exact question

`specs/001` §5: "Revisit when `lib/api/real/` becomes real. At that point auth
is its own spec…" `specs/009` §5: "`/login` and `/forgot-password` remain
rejected exactly as `specs/001` left them; nothing here justifies building
either, since both are meaningless without a session that does not exist. If a
future spec wants `/login`, it needs its own argument, not an extension of
this one." Both were written with `/signup`'s successful narrowing already in
hand — `specs/009` reached its conclusion about `/login` *after* finding the
honest version of `/signup`, not before — so "try the same move again" is not
new information; it is the move `specs/009` already tried and reported back on
in its own text.

## 3. Decision

`/login` is not built. No new route, no new component, no new `ApiClient`
method. This spec exists to make that a resolved answer, backed by the current
state of the mock adapter and the current Next.js authentication model rather
than a re-citation of `specs/001`, closing the question `specs/009` left open
on purpose.

The distinction that decides it: `specs/009` found a version of "signup" whose
only job is to *hand something out* (a workspace, unconditionally, to whoever
asks). There is no equivalent version of "login" whose only job is to hand
something out — asking "who is asking" and then handing them the same
`/dashboard` a signup would is not a login, it is a second signup with
different label text, and shipping it as `/login` would misrepresent what it
does to a real visitor who reads "log in" as "I already have an account here."
`docs/screens.md`'s own dashboard-greeting deferral makes the same point from
the other direction: there is no `{name}` to greet a returning visitor with,
because nothing here remembers a first visit ever happened.

### 3.1 What `docs/design-system.md` contributes to this answer

The request asked specifically for a page "designed from `docs/design-system.md`."
That document was read in full for this spec and contributes nothing that
changes §2 — its component contracts (`Input`/`Label` per the `SignupForm`
precedent, a bone-white `--primary` pill submit, an inline `role="alert"`
`--danger` banner for the error state, `rounded-xs`–`rounded-md` on the dense
form card) already fully cover a login form's visual surface, the same way
they already covered `/signup`'s. Nothing here is a design gap. The blocker
is entirely in §2 — there is no account-and-session architecture for a login
form to sit in front of — and no amount of design work changes that, which is
worth stating plainly rather than leaving the design system looking like the
unaddressed half of the request.

## 4. Where this meets the constitution

**This does not conflict with any of the twelve non-negotiables directly** —
none of them mention authentication — **but it is in direct tension with the
literal request that produced this spec**, and per this process's own
instructions that tension is the paragraph that matters most here: the user
asked for a login page and this spec does not deliver one. §2 is the argument
for why building it now would reproduce the exact "non-functional theatre"
rule the product's own prior specs named, applied to a page whose entire
function — unlike `/signup`'s — is to perform a check that has nothing to
check against.

**Rule 3 is the rule this spec is closest to touching**, and §2.3 is why it is
not touched: giving a login form somewhere to put a "logged in" flag would be
extending rule 3's state split to a category it was not written for, which is
a decision `specs/001` §5 already named and reserved for its own spec.

**Rule 11 is adjacent, not engaged.** A real login form would collect a
credential, which `specs/009` §2.4 already established sits under the "same
discipline by extension" as `Recipient` PII. Since no form is being built,
nothing is collected, and the question does not arise here — noted so a future
spec building real auth inherits `specs/009`'s reasoning rather than
rediscovering it.

## 5. Rejected alternatives

**Build the traditional login screen — email + password, checked against the
mock adapter.** The literal reading of the request. Rejected on the strongest
version of the `specs/001` §5 argument available: not merely "this implies a
boundary nothing enforces," but "this checks a credential against a store that
does not exist," which §2.1 shows is true even inside the mock. A password
field that is compared to nothing is worse than `specs/009`'s already-rejected
plain password field, because it cannot even fail correctly — `shouldFail`
would have to simulate a wrong-password rejection with no right password on
record to be wrong about.

**Mirror `/signup`'s honest pattern exactly: a passwordless "continue with your
work email" form that mints a new mock response and redirects to `/dashboard`
unconditionally.** This is the most tempting alternative, because it is
literally the move that saved `/signup`, and it was seriously considered here.
It fails for the reason §3 gives: `/signup`'s honesty came specifically from
not implying a check happened. `/login`'s entire semantic content, to a real
visitor, *is* "I have been here before, look me up" — a page titled "Log in"
that silently performs the identical mint-and-redirect `/signup` performs
would not be honest, it would be a page that says "log in" while doing
"sign up" underneath, which is a subtler version of the theatre `specs/001`
named, not an escape from it. Rejected because the label is the misleading
part, not the missing password field.

**Fake a client-side session in `localStorage` and gate `/dashboard` behind
it, giving a login page something real to check.** `specs/009` §5 already
rejected this for `/signup`'s hypothetical gate, on the grounds that it builds
a second, parallel identity system with nothing to do with the eventual real
backend, and that `/projects`, `/campaigns` and every `/settings/*` route
would need to newly respect or newly ignore it. Rejected again here for the
same reason, now doubled: a `/login` page built this way would need that fake
session *and* a fake accounts list to check credentials against, both thrown
away the moment `lib/api/real/` exists — more throwaway architecture than
`specs/009` declined to build once, built here to answer a question `specs/001`
already assigned to "auth's own spec."

**Ship a "coming soon" `/login` stub — a page that exists at the route and
says sign-in isn't available yet, linking back to `/signup`.** Considered as a
middle path that gives the request *a* page without the theatre. Rejected
because nothing in the app links to `/login` today (verified: no reference to
it anywhere in `app/`, `components/`, or `lib/` outside this spec series) —
building a route with zero incoming links manufactures a destination before
anything has a reason to point at it, which is the same objection `specs/009`
§5 raised against wiring an entry point into the landing page ahead of a
decision about which of several shapes it should take. A URL that does not
exist already communicates "not built" correctly and for free; a stub page
saying the same thing in prose is a second way of saying it that has to be
maintained.

## 6. Consequences

- No new route, component, type, or `ApiClient` method. The tree is unchanged
  by this spec.
- `specs/001` §5 and `specs/009` §5's open question about `/login` is now
  answered rather than merely reserved — this file is that answer, and a
  future spec that wants to reopen it needs to argue against §2.1–§2.3
  specifically, not merely against `specs/001` as `specs/009` warned against
  and this spec avoided.
- The trigger for revisiting is sharper than `specs/001`'s "when `lib/api/real/`
  becomes real": specifically, when there is a persisted account store
  (`createAccount` writing somewhere `/login` could read from, mock or real)
  **and** a session strategy decided for this app (§2.2's cookie/DAL model or
  an equivalent), because §2.1 and §2.3 are what block this today, not the
  UI.
- **Not delivered, on purpose:** the literal ask — a working, styled `/login`
  page. Flagged here rather than shipped as theatre, per this process's
  instruction to surface a conflict with a prior decision rather than route
  around it.

## 7. Unverified, and open

- Whether the Next.js Authentication guide's file path
  (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) resolves
  at `nextjs.org/docs/app/guides/authentication` for this exact installed
  version was inferred from the same `01-app/02-guides/` → `/docs/app/guides/`
  mapping `specs/002` and `specs/003` already rely on for other guides in this
  series, not independently re-fetched against the live site for this file.
- Whether a future real backend would even keep `/login` and `/signup` as
  separate routes, versus one combined "continue" screen that branches after
  a lookup, is left open deliberately — that is a product decision for
  whichever spec eventually designs the real session, not a question this
  spec's research could settle from the frontend alone.
