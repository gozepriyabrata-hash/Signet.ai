---
Spec:        018
Title:       First run after signup, and the delight layer
Status:      draft
Created:     2026-09-30
Supersedes:  —
---

# 018 · First run after signup, and the delight layer

## 1. Problem

Two boards were supplied together as product direction:

- **"Signet — Better Flow After 'Create Workspace'"** — subtitle *"guide the
  user first, show the dashboard later."*
- **"Make Users Addicted — the Delight Layer"** — subtitle *"chhoti cheezein jo
  user ko 'waah' karwa de aur baar-baar khinch laaye"* (small things that make
  the user say "wow" and keep pulling them back).

Both are written in Hinglish. The Hindi is translated inline below; wherever a
translation carries meaning, the original phrase is kept next to it.

This spec reads both boards frame by frame, holds every element up against
the fourteen non-negotiables and against what the tree already does, and
records what is adopted, what is adapted, and what is refused. Most of the
boards describe things this repo already has under another name. The parts
that are new are a first-run setup, a labelled sample project, and one
celebration moment. The parts that are refused are refused because they would
break rule 2, 5 or 13, not because of taste.

### 1.1 Board 1, frame by frame

**Band "ABHI (problem)"** (right now, the problem): `Create Workspace` →
**"Seedha bhara-bhara dashboard → 'ab karu kya?'"** (straight into a crowded
dashboard, then "so what do I do now?"), marked **"✗ thanda, confusing"** (cold,
confusing).

*Against the tree:* half of this is out of date. `signupAction` does redirect
straight to `/dashboard` (`lib/auth/actions.ts`, right after `createSession`),
but that dashboard has not been crowded since `specs/015` §8–§10. It is one
greeting and one prompt card, with no stat tiles, no recent-projects list and
no quick actions. The half that still holds is **"ab karu kya?"**. A brand-new
account sees an empty field and a rotating placeholder. Nothing says what a
"report" is, it offers no way to see the output before bringing a real
client's document, and the avatar and voice presets the account inherits
(`lib/api/mock/fixtures.ts`: "Priya — Executive", "Daniel — Approachable") are
someone else's face and voice, presented as defaults. So the problem is not
clutter. **The first screen asks for a real client document before the user
has seen what one turns into.**

**Band "KARO AISA (smooth flow)"** (do it like this):

| Frame | Board says | Against the tree |
|---|---|---|
| 1 | `Create Workspace` — *done ✓* | Exists: `/signup`, `specs/009`, `specs/011`. |
| 2 | `Guided Setup (not dashboard)` — *3 small steps, one task each* | **New.** No route, no component. §3.1. |
| 3 | `Empty state that guides` — *big friendly CTA card* | Partly exists: the dashboard hero *is* one big CTA card (`DashboardHeader`). It lacks the sample entry point. §3.3. |
| 4 | `First package flow` — *stepper shows progress* | Exists: `WorkflowStepper`, `specs/007`. |
| 4a | Labels `Upload → Recipient → Analysis → Video → Email → Review` over six dots, first two filled | Matches `specs/007`'s "seven steps, six routes": Send is Review's confirmed state, so a six-node stepper is correct. The board says **Upload** where the tree says **Report**. The tree's label stays, because the step also covers parsing, not only the upload. |
| 4b | *"user ko hamesha pata: kahan hai, kitna baaki"* (the user always knows where they are and how much is left) | Already the stepper's contract (`docs/design-system.md` §5). No change. |

**Sub-panel "Guided Setup ke andar"** (inside Guided Setup), three cards, each
tagged *one screen*:

1. **Avatar + voice** — *(ya skip)* (or skip).
2. **Branding** — *logo, color*.
3. **First recipient** — *ya sample* (or a sample).

**Panel "6 UX rules jo flow ko 'cool' banate hain"** (six UX rules that make
the flow "cool"):

