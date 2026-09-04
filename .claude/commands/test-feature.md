---
description: Write Vitest + React Testing Library tests for a feature, run them, and report what is covered and what cannot be.
argument-hint: "[feature-or-path]"
disable-model-invocation: true
allowed-tools: Bash Read Write Edit Glob Grep WebSearch WebFetch
---

## Your task

Start by checking what exists: `ls package.json vitest.config.mts vitest.config.ts`.

Write and run tests for: **$ARGUMENTS**

### 1. If there is no test setup

The listing above tells you. This repo is documentation-first and may still have
no `package.json`. Say so and stop rather than scaffolding a whole toolchain
uninvited — bootstrapping the test stack is its own decision and belongs in a
spec first.

If setup exists but is incomplete, note the gap and continue with what works.

### 2. Delegate the writing

Use the **test-writer** subagent. It already carries this project's testing
rules: colocated `*.test.tsx`, role-based queries, the `api` seam and its
`FAIL_` / `?mockFail=` hooks instead of hand-rolled mocks, and fake timers
against the 2000ms polling interval.

Give it the feature and the relevant files. Do not restate its instructions.

### 3. Cover what actually matters

The point is not coverage percentage. Aim tests at the twelve non-negotiables in
`CLAUDE.md`, because those are the things that will silently regress:

- if the feature touches Review or `sendPackage` → **rule 2**, nothing sends
  itself. This test outranks everything else in the suite.
- if it renders AI output → **rule 4**, it is a real editable control.
- if it calls a long-running AI operation → **rule 5**, determinate progress and
  a recoverable failure.
- if it is async at all → **rule 9**, all four states, and no bare `null`.
- if it is a workflow step → **rule 1**, the control count has not crept up.
- if it touches `Recipient` → **rule 11**, nothing reaches a URL or a log.

### 4. Run them

```bash
npx vitest run
```

Never `npm run test` and never bare `vitest` — Next.js ships the script as bare
`vitest`, which **watches by default and will not exit**. Run `npm run typecheck`
too; a type error usually explains a pile of downstream failures.

For diagnosing anything that fails, use the **test-runner** subagent.

### 5. Report

- what is covered, and which rule each test pins down
- what you could **not** test and why — async Server Components are unsupported
  by Vitest and belong in E2E, so name them as a gap rather than pretending
- any product bug the tests exposed

If a test only passes because you bent it around a bug, say so. Do not fix
product code to make a test green; report it and let the author decide.