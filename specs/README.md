# Specs

`docs/` says what the product is. `specs/` says **why it is that way**.

A spec records a **decision and the alternatives that lost**. It is not a
tutorial, not an API reference and not a status report. If a file here is
explaining how a library works, it is the wrong document — that belongs in
`docs/`, or in a link.

## Convention

One file per decision, named `NNN-kebab-slug.md`, numbered from `001`.

**Numbers are never reused**, not even for a spec that was withdrawn before it
was implemented. A gap in the sequence is information; a recycled number is a
trap for anyone reading a commit message six months from now.

Every file opens with this frontmatter block:

```markdown
---
Spec:        002
Title:       A short noun phrase
Status:      draft
Created:     2026-09-01
Supersedes:  —
---
```

`Status` is one of:

| Status | Meaning |
|---|---|
| `draft` | Written, not yet agreed. Safe to argue with. |
| `accepted` | Agreed. Build to this. |
| `superseded` | Replaced. The replacement's number goes in this file's header, and the replacement names this one in its `Supersedes:` field. |
| `withdrawn` | Abandoned before implementation. Kept, because the reasoning is still worth reading. Its number stays retired. |

`Supersedes:` carries the number of the spec this one replaces, or `—`.

## Shape

Cover these five things, in this order:

1. **Problem** — what is actually broken or undecided. Concrete, not abstract.
2. **Constraints** — what the framework, the stack or `CLAUDE.md` forces on the
   answer. Quote and link the source whenever a constraint is external.
3. **Decision** — what we are doing, stated plainly.
4. **Rejected alternatives** — each with the reason it lost. **This is the
   section that makes the file worth keeping.** Without it a spec is a summary,
   and the same argument gets re-litigated next quarter.
5. **Consequences** — what changes in the tree, what breaks, what has to happen
   next.

Write prose, not bullet fragments, and write so the file reads without the
conversation that produced it. Cite primary sources inline as markdown links.
If a claim cannot be corroborated, either leave it out or say plainly that it
is unverified — a confidently wrong spec is worse than a thin one, because it
gets trusted later.

Hold every proposal against the fourteen non-negotiables in `CLAUDE.md`. If a
decision conflicts with one, that conflict is the most important paragraph in
the file. Surface it and say whether it is a genuine exception or a sign the
approach is wrong. Do not route around a rule quietly.

## Index

| # | Title | Status | Covers |
|---|---|---|---|
| [001](001-route-map.md) | Route map and page inventory | accepted | Every route in v1, the two-root-layout structure a public landing page forces, and the sidebar destinations resolved away rather than built. |
| [002](002-landing-page.md) | Landing page construction | accepted | How `/` is built on Next.js 16: static rendering enforced by `dynamic = 'error'`, one client component, no animation library, and the bounded accent exception. |
| [003](003-dashboard.md) | Dashboard and the workspace shell | accepted | The `(shell)` / `(focus)` layout split that lets the workflow escape the sidebar, where the providers live, why nothing here is prefetched on the server, and how two persisted preferences reach first paint. |
| [004](004-projects-list.md) | The projects list | accepted | Defines `/projects`, a screen `docs/screens.md` never specified: the status filter lives in the URL and the search box deliberately does not, and creating a project becomes a mutation rather than a route. |
| [005](005-campaigns.md) | Campaigns — sent-package history | accepted | Defines `/campaigns` and `/campaigns/[id]`: a campaign is one sent package, this is the first screen allowed to render a recipient's name, and it has no Resend button because rule 2 says sending happens only from Review. |
| [006](006-analytics.md) | Analytics — the reporting surface | accepted | Defines `/analytics`: it reports on production rather than performance, carries no open or click rate because Apple's Mail Privacy Protection makes one unmeasurable, renders aggregates only, and ships hand-written SVG because rule 6 rules out a charting library's colour layer. |
| [007](007-workflow.md) | The workflow — seven steps, six routes | accepted | The golden path: Send is Review's confirmed state so no URL can trigger a send, `sendPackage` is never a Server Action because one is a public POST endpoint, draft edits persist instead of blocking navigation, and the stepper derives completion from data rather than history. |
| [008](008-settings.md) | Settings — where configuration lives | accepted | The nine `/settings/*` routes rule 1 has been deferring work to since spec 001: presets are archived rather than deleted so a sent package can still say what went out, `/settings` redirects temporarily rather than permanently, and the Content Security Policy two specs deferred here is deferred again — with a reason. |
| [009](009-signup.md) | Signup — a workspace-creation page, not a login | draft | Narrows spec 001 §5's rejection of auth screens: `/signup` collects name, work email and company and calls a mock `createAccount` mutation, with no password, no session and no gate on `/dashboard` — because that is the difference between this page and the "non-functional theatre" 001 correctly ruled out. Superseded in part by specs/011 (password field, real account store) and specs/012 (landing-page linkage); this file's addenda point to both. |
| [010](010-login.md) | Login — the argument specs/009 asked for, and why it still loses | superseded (011) | Answers a direct request for `/login`, on its own argument rather than a re-citation of 001: `createAccount` persists nothing anywhere, mock or real, so a login form has no account to check a credential against — a gap `/signup` never had, since minting a record needs nothing to already exist. Cites the Next.js Authentication guide's session/DAL model to show login is structurally paired with session state this repo does not have. No route, component or API method is added. Superseded once specs/011 built the precondition this file named for revisiting it. |
| [011](011-real-authentication.md) | Real authentication — accounts, sessions, and the working /login | draft | Builds specs/010 §6's precondition by direct instruction: a SQLite account store (Drizzle ORM) and a stateless `jose`-signed session cookie, following the Next.js Authentication guide's own model — `proxy.ts` for optimistic route protection, a `cookies()`-based DAL, Server Actions instead of `ApiClient` (whose global mock/real switch can't host a half-real method). Names its own conflict with `CLAUDE.md`'s "frontend only, no backend, no DB" up front. Reopens specs/009 §3.1's "no password" decision; supersedes specs/010. |
| [012](012-landing-nav-auth-links.md) | Landing page — wiring /login and /signup into the nav | draft | Answers specs/009 §3.6's deliberately-left-open question, now urgent because specs/011 gated `/dashboard`, making the stale "Open the workspace" CTA actively misleading. Retargets `primaryCta` to `/signup` ("Create a workspace"); adds `/login` as a quiet text link, never a second pill — design-system's "one per screen" forecloses that shape outright. Switches every same-root-layout CTA render from `<a>` to `next/link`. |
| [013](013-privacy-policy.md) | Privacy policy — publishing on the trigger specs/001 §6 named | draft | `/legal/privacy` ships because specs/011 fired the exact trigger specs/001 §6 set: real account PII now persists server-side. Every claim on the page is sourced from this codebase's actual behaviour rather than boilerplate, and the page names its own limits — no legal review, no self-serve deletion yet — instead of implying either exists. `/legal/terms` stays deferred; nothing here needs one yet. |
| [014](014-forgot-password.md) | Forgot password — a dev-mode reset flow, honestly labelled | draft | A real password (specs/011) needed a recovery path. Hits the same missing-email-infrastructure wall specs/011 §5 named for passwordless login; resolved by handing the reset link back in the response instead of emailing it, never gated by `NODE_ENV`, and rendered behind an explicit "Dev mode" label rather than disguised. Single-use, database-backed, SHA-256-hashed tokens — not a signed JWT, because revocability is the one property this token needs that a session doesn't. Names its own gaps: no real email yet, no session invalidation on reset, shares specs/011's open rate-limiting question. |