| # | Board rule | Already a rule here? |
|---|---|---|
| 1 | **Ek hi primary button** — *har screen par sirf ek main action highlight* (one primary button: one highlighted main action per screen) | **Yes.** `docs/design-system.md` §1, "Action discipline": `--primary` is "One per screen." |
| 2 | **Empty state kabhi khaali nahi** — *illustration + ek clear CTA* (an empty state is never blank: an illustration and one clear CTA) | **Yes**, minus the illustration. Rule 9 plus the `EmptyState` contract ("exactly one primary action"). The illustration is new; §3.4 sets its limits. |
| 3 | **Progress dikhao** — *stepper + real video progress, spinner nahi* (show progress: stepper and real video progress, not a spinner) | **Yes.** Rule 5, `JobProgressCard`. |
| 4 | **Soft transitions** — *fade/slide 150–200ms, skeleton loaders* | **Yes, with one difference.** `docs/design-system.md` §4 has 150ms for hover and 200ms for reveals and dialogs, but **250ms** for workflow step transitions. The 250ms stays. A step change is the one transition that should read as forward progress, not as feedback. |
| 5 | **Jaldi "aha moment"** — *sample report se 30 sec mein result* (a quick "aha" moment: a result from a sample report in 30 seconds) | **New.** §3.2. |
| 6 | **Configure once** — *3–5 choices dikhao, 39 nahi* (show 3–5 choices, not 39) | **Yes, verbatim.** Rule 1. |

Four of the six rules are already the repo's rules. That is worth saying
plainly, because it means this board **confirms the direction rather than
changing it**.

### 1.2 Board 2, frame by frame

**Banner "THE #1 HOOK":** *"'Try with sample' → 30 second mein pehla ready
video. Bina data daale value dikha do."* (Try with a sample: the first finished
video in 30 seconds. Show the value before any data goes in.) Badge: *instant
"aha"*.

**Eight cards:**

