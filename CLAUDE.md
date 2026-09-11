# Signet.ai — Personal Report Video Emails

Turns an uploaded client report into a **ready-to-send package**: a personalised
AI-avatar video + a personalised email + a CTA + the original report attached.
A human reviews and approves every package before it is sent. Nothing sends itself.

**This repo is one of the three products the PRD describes**, and it is the one
the PRD itself calls the "Feature in Focus". The clip flow (long video → short
vertical clips) and the faceless-video flow (text idea → finished video) are
**not here** — no route, no type, no seam method reserves space for them. Read
`docs/prd-alignment.md` before concluding that something is missing; most
apparent gaps are decisions, and that file says which ones are not.

This repo is **frontend only**. No backend, no DB, no real AI-vendor calls —
the UI talks to a typed service layer (`lib/api/`) that is mock-backed today.
The one exception is account/session auth (specs/011, specs/014): `lib/auth/`
and two SQLite tables are real, not mocked. Nowhere else does this apply.

## The golden path

```
Report → Recipient → Analysis → Video → Email → Review → Send
```

**This 7-step workflow is the product.** The dashboard, settings and analytics are
supporting cast. When a change could go either in the workflow or in settings,
it goes in settings.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.x, App Router (Turbopack is the default bundler) |
| Runtime | React 19.2 |
| Language | TypeScript, `strict: true` |
| Styling | Tailwind CSS v4 — CSS-first `@theme`, OKLCH, **no `tailwind.config.js`** |
| Components | shadcn/ui, CSS-variables mode, vendored into `components/ui/` |
| Motion | **CSS only. No motion library is installed** — see below |
| Client state | Zustand |
| Server state | TanStack Query |
| Forms | react-hook-form + zod |
| Auth | Drizzle ORM + libsql (SQLite file in dev, Turso in prod), Server Actions, `jose`-signed session cookie (specs/011) |
| Testing | Vitest + React Testing Library + jsdom, `vitest.config.mts` |

**Motion is the one row that used to lie.** `docs/design-system.md` §4 specifies
the timings in Framer Motion's vocabulary, and Framer Motion is deliberately
**not a dependency** (`specs/002` §3.6). The one shared signature animation —
the generation pulse — is a `@keyframes` block in `app/globals.css`, because it
animates `transform` and `opacity` only and therefore needs no library. Write
new motion the same way. If a future interaction genuinely needs orchestration a
keyframe cannot express, that is a spec, not an `npm install`.

## Commands

```bash
npm run dev          # Turbopack is default — do NOT pass --turbo
npm run build
npm run lint         # also enforces rule 2 — see below
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run db:generate  # drizzle-kit generate — auth schema only
npm run db:migrate   # drizzle-kit migrate
```

`SESSION_SECRET` is required for anything under `lib/auth/` to work. Copy
`.env.local.example` to `.env.local` and fill it in; everything else in that
file is optional in dev.

**`npm run lint` is not only style.** `eslint.config.mjs` carries four
`no-restricted-syntax` blocks that make `sendPackage` unreachable outside the
Review step, and a `no-restricted-imports` block that stops `(app)` importing
`components/marketing/`. A rule enforced by a config outlives a rule enforced by
memory.

## Folder structure

```
app/
  fonts.ts             ← the one next/font instance; both root layouts import it
  globals.css          ← Tailwind v4 @theme tokens + the generation-pulse keyframe
  (marketing)/         ← public shell, own root layout
    layout.tsx  page.tsx        ← the landing page owns /
    _content.ts                 ← typed marketing copy, logos, FAQ
    signup/  login/                     ← real auth (specs/009, 011)
    forgot-password/  reset-password/   ← dev-mode reset flow (specs/014)
    legal/privacy/                      ← specs/013
    opengraph-image.tsx
  (app)/               ← workspace, own root layout
    layout.tsx                  ← html, body, fonts, providers, pre-paint sidebar script
    providers.tsx               ← "use client": TanStack Query + theme
    (shell)/                    ← navbar + collapsible sidebar
      layout.tsx
      dashboard/page.tsx
      projects/page.tsx
      campaigns/page.tsx  campaigns/[id]/page.tsx
      analytics/page.tsx
      settings/layout.tsx
      settings/{avatar,voice,video,ai,email,recipients,analytics,security,usage}/
    (focus)/                    ← the workflow. No sidebar, by construction.
      layout.tsx
      projects/[id]/
        page.tsx                ← redirects to the resume step
        report/  recipient/  analysis/  video/  email/  review/
  robots.ts  sitemap.ts  icon.tsx
components/
  ui/                  ← shadcn primitives (vendored, editable)
  workflow/            ← WorkflowStepper, StepShell, JobProgressCard, AIEditableField,
                         WorkflowChrome, ProjectResumeRedirect, steps/*
  marketing/           ← landing sections + the four auth forms; never imported by (app)
  shell/               ← Navbar, Sidebar, SidebarToggle, ThemeToggle, SignOutButton
  settings/            ← PresetList/Row/Dialog, UploadPanel, the nine sections
  analytics/           ← hand-written SVG charts; no charting library (rule 6)
  campaigns/  dashboard/  projects/  shared/
lib/
  api/{index.ts, types.ts, errors.ts, mock/, real/}
  auth/                ← ALWAYS REAL: actions, session, dal, password, tokens, route-guard
  db/                  ← schema.ts (accounts, passwordResetTokens), client.ts
  workflow.ts          ← step order + the resume rule; pure, tested on its own
  query-client.ts      ← per-request on the server, singleton in the browser
  query-keys.ts        ← the `qk` factory
  site.ts  utils.ts
stores/                ← Zustand slices (workflow draft, UI prefs)
hooks/                 ← use-job-polling, use-project(s), use-presets, use-recipients,
                         use-packages, use-analytics, use-settings, use-stats,
                         use-debounced-value
types/                 ← domain.ts, marketing.ts, re-exported from index.ts
test/                  ← render helpers, cookie jar, in-memory DB for *.test.tsx
drizzle/               ← generated migrations for the auth schema
data/                  ← the local SQLite file. GITIGNORED — never commit it.
proxy.ts               ← optimistic route protection. Next 16's renamed middleware.
docs/  specs/
```

