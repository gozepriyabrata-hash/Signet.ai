---
Spec:        014
Title:       Forgot password — a dev-mode reset flow, honestly labelled
Status:      draft
Created:     2026-09-03
Supersedes:  —
---

# 014 · Forgot password — a dev-mode reset flow, honestly labelled

Closes a gap named directly during a project audit: a real account with a
real password (`specs/011`) had no recovery path if that password was
forgotten. `specs/001` §5 and `specs/009` §5 both deferred
`/forgot-password` back when there was no real password to forget; there is
one now.

## 1. Problem

`loginAction` (`specs/011`) will reject a wrong password forever — there is
no route, screen or mechanism anywhere in this app for a user to prove
identity by any means other than the password they already have. That is a
dead end, not a security feature.

The obvious mechanism — email a reset link — hits the same wall
`specs/011` §5 named and worked around for a passwordless-login alternative:
this repo has no outbound email capability. That spec rejected building one
just to avoid a password field on `/signup`. This spec cannot avoid the
question the same way, because "forgot password" has no version that doesn't
involve proving control of *something* outside the password itself, and the
standard proof mechanism is exactly the missing piece.

## 2. Constraints

### 2.1 The delivery mechanism is a real product decision, not an implementation detail

Two live options were in front of this decision: build a real transactional
email integration (a new external dependency, an account only the product
owner can provision, real deliverability configuration), or hand the reset
link back directly in the response instead of emailing it. These are not
close in cost, and picking wrong wastes the provisioning step or the
engineering step. The product owner chose the second, explicitly informed
that it is not how this would work in production.

### 2.2 A token has to be revocable, which rules out a bare signed token

`lib/auth/session.ts`'s session cookie is a stateless `jose`-signed token —
correct there because a session's only job is "prove you are still logged
in," and Next's own guide uses the same stateless pattern (`specs/011` §2.2).
A password-reset token's job is different: it has to stop working the
instant it is used, and a self-verifying signed token cannot do that without
a database record checked on every use anyway — at which point the signing is
pure overhead. An opaque, database-backed token is the simpler mechanism for
what this token actually needs to do.

### 2.3 `accounts.passwordHash`'s reasoning extends to the token itself

The password is never stored in a form that a database read alone can use to
authenticate (`lib/auth/password.ts`, `specs/011` §3.3). A reset token that
authorizes a password change is the same kind of secret, so it gets the same
treatment: only a SHA-256 hash of it is ever stored (`lib/auth/tokens.ts`).
`scrypt`, not SHA-256, for the password itself — the token is already
high-entropy random data, not a human-memorable secret an attacker could
guess and needs slowing down against; SHA-256 is the right tool for
verifying possession of a token, not for password storage.

### 2.4 Account enumeration — the same discipline `loginAction` uses, with one honest exception named

`loginAction` gives an identical response whether an email doesn't exist or
the password was wrong (`specs/011` §6), so a visitor cannot learn which
emails have accounts. `forgotPasswordAction` follows the same rule at the
response-shape level — `{ submitted: true }` either way. But §2.1's chosen
delivery mechanism means the *dev-mode reset link* is only present when an
account was actually found, which does leak existence to whoever is looking
at the response — not from the shared message, but from the presence of a
usable link. This is stated here rather than left for someone to discover:
it is a direct consequence of not having real email delivery, and it
disappears the moment §6's real-email upgrade ships, since production would
never render the token into the response at all.

## 3. Decision

### 3.1 New table: `password_reset_tokens`

`lib/db/schema.ts`. Primary key is the SHA-256 hash of the token (§2.3), not
an id column — the row's existence *is* the token's validity, so there is no
reason to look it up by anything else. `accountId`, `expiresAt`, `createdAt`.
No `used` flag: a consumed or superseded token is deleted outright (§3.4),
so its absence from the table already answers "is this valid."

### 3.2 Tokens: 32 random bytes, 30-minute expiry, single-use

`lib/auth/tokens.ts`: `generateResetToken()` (`crypto.randomBytes(32)`,
base64url — goes in the link) and `hashResetToken()` (SHA-256 — goes in the
database). 30 minutes balances "long enough to actually receive and click a
dev-mode link during testing" against "short enough that a stale token in
a screenshot or a log isn't useful later."

### 3.3 `forgotPasswordAction` and `resetPasswordAction`, in `lib/auth/actions.ts`

Same file as `signupAction`/`loginAction`/`logoutAction` — same reasoning
for why these are Server Actions and not `ApiClient` methods
(`specs/011` §2.4, §3.5) applies unchanged; nothing about password reset
makes that argument different.

- `forgotPasswordAction`: validates the email, looks up the account, and —
  only if found — deletes any of that account's existing tokens (§3.4) and
  issues a new one. Always returns `{ submitted: true }`, plus
  `devResetLink` when an account existed (§2.4).