| Card | Board says (translated) | Verdict |
|---|---|---|
| Live avatar preview | As you type the script, the avatar speaks it: real-time magic | **Refused as drawn, adapted.** §4.1. |
| Auto-fill from report | One click fills every field; the user just approves | **Already the product**, with one line the board crosses. §3.6. |
| Celebration moment | First package ready → confetti + "Your first Signet!" | **Adopted, moved.** It fires on the first *send*, not on *ready*. §3.5. |
| Fun status lines | "Writing your hook… cloning your voice…": make even the wait fun | **Adapted.** Warmer copy, but only for stages that are actually running. §3.7. |
| Friendly microcopy | Buttons like "Make magic" and "Send it": friendly, not robotic | **Adapted.** Friendly in prose, literal on buttons. §3.8. |
| Optimistic + fast | Feels instant, skeleton loaders, never a bare spinner | **Already the rule** (rule 9, rule 5). Optimistic writes are allowed for drafts only. §3.9. |
| Recipient-view preview | A live email mockup that looks exactly like what the client will see | **Already built** (`EmailStep`'s preview). It is incomplete in two known ways. §3.10. |
| Small wins + streak | "3 packages sent this week", so you want to keep going | **Wins adopted, streak refused.** §4.3. |

**Footer "GOLDEN RULE":** *"Har screen: 1 clear action · instant feedback · ek
chhota reward. Bas — user hook ho jaayega."* (Every screen: one clear action,
instant feedback, one small reward. That's it, the user gets hooked.) The first
two clauses are adopted. The third is narrowed (§4.4).

**Visual treatment of board 2** (dark navy, a blue→violet→cyan gradient banner,
coloured top-rules on each card, scattered star glyphs). This is the board's
style, not a proposal for the product's. `docs/design-system.md` §6 lists
"Gradient hero cards, glassmorphism, neon borders. This is a work tool." as an
anti-pattern, and `--accent` blue is reserved for AI activity. None of that
styling carries over. Only the content does.

---

## 2. Constraints

**Rule 1 and its mirror.** A setup flow is configuration, and configuration
lives under `/settings`. A guided setup that saved into its own store would be
a tenth settings surface wearing an onboarding costume. So each setup screen
must write to the **same preset kinds** `/settings/*` already edits
(`avatar`, `voice`, `branding`, the saved-recipient store), and must show at
most three to five controls.

**Rule 2.** A sample project must never be able to send. There is no real
recipient, so any send would go either nowhere or to a fabricated address.

**Rule 5.** A status line is a "real stage label", or it is not allowed.
"Cloning your voice" during a render that uses a stock voice is a false
statement about what the system is doing.

**Rule 11.** A sample recipient is fictional by construction, which is the
point: nobody's client PII is needed to see the product work.

**Rule 13 (a) and (b).** The sample video is still an AI video. When
disclosure lands it applies to the sample too. Voice cloning inside setup
carries the same recorded-permission step `VoiceSettings` already has, or it
is not offered there.

**`docs/design-system.md` §4.** CSS-only motion, `transform` and `opacity`
only, and `prefers-reduced-motion` respected. Confetti has to fit inside that,
or it does not ship.

**The mock is global.** `lib/api/mock/` persists one seeded world to
`sessionStorage` (`docs/data-model.md` §2, "Mock adapter rules"). There is no
per-account data, so "is this a new user?" cannot be derived from projects or
presets: every account sees the same seven seed projects.

---

## 3. Decision

### 3.1 Guided setup: three screens, reached only from signup

`signupAction` redirects to **`/welcome`** instead of `/dashboard`.
`loginAction` keeps redirecting to `/dashboard`. **The redirect target is the
whole first-run detector.** Signup is the only moment a workspace is created,
so no `onboardedAt` column, no persisted flag and no derivation are needed.
(Deriving it would not work anyway: see "The mock is global" in §2.)

Three screens, one task each, in this order. All are skippable, and every one
is reachable again later from the Settings section it writes to:

| Screen | Controls (≤ 3) | Writes to | Skip means |
|---|---|---|---|
| **Presenter** | pick a stock avatar · pick a stock voice · "use my own" (opens the upload in `/settings/avatar` or `/settings/voice`, with the consent step intact) | `avatar` / `voice` default preset | The seeded default stays. |
| **Brand** | logo upload · one brand colour | `branding` default preset | "House brand" stays. |
| **First recipient** | name · email · *or* "Try with a sample instead" | the saved-recipient store (`api.saveRecipient`) | Goes to the dashboard. |

The last screen's secondary path is the sample (§3.2). It is the board's
*"ya sample"* and the hook from board 2's banner.

**Where it lives:** a third non-root route group, `app/(app)/(setup)/welcome/`,
alongside `(shell)` and `(focus)`. It is not `(focus)`, because `(focus)/layout.tsx`
renders `WorkflowChrome`, which is project-bound. It is not `(shell)`, because
the board says *not dashboard* and a sidebar is the dashboard's chrome.
`specs/003` already established why sibling non-root groups are the right
tool for this.

A setup progress indicator is a plain "1 of 3" line, not a second
`WorkflowStepper`. The stepper's contract is the golden path's, and reusing it
here would blur which progress the user is looking at.

### 3.2 The sample project: labelled, pre-baked, never sendable

**"Try with a sample"** creates a project from a bundled sample report and a
fictional recipient, then enters the ordinary workflow at the Report step.
It is the same seven steps, the same components, and the same jobs.

- **Domain:** `Project` gains `isSample?: true`. Per rule 14's reasoning,
  behaviour that the UI must enforce belongs in the domain type, not in a
  naming convention like the mock's `FAIL_` prefix.
- **Labelled everywhere it renders:** a "Sample" badge in the workflow header
  and in `/projects`. A sample must never be mistakable for client work.
- **Review never sends it.** On a sample, Review renders the full package and
  the requirements checklist, but *Approve & Send* is **absent**, not
  disabled, and a single primary action takes its place: **"Start with your
  own report"**. It is absent rather than disabled because a disabled send
  button implies "not yet", and a sample can never send. `eslint.config.mjs`'s
  one-file allow-list for `sendPackage` does not change.
- **The 30 seconds is honest only in the mock.** The mock's job durations sum
  to 29s (parse 3 + analysis 6 + script 4 + video 12 + email 4 in
  `lib/api/mock/jobs.ts`). A real avatar render has an unverified duration
  that is almost certainly longer. When `lib/api/real` lands, the sample's
  video must be a **pre-rendered asset served instantly**, not a live render.
  Otherwise the "30 second" promise silently breaks the day the backend ships.
  That is a constraint on the real adapter, recorded here so it is not lost.
- **Not a seed project.** The seven seeded projects are demo history. The
  sample is created on request, belongs to the user's session, and can be
  deleted.

### 3.3 The dashboard's empty state gains the sample, and nothing else

When the account has no non-sample projects, `DashboardHeader`'s card shows
one extra line under the field: *"No report handy? Try a sample."* It is a
text link, never a second pill, because the "Start" action is the screen's
one primary. Once a real project exists, the line disappears. This is the
board's *"Empty state that guides"*. The dashboard is already a single big
CTA card, so the guidance is one line, not a redesign.

*(With a global mock this condition is never true today, because every
session sees seeded projects. It becomes testable once the mock is scoped per
account, or immediately behind a mock flag. This is recorded as a known limit,
not hidden.)*

### 3.4 Empty-state illustration

The `EmptyState` contract gains an optional `artwork` slot. Artwork may use
the **artwork-only pastels** (`docs/design-system.md` §1). This is exactly the
case that section exports them for. The board's *"illustration + ek clear
CTA"* is then satisfied without adding a colour to any button, type or
surface. No stock illustration packs: rule 6's no-hex discipline applies to
SVG fills too.

### 3.5 One celebration, on the first send

The board fires confetti when the first package is *ready*. This spec moves
it to the Send success state, **once per workspace, on the first ever
successful send**:

- "Ready" means the AI finished. Nobody has reviewed it yet. Celebrating an
  unreviewed AI output rewards the wrong moment, in a product whose whole
  proposition is that a human approves every send (rule 2).
- Send success is already a distinct state (`ReviewStep`'s `sent` branch), so
  no new trigger is needed.
- Detect "first" from data: the sent-package count is 1 on the success
  render. This is `DashboardStats.emailsSent`, already on the seam. No flag
  is needed.
- **Motion:** a `@keyframes` block in `app/globals.css`, next to the
  generation pulse, animating `transform` and `opacity` only, one-shot
  (~1.2s), with particles drawn in the artwork pastels. Under
  `prefers-reduced-motion` it does not run at all, and the heading alone
  carries the moment. It is decorative, so it is `aria-hidden`, and the
  success heading reads *"Your first package is on its way."* The board's
  *"Your first Signet!"* is not used, because a user does not send "a
  Signet".
- It never fires on a sample, because a sample cannot send (§3.2).

### 3.6 "Auto-fill from report" is already the product, and approval stays real

Analysis → script → email already fill every field from the report, each one
editable with Regenerate (rule 4). The board's *"user bas approve kare"* (the
user just approves) is accepted as a description of effort, not of process.
**No "approve all" and no skip-to-Review shortcut ships.** Review's checklist
and confirm dialog are how the approval stays informed, and rule 14 exists
because a sentence a reviewer cannot check is not really approved.

### 3.7 Status lines: warmer, still true

`STAGES` in `lib/api/mock/jobs.ts` (the source of truth for stage copy, per
`docs/screens.md`) may be rewritten in a warmer voice, under one test: **each
line names work that the job is doing at that moment.** "Finding the numbers
that matter" is allowed for analysis. "Cloning your voice" is not, because
cloning happens once, in Settings, not during a render. When the real adapter
lands, stage copy moves with the vendor's real stages, not the reverse.

### 3.8 Microcopy: friendly prose, literal buttons

Descriptions, empty states, placeholders and success headings may be warm.
**A button names its verb and its object.** "Generate video", not "Make
magic". The rule is strongest at the irreversible end: the Review CTA stays
**"Approve & Send"** and the dialog's confirm stays **"Send it"**. That line
already exists, so the board's own example is already shipped. It is friendly
*and* it says what happens. A screen-reader user hears the button label
without the surrounding visuals, so a whimsical label is an accessibility
defect, not a tone choice (rule 10).

### 3.9 Optimistic updates: drafts yes, jobs and sends never

Draft edits already save optimistically through Zustand (rule 3). A job
starting, a job finishing, or a send completing is **never** rendered before
the server says so. An optimistic "Sent ✓" that later fails is the one lie
this product cannot afford.

### 3.10 Recipient-view preview: exists, two known gaps

`EmailStep` already renders a debounced (250ms) preview of what arrives in the
inbox. The board is asking for what is built. The two gaps are already
documented elsewhere and stay owned there: the preview does not include the
video thumbnail (`PreviewPane` is "specified, not built",
`docs/design-system.md` §5), and it carries no AI disclosure line (rule 13a).
When disclosure lands, **it appears in this preview first**, because a
disclosure the sender never sees is one they cannot vouch for.

---

## 4. Rejected alternatives

### 4.1 A live avatar that speaks as the script is typed

Every keystroke, or every debounce, would be a presenter-and-voice render,
which is a vendor job measured in seconds to minutes (the mock's video job
alone is 12s). That is rule 5's territory, a job with progress, and a job per
keystroke is neither real-time nor affordable. **Adapted instead:** while the
script is edited, the Video step shows the chosen avatar's still poster and a
live **estimated read time** computed locally from word count. That is
instant, free and true. Real playback appears only after *Generate video*.

### 4.2 Guided setup as a blocking gate

Forcing all three screens before the workspace opens would put configuration
between the user and the aha moment. That inverts board 1's own point. Every
screen has *Skip*, and skipping keeps the seeded default.

### 4.3 A streak

"3 packages sent this week" is a fact, and it is adopted as a single line on
the dashboard, sourced from the stats seam (`use-stats`) and shown only when
it is non-zero. A **streak** is refused. It rewards sending more often, in a
product where every send is a considered, human-approved message to a named
client. A broken streak is a loss-framed nudge to send something to keep a
counter alive, which works directly against "keep the person in charge"
(`docs/prd-alignment.md` §6). The wins line also never shows a comparison
("down from 5"), for the same reason.

### 4.4 A reward on every screen

The golden rule's third clause, *"ek chhota reward"* on every screen, is
narrowed to **instant feedback on every screen** (already true for every job, through
`JobProgressCard`) and **one reward at a real milestone** (§3.5). Rewards
on every step inflate until they mean nothing, and on a Review screen they
would be read as an endorsement of the content.

### 4.5 "Addicted" as the goal

The board's title is marketing shorthand. It is recorded here, and not adopted
as a design objective. The return loop this product earns is "it saved me an
afternoon last time", not a compulsion mechanic. This is a work tool that
handles client PII (rule 11), and no retention mechanic should be added whose
purpose is to bring someone back without a report to send.

### 4.6 A first-run flag in the auth database

An `accounts.onboardedAt` column would work, but it would widen the one real
database for a fact the signup redirect already knows. Rejected while the
redirect is sufficient. It is revisited only if setup needs to be *resumable*
across sessions, and nothing on either board asks for that.

### 4.7 Upload/Report label change

The board labels step 1 "Upload". The tree's "Report" stays, because the step
covers upload *and* parse (`docs/screens.md`, Step 1), and "Upload" would
describe half of it.

---

## 5. Consequences

**Specified by this file, not built:**

- `app/(app)/(setup)/welcome/` with three screens, and `signupAction`
  redirecting there.
- `Project.isSample`, a bundled sample report fixture, a sample creation path
  on the seam, the "Sample" badge, and Review's sample branch.
- The dashboard's "Try a sample" line.
- `EmptyState`'s optional `artwork` slot.
- The first-send celebration keyframe and its success copy.
- The wins line on the dashboard.
- The Video step's local read-time estimate.

**Already true, confirmed by the boards, no change:** one primary per screen,
stepper progress, real job progress, skeletons, rule 1's 3–5 controls, the
recipient-view email preview, and the "Send it" confirm copy.

**Recorded for the real adapter:** the sample's video is pre-rendered (§3.2),
and stage copy follows the vendor's real stages (§3.7).

**Tests this will need when built:** a sample project never renders an
*Approve & Send* control; the celebration renders only when `emailsSent === 1`
and never under reduced motion; `signupAction` redirects to `/welcome` and
`loginAction` still redirects to `/dashboard`.

## 6. Unverified

- The duration of a real avatar render. The "30 seconds" is a mock
  measurement, not a vendor figure.
- Whether a warmer stage-label voice measurably changes perceived wait. It is
  adopted as tone, not as a claimed metric.