**Files at the root that are load-bearing.** `proxy.ts` is Next 16's rename of
`middleware.ts` — deprecated, not aliased — and is the only route-protection
layer today (`specs/011` §2.5). `eslint.config.mjs` enforces rule 2. `next.config.ts`
holds the `/settings` → `/settings/avatar` redirect in config rather than in a
`page.tsx`, so it is not a file anyone can later add a side effect to.
`vitest.config.mts` resolves `@/` explicitly rather than reading tsconfig paths,
which otherwise makes every worker time out once `.next` grows.

**Why `(app)` has two nested groups.** The app shell cannot both live in the
workspace root layout and be absent from the workflow — everything under `(app)`
would inherit it, and hiding the sidebar conditionally would make the whole
shell a Client Component. `(shell)` and `(focus)` are not root layouts, so
navigating between them is still a client-side transition. See `specs/003`.

## Non-negotiable rules

1. **Config belongs in Settings, not the workflow.** The requirements list ~39
   configurable items (avatars, voices, voice cloning, video templates, formats,
   script styles, branding, guardrails, CTAs, signatures, segments…). A workflow
   step exposes **at most 3–5 controls**; everything else reads from a saved
   preset defined under `app/(app)/(shell)/settings/`. This rule is what keeps the product a
   premium AI workspace instead of a settings form with a stepper on top.

   **And the mirror, which is what stops the traffic flowing both ways:** a
   settings screen may not contain a control that belongs to a single project.
   If a control's value would differ between two projects, it is a workflow
   control and this rule does not apply to it. Without that clause, "config
   belongs in Settings" degrades into "anything awkward belongs in Settings",
   and a per-project override arrives in Settings wearing a preset's clothes
   (`specs/008-settings.md` §3.9).

2. **Never auto-send.** `sendPackage` is reachable only from the Review screen,
   and only after an explicit approval interaction. No send on mount, no send in
   an effect, no "send" as a side effect of another action.

3. **State split is fixed.** Server state (projects, reports, jobs, presets) →
   TanStack Query. Wizard step, draft edits, UI preferences → Zustand.
   Never fetch inside a Zustand store. Never keep the step index in Query cache.

4. **All AI output is editable.** Summary, key insights, talking points, script,
   subject, body, CTA — render every one into a real form field with a
   regenerate affordance. Never present AI output as read-only prose.

5. **Generation is a job, not a spinner.** Every AI call that takes more than a
   second returns a `Job` with `queued | running | succeeded | failed` and a
   numeric progress. Render real progress and a stage label. Failures are
   recoverable in place with a Retry — never a dead end or a full-page error.

6. **Tailwind v4 only.** Tokens live in `app/globals.css` under `@theme`.
   Do **not** create `tailwind.config.js`. Never hardcode a hex or an arbitrary
   value like `bg-[#242424]` — use a semantic token.

7. **Do not wrap shadcn.** Primitives in `components/ui/` are ours to edit
   directly. Do not add a second abstraction layer over them.

8. **Server Components by default.** Add `"use client"` only where there is
   interactivity, and push it to the leaf that needs it.

9. **Four states, always.** Every async surface ships loading (skeleton), empty,
   error, and success. Never return bare `null` for a not-yet-loaded state.

10. **Accessibility floor.** Keyboard-navigable stepper, visible focus rings,
    `aria-live="polite"` on job status, every input labelled, 4.5:1 contrast.
    Respect `prefers-reduced-motion`.

