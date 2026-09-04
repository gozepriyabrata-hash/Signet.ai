---
Spec:        001
Title:       Route map and page inventory
Status:      accepted
Created:     2026-09-01
Supersedes:  —
---

# 001 · Route map and page inventory

Defines every route the app ships in v1, the two-root-layout structure that a
public landing page forces, and the sidebar destinations that were resolved away
rather than built.

## 1. Problem

`docs/screens.md` originally specced 16 pages: dashboard, six workflow steps,
nine settings sections. Two gaps:

1. **No public entry point.** Nothing explained the product to someone who had
   not already been given a link to the workspace.
2. **Seven dead sidebar links.** The app-shell sketch lists Projects, Reports,
   Videos, Templates, Recipients, Campaigns and Analytics. None had a spec, a
   folder or a route. Review's success state links to "View in Campaigns",
   which resolved to nothing.

## 2. The constraint that shapes everything

A landing page cannot simply be added at `/`.

Next.js route groups do not affect the URL. `app/(marketing)/page.tsx` and
`app/(dashboard)/page.tsx` therefore **both resolve to `/`**, which is a build
error, not a warning:

> Routes in different groups should not resolve to the same URL path. For
> example, `(marketing)/about/page.js` and `(shop)/about/page.js` would both
> resolve to `/about` and cause an error.
> — [Next.js · Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) (v16.3.4)

Observed in the wild as
`You cannot have two parallel pages that resolve to the same path`
([vercel/next.js#58449](https://github.com/vercel/next.js/issues/58449)).

### Resolution — multiple root layouts

Two route groups, each owning a root layout, and **no top-level
`app/layout.tsx`**. Two documented caveats apply, and both happen to suit us:

- With no top-level layout, the home route must be defined inside a group.
  → `(marketing)` owns `/`, and **the dashboard moves to `/dashboard`.**
- Navigating between two root layouts triggers a **full page load.** At the
  marketing → workspace boundary this is desirable: the shells share no chrome,
  and it guarantees no marketing CSS or client JS leaks into the workspace.

## 3. Route map

### `(marketing)` — public shell · 1 page

| # | Route | Notes |
|---|---|---|
| 1 | `/` | Landing. Static Server Component. Pricing, Security and How-it-works are in-page anchors, not routes. Spec in `docs/screens.md`. |and design from `docs/design-system.md` .

### `(app)` — workspace shell · 20 pages + 2 redirects

**Core · 6**

| # | Route | Notes |
|---|---|---|
| 2 | `/dashboard` | Moved from `/`. Behaviour unchanged. |
| 3 | `/projects` | **New.** The dashboard shows only *recent* projects; the sidebar needs a real list. |
| — | `/projects/[id]` | **Redirect only.** Resolves `ProjectStatus` → resume step. The target of the dashboard's "Open →". |
| 4 | `/campaigns` | **New.** Sent-package history. Closes the dead link in Review's success state. |
| 5 | `/campaigns/[id]` | **New.** One sent package. |
| 6 | `/analytics` | **New.** Reporting surface. Distinct from `/settings/analytics`, which is tracking *preferences*. |

**Workflow · 6** — base `/projects/[id]/`

| # | Route | Step |
|---|---|---|
| 7 | `…/report` | 1 · Upload + parse |
| 8 | `…/recipient` | 2 · Personalisation context |
| 9 | `…/analysis` | 3 · AI transparency |
| 10 | `…/video` | 4 · Video Studio |
| 11 | `…/email` | 5 · Composer + live preview |
| 12 | `…/review` | 6 · Approve & Send — **and** 7 · Send success state |

Seven steps, six pages. `docs/screens.md` defines Send as the confirmed state of
Review, not a route. Keeping it that way is what makes rule 2 enforceable:
there is no URL that means "sending", so no URL can trigger a send.

**Settings · 9**

| # | Route | | # | Route |
|---|---|---|---|---|
| 13 | `/settings/avatar` | | 18 | `/settings/recipients` |
| 14 | `/settings/voice` | | 19 | `/settings/analytics` |
| 15 | `/settings/video` | | 20 | `/settings/security` |
| 16 | `/settings/ai` | | 21 | `/settings/usage` |
| 17 | `/settings/email` | | — | `/settings` → redirect to `/settings/avatar` |

**Total: 21 renderable pages, 2 redirect-only route files.**

## 4. Rejected — sidebar items resolved rather than built

| Item | Decision | Reason |
|---|---|---|
| **Templates** | Dropped | Video templates, email templates and script styles already live under Settings. A `/templates` page creates a second configuration surface — a direct violation of rule 1 of `CLAUDE.md`. |
| **Recipients** | Links to `/settings/recipients` | `docs/screens.md` explicitly places saved recipients and segments there. A duplicate top-level page splits ownership of the same data. |
| **Reports** | Deferred | Every report is reachable through `Project.report`. A standalone library earns nothing in v1. |
| **Videos** | Deferred | As above, via `Project.video`. |

## 5. Rejected — auth

No `/login`, `/signup` or `/forgot-password` in v1. This repo is frontend-only
with a mock service layer; an auth screen would be non-functional theatre, and a
fake login is a worse first impression than none. The landing CTA goes directly
to `/dashboard`.

Revisit when `lib/api/real/` becomes real. At that point auth is its own spec,
because it also decides where `Recipient` PII is allowed to live.

## 6. Deferred — marketing pages

`/pricing`, `/security`, `/legal/privacy`, `/legal/terms`. All are in-page
anchors on the landing page for v1.

`/legal/privacy` stops being optional the moment the mock adapter is replaced:
the product ingests client reports and stores `Recipient` PII, which rule 11 of
`CLAUDE.md` already governs internally but nothing yet states publicly.

## 7. Consequences

- `docs/screens.md` gains a Landing spec; the app shell becomes
  `app/(app)/layout.tsx`; the dashboard becomes `app/(app)/dashboard/page.tsx`.
- `CLAUDE.md`'s folder structure reflects the `(marketing)` / `(app)` split.
- `components/marketing/` is added and **must never be imported by `(app)`** —
  that import is the first symptom of the workspace drifting toward looking like
  a landing page.
- The landing page is the one surface permitted to use `--accent` as brand
  rather than as an AI signal. It still draws only from `@theme` tokens: no new
  hexes, no glassmorphism, no neon. The exception is recorded in
  `docs/design-system.md`'s terms inside the Landing spec, and nowhere else.
