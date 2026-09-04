# AI Communication Platform — Frontend

Turns an uploaded client report into a **ready-to-send package**: a personalised
AI-avatar video + a personalised email + a CTA + the original report attached.
A human reviews and approves every package before it is sent. Nothing sends itself.

This repo is **frontend only**. No backend, no DB, no real AI-vendor calls —
the UI talks to a typed service layer (`lib/api/`) that is mock-backed today.
The one exception is account/session auth (specs/011): `lib/auth/` and one
SQLite table are real, not mocked. Nowhere else does this apply.

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
| Motion | Framer Motion |
| Client state | Zustand |
| Server state | TanStack Query |
| Forms | react-hook-form + zod |
| Auth | Drizzle ORM + SQLite, Server Actions, `jose`-signed session cookie (specs/011) |

## Commands

```bash
npm run dev        # Turbopack is default — do NOT pass --turbo
npm run build
npm run lint
npm run typecheck  # tsc --noEmit
```

## Folder structure

```
app/
  fonts.ts             ← the one next/font instance; both root layouts import it
  globals.css          ← Tailwind v4 @theme tokens live here
  (marketing)/         ← public shell, own root layout
    layout.tsx  page.tsx        ← the landing page owns /
    _content.ts                 ← typed marketing copy, logos, FAQ
    opengraph-image.tsx
  (app)/               ← workspace, own root layout
    layout.tsx                  ← html, body, fonts, providers. NO chrome.
    providers.tsx               ← "use client": TanStack Query + theme
    (shell)/                    ← navbar + collapsible sidebar
      layout.tsx
      dashboard/page.tsx
      projects/page.tsx
      campaigns/  analytics/
      settings/{avatar,voice,video,ai,email,recipients,analytics,security,usage}/
    (focus)/                    ← the workflow. No sidebar, by construction.
      layout.tsx
      projects/[id]/
        page.tsx                ← redirects to the resume step
        report/  recipient/  analysis/  video/  email/  review/
  robots.ts  sitemap.ts  icon.tsx
components/
  ui/                  ← shadcn primitives (vendored, editable)
  workflow/            ← WorkflowStepper, StepShell, JobProgressCard, AIEditableField
  marketing/           ← landing sections; never imported by (app)
  shell/               ← Navbar, Sidebar, ThemeToggle
  dashboard/  projects/  settings/  shared/
lib/
  api/{index.ts, types.ts, mock/, real/}
  query-client.ts      ← per-request on the server, singleton in the browser
  query-keys.ts        ← the `qk` factory
  site.ts  utils.ts
stores/                ← Zustand slices (workflow draft, UI prefs)
hooks/                 ← use-job-polling.ts, use-projects.ts, etc.
types/                 ← domain.ts, marketing.ts, re-exported from index.ts
test/                  ← render helpers shared by *.test.tsx
docs/  specs/
```

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
   preset defined under `app/settings/`. This rule is what keeps the product a
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

## Deeper docs — read when relevant

- `docs/design-system.md` — colour tokens, type scale, motion, component
  contracts. Read before building or restyling any component.
- `docs/screens.md` — per-screen specs for the shell, dashboard, all 7 workflow
  steps and settings. Read before building a screen.
- `docs/data-model.md` — domain types, the `lib/api` seam, mock adapters and
  job-polling rules. Read before touching data flow.
- `specs/` — numbered implementation specs: what we are building next, why, and
  what was ruled out. Read `specs/README.md` for the convention, and the
  relevant spec before starting a unit of work. `docs/` says what the product
  is; `specs/` says why it is that way.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
