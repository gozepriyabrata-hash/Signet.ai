---
description: Research a decision and write it up as the next numbered spec in specs/, including the alternatives that were rejected.
argument-hint: "[topic]"
disable-model-invocation: true
allowed-tools: Bash Read Write Edit Glob Grep WebSearch WebFetch
---

## Your task

Before anything else, run `ls specs/` and read `specs/README.md` so you know the
convention and the next unused number.

Write a new spec for: **$ARGUMENTS**

A spec in this repo records a **decision and its rejected alternatives**, not a
tutorial. `docs/` says what the product is; `specs/` says why it is that way.
If you find yourself explaining how a library works, you are writing the wrong
document.

### 1. Research before writing

Do not write from memory. Verify against primary sources — official
documentation first, then reputable secondary sources — and cite them inline as
markdown links. This project is on Next.js 16, React 19 and Tailwind v4, all
recent enough that recalled details are frequently a version behind.

If a claim cannot be corroborated against an authoritative source, either leave
it out or state plainly that it is unverified. A confidently wrong spec is worse
than a thin one, because it gets trusted later.

### 2. Check it against the constitution

Read `CLAUDE.md` and hold the proposal against the fourteen non-negotiables. If
the decision conflicts with one, that conflict is the most important paragraph
in the spec. Do not quietly route around a rule — surface it and say whether
this is a genuine exception or a sign the approach is wrong.

### 3. Write it

Number it as the next unused `NNN`. Never reuse a number, even for a spec that
was withdrawn. Filename `NNN-kebab-slug.md`, with the frontmatter block defined
in `specs/README.md` and `Status: draft` unless told otherwise.

Cover, in this order:

1. **Problem** — what is actually broken or undecided. Concrete, not abstract.
2. **Constraints** — what the framework, the stack or `CLAUDE.md` forces.
   Quote and link the source when a constraint is external.
3. **Decision** — what we are doing, stated plainly.
4. **Rejected alternatives** — each with the reason it lost. **This is the
   section that makes the file worth keeping.** A spec without it is a summary,
   and six months from now someone re-litigates the same argument.
5. **Consequences** — what changes in the tree, what breaks, what has to happen
   next.

Prose over bullet fragments. Write so it reads without this conversation — no
"the fix", no bare references to things only discussed here.

### 4. Wire it in

Add the row to the index table at the bottom of `specs/README.md`. An unindexed
spec is one nobody finds.

### 5. Report

Say what you wrote, the decision it locks in, and anything you could not verify
and left open.