- `resetPasswordAction`: takes the token as a **bound first argument** via
  `.bind(null, token)` in `ResetPasswordForm` — the documented way to pass
  data into a `useActionState` action that is not itself a form field —
  rather than a hidden `<input>`, which would let a submitted form's value
  disagree with the URL it came from for no reason. Looks up the hash,
  checks expiry, and on success hashes the new password, deletes every
  token for that account (§3.4), and calls `createSession` — a successful
  reset signs you in, the same unconditional-success pattern `specs/011`
  §3.5's `signupAction`/`loginAction` already use, since proving control of
  the token is equivalent trust to a password.

### 3.4 A new request invalidates the old one; a use invalidates everything

`forgotPasswordAction` deletes all of an account's existing tokens before
issuing a new one — only the most recent link works. `resetPasswordAction`
deletes all of an account's tokens on success, not just the one used —
closes the (already narrow) window where a second outstanding link could
still work after a password was already changed.

### 3.5 The dev-mode link is never gated by `NODE_ENV`

Per §2.1 this is the delivery mechanism, not a fallback. Gating it behind
`NODE_ENV !== "production"` would make the feature silently do nothing the
moment someone deployed this with `NODE_ENV=production` set (the Next.js
default for `next build`/`next start`) and no real email integration yet —
worse than the current honest state, because a broken invisible feature is
harder to notice than an obviously-labelled dev one. `ForgotPasswordForm`
renders it inside a clearly marked "Dev mode: no email sending yet" block,
the UI-level version of `lib/api/real/index.ts`'s loud `notImplemented()`
stubs (`specs/011` §2.4) for the same underlying reason: surface the gap,
don't paper over it.

### 3.6 No password reset invalidates other active sessions

A named, accepted gap, not an oversight: sessions are stateless
(`specs/011` §3.2), so there is no server-side list of "this account's
active sessions" to revoke. Adding one (a session version number checked on
every request, or moving to database-backed sessions) is a larger change to
`lib/auth/session.ts`'s core design than this spec's scope, and is named
here so it is not silently assumed to be handled.

## 4. Where this meets the constitution

**Rule 11 is engaged the same way `specs/011` §4 engaged it for the password
hash**: the reset token gets the same never-store-the-secret-itself
treatment (§2.3), for the same reason.

**No other rule changes.** This is two new Server Actions and one new table
inside the already-established `lib/auth/` exception to CLAUDE.md's
"frontend only" premise (`specs/011` §2.1) — it does not widen that
exception, it uses it.

## 5. Rejected alternatives

**Add a real transactional email provider now.** The option not chosen —
see §2.1. Rejected for this pass because it requires the product owner to
provision an external account and hand over a secret before any of the rest
of this spec could be verified end-to-end; the dev-mode link ships a
complete, testable flow today and the email step is a swap-in later, not a
prerequisite.

**A stateless, `jose`-signed reset token, matching the session cookie's
mechanism.** Considered for consistency with `lib/auth/session.ts`.
Rejected per §2.2 — revocability is the one property a reset token actually
needs that a session token does not, and a signed-only token cannot provide
it without the same database lookup this spec already needs, making the
signing redundant complexity rather than a simplification.

**No expiry, or a much longer one (e.g. 24 hours).** Rejected: this token
authorizes a password change with no second factor, so a shorter window is
strictly safer, and 30 minutes is generous for a flow that, in dev mode, is
used within seconds of being generated.

**Auto-detect `NODE_ENV` and hide `devResetLink` in "production."**
Considered directly. Rejected per §3.5 — it trades a visible, honestly
labelled gap for an invisible broken feature, which is a worse failure mode
for whoever eventually deploys this without having read this spec first.

## 6. Consequences

- New: `lib/db/schema.ts`'s `passwordResetTokens` table (migration
  `drizzle/0001_*.sql`), `lib/auth/tokens.ts`, `forgotPasswordAction` and
  `resetPasswordAction` in `lib/auth/actions.ts`.
- New routes: `app/(marketing)/forgot-password/page.tsx` +
  `components/marketing/ForgotPasswordForm.tsx`;
  `app/(marketing)/reset-password/page.tsx` +
  `components/marketing/ResetPasswordForm.tsx`.
- `LoginForm.tsx` gains a "Forgot your password?" link.
- **Open, deliberately:** real email delivery (§5's first rejected
  alternative) and session invalidation on reset (§3.6) — both named, both
  out of this spec's scope, neither silently assumed.
- **Open, deliberately, shared with `specs/011`:** no rate limiting on
  `forgotPasswordAction` or `loginAction`. Adding it to one and not the
  other would be inconsistent protection; both are named together as the
  same still-open gap rather than closed one at a time.
