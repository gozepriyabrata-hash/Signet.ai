---
description: Review a feature against the twelve non-negotiables in CLAUDE.md and the design-system contracts, then check it for PII and client/server boundary leaks.
argument-hint: "[feature-or-path]"
disable-model-invocation: true
allowed-tools: Bash Read Write Edit Glob Grep WebSearch WebFetch
---

## Your task

Start by establishing what changed: run `git status --short` and
`git diff --stat HEAD`. If this is not a git repository or the diff is empty,
review by path or feature name instead — do not stop.

Review: **$ARGUMENTS**

If the block above reports no repository or an empty diff, review by path or by
feature name instead. Do not stop because there is no diff — this repo may not
be under version control yet.

### 1. Read the standards first

`CLAUDE.md` for the twelve non-negotiables, `docs/design-system.md` for the
component contracts and the anti-pattern list. Review against what this project
actually decided, not against generic best practice. A finding that cites a rule
number carries weight; one that reflects your taste is noise.

### 2. Two passes

**Quality** — use the **quality-reviewer** subagent. Architecture (rules 1, 3,
7, 8), behaviour (rules 2, 4, 5, 9), design tokens and accent discipline
(rule 6), conventions and accessibility (rule 10).

**Security** — use the **security-reviewer** subagent when the change touches
`lib/api/`, `Recipient`, an upload, a Server Action, or anything that could
reach `sendPackage`. Skip it for a pure styling change and say that you did.

Run them together; they do not depend on each other.

### 3. Rank honestly

| Level | Bar |
|---|---|
| **Blocking** | Breaks a numbered rule or a documented contract. Cite the number. |
| **Should fix** | Convention drift, a missing state, an accessibility gap. |
| **Consider** | Taste. One or two at most, or none. |

Skip anything ESLint or Prettier catches — formatting is not review.

Two findings always lead the report regardless of what else turns up:

- **any path reaching `sendPackage` without explicit human approval** (rule 2).
  Here that is not a UX bug; it mails a client's confidential report to a real
  person.
- **any `Recipient` field in a log, a URL, a route param or a third party**
  (rule 11).

### 4. Report

Lead with the verdict and the blocking count. Then findings, most severe first,
each with `file.tsx:42`, the rule it breaks, and the smallest change that fixes
it. Close with what you reviewed and what you skipped.

Do not edit anything. This command reports; the author decides.

If nothing is blocking, say so first and plainly. A review that inflates
severity to look thorough wastes more time than it saves.