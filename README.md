# Signet.ai — Personal Report Video Emails

Turns an uploaded client report into a **ready-to-send package**: a personalised
AI-avatar video, a personalised email, one clear next step, and the original
report attached. A human reviews and approves every package before it is sent.
Nothing sends itself.

```
Report → Recipient → Analysis → Video → Email → Review → Send
```

## Scope

The source PRD — *AI Creator Operating System* — describes three products: a
clip flow (long video into short vertical clips), a faceless-video flow (a text
idea into a finished video), and this one, which the PRD itself calls its
**Feature in Focus**.

**Only the third is in this repo.** There is no clip pipeline and no
idea-to-video pipeline here — not a route, not a type, not a stub.
`docs/prd-alignment.md` maps every PRD requirement to where it landed, including
the ones that landed nowhere.

This is a **frontend**. The UI talks to a typed service layer (`lib/api/`) that
is mock-backed, so every screen is fully clickable with no backend running. The
one exception is accounts and sessions, which are real.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then set SESSION_SECRET
npm run db:migrate                 # creates ./data/app.db for accounts
npm run dev
```

| Command | |
|---|---|
| `npm run dev` | Turbopack is the default bundler — do **not** pass `--turbo` |
| `npm run build` | |
| `npm run lint` | Also enforces the send-path rules in `eslint.config.mjs` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |

## Where to read next

Start with `CLAUDE.md` — the stack, the folder map and the fourteen
non-negotiable rules. Then:

| File | |
|---|---|
| `docs/prd-alignment.md` | The PRD, and where each of its asks landed |
| `docs/screens.md` | Per-screen specs — every route in the app |
| `docs/data-model.md` | Domain types, the `lib/api` seam, the auth schema |
| `docs/design-system.md` | Tokens, type scale, motion, component contracts |
| `specs/` | Numbered decisions, and the alternatives that lost |

`docs/` says what the product is. `specs/` says why it is that way.