11. **Recipient data is client PII.** Never log it, never place it in a URL query
    string, never send it to a third party the user did not configure.

12. **Validate uploads client-side** — PDF/DOCX only, size-capped — before the
    file reaches the service layer.

13. **Disclose the AI; record the consent.** Two obligations from the PRD, not
    preferences. **(a)** The recipient is told the video was made with AI — a
    stated PRD product principle. (An earlier PRD draft also anchored this to
    a US-020 acceptance criterion; the current draft drops US-020 as a
    numbered story, so the principle is the only citation now — see
    `docs/prd-alignment.md` §2.) It is part of what is sent, so it may not be
    a setting anyone can switch off; a disclosure a sender can disable is not
    a disclosure. **(b)** A face or a
    voice is only cloned against recorded permission. Half of (b) exists:
    `VoiceSettings` asks who is in the recording before a clone, because someone
    who cannot say whose voice it is should not be cloning it. **(a) does not
    exist at all** — no field in `EmailDraft`, nothing in the preview, nothing in
    the Review checklist. It is the largest gap between the PRD and this build.
    Do not close it with a toggle. See `docs/prd-alignment.md` §7.

14. **Every generated claim traces back to the report.** "Show where it came
    from" and "make no claim from a report that the report does not support" are
    both PRD principles, and the second is unenforceable without the first.
    Today `Analysis` carries a summary, insights and talking points that
    reference no page, section or quotation in the source `Report`, so a
    reviewer cannot check a generated sentence without opening the PDF —
    the work the product exists to remove. When provenance lands it belongs in
    the domain types, not in the prompt: a citation the UI cannot render is not
    a citation.

**Rules 13 and 14 describe obligations, not shipped behaviour.** They are stated
as rules because they constrain what may be built next, and because writing them
as a "nice to have" is how they never get built. **Rules 1–12 keep their numbers
and their meanings** — every existing citation of them, in `specs/`, in the
agent definitions and in the lint messages, is still exactly correct. A spec
written before this section was added that says "the twelve non-negotiables"
(`specs/010` §4) is recording what was true when it was written, and is left
alone for the same reason spec numbers are never reused.

## Conventions

- Components `PascalCase.tsx`; hooks `use-thing.ts`; stores `thing-store.ts`.
- Shared types in `types/`, imported via `@/types`. No `any`; no non-null `!`.
- Server actions suffixed `Action` (`revalidatePresetsAction`). **Never for
  `sendPackage`** — a Server Action compiles to a POST endpoint reachable
  without rendering the page that offers it, so it would reduce rule 2 to a
  statement about which screen has a button (`specs/007-workflow.md` §3.2).
- Tests colocated as `*.test.tsx`.
- Query keys: `['project', id]`, `['job', jobId]`, `['presets', kind]`.
- Imports use the `@/` alias, never deep relative chains.

**Imports and the seam:**

- Components import `api` from `@/lib/api`. **Never a mock module directly**, and
  never `lib/api/real` directly either. That singleton is the whole swap.
- Nothing outside `hooks/use-job-polling.ts` calls `api.getJob`.
- `lib/auth/` is not reachable through `api`. It is Server Actions, called from
  `useActionState`, because `lib/api/index.ts`'s mock/real switch is global and a
  half-real method there would break every other screen (`specs/011` §2.4).
- `lib/db/client.ts` and every module under `lib/auth/` that touches it carry
  `import "server-only"`. Keep it that way.

## Deeper docs — read when relevant

- `docs/prd-alignment.md` — **the PRD, and where each of its asks landed.** The
  three products the PRD describes and which one this is, all eighteen user
  stories, the state map, the eight setup areas against the nine Settings
  routes, and an honest list of what is not built. Read it before claiming a
  gap, and before starting anything that sounds like it might already have been
  decided against.
- `docs/design-system.md` — colour tokens, type scale, motion, component
  contracts. Read before building or restyling any component.
- `docs/screens.md` — per-screen specs for the marketing and auth pages, the
  shell, dashboard, campaigns, analytics, all 7 workflow steps and all 9
  settings sections. Read before building a screen.
- `docs/data-model.md` — domain types, the `lib/api` seam, the auth schema, mock
  adapter rules and job-polling rules. Read before touching data flow.
- `specs/` — numbered implementation specs: what we are building next, why, and
  what was ruled out. Read `specs/README.md` for the convention, and the
  relevant spec before starting a unit of work. `docs/` says what the product
  is; `specs/` says why it is that way.

**Which file to change when you learn something.** A decision and its rejected
alternatives go in a new numbered `specs/` file. A durable fact about the
product — a type, a screen contract, a token — goes in `docs/`. A rule that
constrains every future change goes here. Putting a decision in `docs/` loses
the argument that produced it, which is the failure `specs/README.md` exists to
prevent.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
