# PRD Alignment

The source requirement for this repo is **AI Creator Operating System — Product
Requirements Document** (Ayan Ghosh, PST-25-0211; Priyabrata Goze, PST-25-0183;
project type: Generative AI). The source document is not in the tree; this
file is the authoritative record of what it asks for and where each ask
landed.

Read it when you are about to argue that something is missing. Most of the
apparent gaps are scope decisions that were made deliberately, and this document
says which ones are not.

---

## 1. The PRD describes three products. This repo is one of them.

The PRD's stated goal is "one simple workspace that does three jobs from one
place":

| # | PRD flow | What it does | In this repo |
|---|---|---|---|
| 1 | **Clip flow** | A long video (podcast, interview) into short, vertical, captioned clips | **No.** Not a route, not a type, not a seam method. |
| 2 | **Faceless-video flow** | A short text idea into a finished video with script, voice, images, captions, music | **No.** Same. |
| 3 | **Report email flow** | A client report into a personalised video email, approved by a human | **Yes. This is the entire repo.** |

The PRD itself names flow 3 as its **"Feature in Focus — Personal Report Video
Emails"** and gives it a dedicated section, a pilot plan and its own settings
appendix. That is the section this codebase implements, end to end, at the UI
layer.

**`README.md` used to describe flows 1 and 2** — the clip and faceless-video
products — which is the PRD's framing of the wider system, not of this tree. It
now says which of the three this repo is. If you are looking for the clip
pipeline, it does not exist here, and no file in `lib/api/` reserves space for
it.

**Why the split is the right one.** The three flows share almost nothing:
different inputs (a video file, a text prompt, a PDF), different processing
(FFmpeg/Whisper/OpenCV, image generation, document parsing), different outputs
(a clip, a video, an approved email package) and different failure modes. What
they share is a job envelope and a project shell, both of which this repo
already has in a shape the other two could adopt. Building all three into one
route tree before any of them is real would have produced a workspace whose
navigation is a menu of unfinished things.

---

## 2. User stories

The PRD carries eighteen. **US-010 through US-018 are the report email flow**
and are the ones this repo answers. (An earlier PRD draft numbered twenty
stories, with the report flow running US-011 through US-020; the current draft
renumbers and drops one story outright — see the note at the end of this
section.)

### The nine this repo implements

| Story | Ask | Where it lives | State |
|---|---|---|---|
| **US-010** | Upload a client report; key points, numbers, advice and risks pulled out | Report step (`components/workflow/steps/ReportStep.tsx`), Analysis step | UI complete, mock-backed. Type and size validated client-side before `uploadReport` (rule 12). |
| **US-011** | Add recipient name, role, company, industry, needs, stage; saved; editable later | Recipient step; `Recipient` in `types/domain.ts`; saved store via `listRecipients` / `saveRecipient` | Complete. "Stage" is modelled as `personalisation: low \| medium \| high`; "needs" as `businessPriorities: string[]`. |
| **US-012** | A personal script from report + recipient + sender message; editable before use | `generateScript` produces a `Script`, shown in the Video step as an `AIEditableField` | Complete. Editable is structural — rule 4. |
| **US-013** | An AI presenter video with the sender's approved face and voice, within a length limit | Video step; `generateVideo(projectId, VideoOptions)` produces a `VideoAsset` | UI complete. Face and voice are `avatarId` / `voiceId` preset references. The length limit is a video-template preset field and is not enforced client-side. |
| **US-014** | A personal email whose subject and note fit the recipient, with the video and a next step | Email step; `generateEmail` produces an `EmailDraft` carrying `ctaId` and `signatureId` | Complete. The video renders in the preview as a poster frame with a play badge — what an inbox actually shows. |
| **US-015** | The report attached automatically; swappable | `CommunicationPackage.reportAttachment`, non-optional | Complete, and stricter than the ask: the field is required, so there is no state in which a package exists without its report. Swapping the file means returning to the Report step. |
| **US-016** | Preview the whole email as the recipient sees it; edit any part in place | Review step (`ReviewStep.tsx`) | Complete. Every checklist row deep-links to the step that produced it. |
| **US-017** | Send now, or save a draft; a clear success or error | Review step's confirmed state; `sendPackage` | **Send is complete. "Save a draft to my email app" is not built** — there is no `saveDraft` seam method and no route to a mail client. See §7. |
| **US-018** | Opens, plays, watch time, next-step clicks, report downloads | `/analytics`, `/settings/analytics` | **Deliberately not built, and the refusal is reasoned.** See §6. |

### The nine this repo does not implement

US-001 through US-009 belong to flow 1, the clip pipeline: project creation
for a video project, video upload, word-level transcription, moment ranking,
cropping and captioning, preview and download, job progress, auto titles and
tags, and a clip history. **Flow 2, the idea-to-finished-video path, has no
user story of its own in either PRD draft** — it appears only in the Product
Goal and the tech stack, never as an acceptance-criteria row.

Two of the nine have partial analogues here, and the overlap is worth naming
because it is where the flows would converge if flow 1 were ever built.

- **US-001 (create a project).** `createProject()` exists and `/projects` is the
  library. A video project would need a `kind` discriminator on `Project`; there
  is none today, and adding one is the first change any second flow forces.
- **US-007 (see the job progress; a failed job shows a simple reason; a finished
  job shows a preview).** This is `Job<T>` and `JobProgressCard`, already
  general. The envelope was designed for any long-running AI call rather than
  for document parsing specifically, so a transcription or a render job would fit
  it unchanged. It is the single most reusable thing in the repo.

**One story the prior draft carried is gone outright.** The one-time
stand-in/voice setup and AI-disclosure story — previously numbered US-020 —
is not in the current eighteen. The asks it carried did not disappear: "get
clear permission before copying anyone's face or voice" and "tell recipients
when a video was made with AI" are both still PRD product principles (§6),
and setup area 1 ("Digital stand-in", §4) still covers the one-time recording
and permission flow. They are simply no longer anchored to a numbered
acceptance criterion, which is why `CLAUDE.md` rule 13 now cites the
principle directly rather than a story number.

---

## 3. Product states

The PRD's "Product States" section lists two flows: the clip flow, and the
report-email flow, which the PRD labels **"Own Avatar audio and Video
Generator"** here — a different name from "Personal Report Video Emails",
which is what the Feature in Focus section (§1) calls the same flow. Both
names describe the same nine states; this repo answers to the report-email
one.

```
PRD:  Upload Report -> Understand Report -> Add Recipient Context
      -> Generate Personalised AI-Avatar Video
      -> Generate Personalised Email with CTA -> Attach Report
      -> Package Email + Video + Report -> Review -> Ready to Send
```

`ProjectStatus` has seven states, and they are not a one-to-one map with the
PRD's nine — deliberately.

| PRD state | This repo | Note |
|---|---|---|
| Upload Report | `status: "draft"`, `report.status: "uploading" \| "parsing"` | Upload progress belongs to the report, not to the project. |
| Understand Report | `report.status: "parsed"` | **Not a `ProjectStatus`.** Whether the document was read is a fact about the document. Promoting it to a project status would create two fields that can disagree. |
| Add Recipient Context | `status: "draft"`, `recipient !== undefined` | Still a draft: nothing has been generated yet. |
| — | `status: "analysing"` | **This repo has a state the PRD does not name.** Reading the report is a job with real duration, and rule 5 says a job is never a spinner — so it needs a status a resumed project can land on. |
| Generate Personalised AI-Avatar Video | `status: "video_pending"`, then `video.playbackUrl !== undefined` | The status means "the video step is in progress"; the playback URL means done. A `VideoAsset` exists as soon as its job is queued, so its presence is not completion — see `lib/workflow.ts`. |
| Generate Personalised Email with CTA | `status: "email_pending"`, then `email !== undefined` | Same shape. |
| Attach Report | **no state** | `CommunicationPackage.reportAttachment` is required. There is no moment at which a package exists and its report does not, so there is nothing to transition through. This is the PRD state most improved by being deleted. |
| Package Email + Video + Report | `status: "ready_for_review"`, `package.status: "ready"` | |
| Review | `status: "ready_for_review"` | Reviewing is a person looking at a screen, not a state the system enters. The system cannot tell the two apart and should not pretend to. |
| Ready to Send | `status: "ready_for_review"`, then `status: "sent"` / `package.status: "sent"` once the human sends | **Renamed from the prior draft's final state, "SENT".** The PRD's own diagram now stops one step short of the send itself, at readiness rather than completion — which lines up with rule 2 more precisely than the old wording did: sending was never meant to be an automatic last step. |
| PROCESSING FAILED / MAKING FAILED | `status: "failed"` plus `Job.error { code, message, retryable }` | Not a named PRD state; inferred from the acceptance criteria's "a failed job shows a simple reason" (US-007). `retryable` is what drives whether `JobProgressCard` offers the Retry. |

**The one-time stand-in/voice setup flow is no longer given its own state
list.** The prior PRD draft named one (`NO STAND-IN -> RECORDINGS ADDED ->
PERMISSION GIVEN -> STAND-IN READY`); the current "Product States" section
only lists the two flows above. The underlying task has not gone away —
setup area 1 ("Digital stand-in", §4) still covers "record clear
permission" — it is just no longer modelled as a state machine in the source
document either, which makes this repo's choice not to model it as one a
non-issue rather than a gap. It is the `avatar` and `voice` preset lists under
Settings, where "stand-in ready" means "a preset exists". Presets are also
archived rather than deleted (`specs/008` §3.3), which the PRD does not ask
for and which a sent package requires.

---

## 4. The eight setup areas, and the nine Settings routes
       0
The PRD lists eight setup areas covering "39 in all" configurable items — the
same count `CLAUDE.md` rule 1 is written against. Nine routes carry them.

| # | PRD setup area | Route(s) | Coverage |
|---|---|---|---|
| 1 | **Digital stand-in** — presenter, custom upload, voice, voice matching, recorded permission | `/settings/avatar`, `/settings/voice` | **Built.** Avatar upload and voice cloning both go through `UploadPanel`; only cloning confirms, because it is the one upload where the person supplying the sample and the person clicking may differ (`specs/008` §3.10). **Avatar-to-voice matching is not built** — the Video step picks both independently. |
| 2 | **Video** — look, layout, format, size, length limit, captions, transitions, cover, music | `/settings/video` | Preset list (`videoTemplate`, `branding`). Format and captions are the two the Video step exposes per project; everything else is template config. |
| 3 | **Script** — writing style, section order, how personal it is, sender's main message | `/settings/ai` | `scriptStyle` presets. **Personalisation level is deliberately NOT here** — it varies per recipient, so rule 1's mirror puts it in the workflow. `AiSettings.tsx` says so in place. |
| 4 | **Report reading** — which parts matter most, report-type templates, reading settings | **none** | **The one setup area with no home.** `analyzeReport(projectId, recipient)` takes no options. See §7. |
| 5 | **Email & next step** — template, tone, next-step types and targets, sign-off | `/settings/email` | `cta` and `signature` presets. The CTA's target URL is set with the preset, never typed in the workflow. |
| 6 | **Brand & profiles** — logo, colours, fonts, watermark, sender profiles, recipient groups, campaign templates | `/settings/video` (branding), `/settings/recipients` (segments) | **Partial.** Branding is a preset kind and is applied automatically rather than picked. **Sender profiles and campaign templates are not built** — a campaign here is one sent package, not a template (`specs/005` §3.1). |
| 7 | **Rules & control** — safety rules, AI writing rules, editable or locked fields, languages, name pronunciation | `/settings/ai` | **Partial, and partly refused.** "Editable or locked fields" is answered rather than implemented: rule 4 makes every AI string editable, structurally, so there is no lock to configure, and `AiSettings` says so. **Languages and pronunciation are not built.** |
| 8 | **Sending, safety & cost** — sending method, attachment rules, tracking, alerts, retention, permissions, AI notice, usage limits | `/settings/analytics`, `/settings/security`, `/settings/usage` | **Partial.** Tracking consent, retention windows and read-only quota are built. **Sending method, attachment rules, per-role permissions and the AI notice are not.** |

Eight of the nine routes are the same screen — a `PresetList` with a
section-specific header — which is the evidence for `specs/008` §3.1's claim
that rule 1's overflow has somewhere to go that stays navigable at thirty-nine
items. `/settings/analytics`, `/settings/security` and `/settings/usage` are the
exceptions: the first two edit one `WorkspaceSettings` document, and the third
edits nothing at all.

---

## 5. The PRD's tech stack, and this repo's boundary

The PRD specifies a full-stack system. This repo is the first row of it.

| PRD component | Where it is in this repo |
|---|---|
| **Next.js + TypeScript + Tailwind** — the screens | **This repo, in full.** |
| **Python + FastAPI** — the server | Behind `lib/api/real/`, which is stubs that throw a named error. |
| **PostgreSQL** — accounts, projects, jobs | Not built. The one real database here is a SQLite/libsql store for accounts and password-reset tokens (`specs/011`, `specs/014`) — auth only, and the deliberately narrow exception to "no DB". |
| **Redis** — the job queue | Not built. `Job<T>` is the client-side contract a queue would satisfy; `lib/api/mock/jobs.ts` advances progress against an in-memory clock so the polling path is exercised for real. |
| **FFmpeg + MoviePy, Whisper, OpenCV** | Flows 1 and 2 only. Nothing in this repo needs them. |
| **AI text model** — scripts and emails | `generateScript`, `generateEmail`. |
| **AI voice service**, **AI presenter service** | `generateVideo`, driven by `VideoOptions.voiceId` and `avatarId`. |
| **AI picture service** | Flow 2 only. |
| **Cloud storage** | `Report.storageUrl`, `VideoAsset.playbackUrl`, `VideoAsset.posterUrl` — optional strings the UI renders and never fetches from a third party. |
| **Email service** | `sendPackage`. |
| **Docker** | Not this repo. |

**Everything a backend would provide crosses exactly one seam:** the `ApiClient`
interface in `lib/api/types.ts`. Making it real is a change to
`lib/api/real/index.ts` and to `lib/api/index.ts`'s flag — no screen, hook or
store imports a mock module directly. When it happens, two decisions in
`specs/003` unblock and should be revisited by name: server prefetching (§3.3)
and `loading.tsx` (§3.6).

---

## 6. Principles: the PRD's, and what enforces them

The PRD lists nine product principles. Six map onto `CLAUDE.md` rules or onto
enforced structure. Three do not, and §7 covers those.

| PRD principle | What holds it |
|---|---|
| "Keep the person in charge. The sender always makes the final choice." | **Rule 2**, plus four `no-restricted-syntax` blocks in `eslint.config.mjs` that make `sendPackage` unreachable from the campaigns tree, the settings tree and every workflow step except `ReviewStep.tsx`. That allow-list has exactly one entry, and the config says adding a second is the rule being broken rather than configured. |
| "Nothing is posted or sent without a preview and the sender's approval." | **Rule 2**, and the conventions section's refusal to make `sendPackage` a Server Action — a Server Action compiles to a POST endpoint reachable without rendering the page that offers it (`specs/007` §3.2). |
| "Be clear about what the app is unsure of." | **Rule 5** (`Job.error.retryable`, real stage labels, no indeterminate spinners) and **rule 9** (four states, always). `/analytics` extends it: `successRate` is `null`, never `0`, when a period holds no sends, because "no data" and "everything failed" are the two facts a reporting screen most needs to keep apart. |
| "Get clear permission before copying anyone's face or voice." | **Rule 13**, and `VoiceSettings`' confirmation dialog, which asks for the name of the person in the recording before a clone. Someone who cannot say whose voice it is should not be cloning it. |
| "Keep private files and videos private." | **Rule 11**, and its consequences throughout: no recipient field in a URL, the projects search box kept out of the query string (`specs/004` §4), aggregates-only analytics, `Recipient.email` shown on `/campaigns/[id]` but never in the `/campaigns` list, and no external request from any route holding client identity. |
| "Use only free-to-use pictures and music, so there are no rights problems." | Vacuously true today — this repo ships no stock media and loads nothing from another origin. It becomes a real constraint with flow 2. |

**Two of the PRD's own measurement asks were refused on the evidence, and the
refusal is documented rather than silent.** US-018 asks for opens, plays, watch
time, clicks and downloads. `/analytics` reports none of them, because Apple's
Mail Privacy Protection fetches remote content regardless of engagement, so a
pixel-derived open rate reports something other than what its label claims — and
with one package going to one named person there is no aggregate for that noise
to average out against (`specs/006` §2.2). The second reason is that measuring it
means instrumenting a named client's inbox, which is `/settings/analytics`'s
consent decision to make and not a reporting screen's to assume. The tracking
toggles exist and **every one of them defaults to off**, which is a product
decision rather than a placeholder (`specs/008` §3.7): a product whose
proposition is that a human approves every send does not open with recipient
tracking already enabled and a checkbox to find.

---

## 7. What the PRD asks for that this repo does not do

Honest list. Nothing here is hidden behind a stub that looks finished.

**Obligations. These are rules 13 and 14, and they are not optional once the
backend lands:**

1. **The recipient is never told the video was made with AI.** An explicit PRD
   product principle ("Tell recipients when a video was made with AI") — the
   prior PRD draft also anchored this to a US-020 acceptance criterion, but
   the current draft drops US-020 as a numbered story (§2), so the principle
   is now the only citation. Nothing in `EmailDraft`, the email preview, the
   Review checklist or `/settings` carries a disclosure line. This is the
   largest gap between the PRD and the build, it is an obligation rather than a
   feature, and it cannot be answered by a setting that can be switched off. See
   rule 13.
2. **No provenance trail.** "Show where it came from. Every clip, line, or email
   points back to the video, idea, or report it was made from." `Analysis`
   carries `executiveSummary`, `keyInsights` and `talkingPoints`, none of which
   references a page, a section or a quotation in the source `Report`. A
   reviewer on the Review screen cannot check a generated claim against the
   document without opening the PDF themselves — which is exactly the work the
   product exists to remove. See rule 14.
3. **"Make no claim from a report that the report does not support" has no
   mechanism.** It is currently a hope about the model rather than a property of
   the system, and it is downstream of (2): a claim you cannot trace is a claim
   you cannot check.

**Features — ordinary, and deferrable:**

4. **"Save a draft to my email app"** (US-017). Send is built; draft-saving is
   not. It needs a `saveDraft` seam method and a decision about what "my email
   app" means — an `.eml` download, a Gmail compose deep link, or a connected
   account. None of the three is obviously right, which is why none is there.
5. **Report-reading configuration** (setup area 4). `analyzeReport` takes no
   options, so "which parts matter most" and report-type templates have nowhere
   to live. This is rule 1 overflow with no landing site, and the first genuine
   argument for a tenth Settings route.
6. **Avatar-to-voice matching** (setup area 1). Two independent pickers today.
7. **Sender profiles and campaign templates** (setup area 6).
8. **Languages and name pronunciation** (setup area 7). The PRD ranks more
   languages as "Could".
9. **Sending method, attachment rules, per-role permissions** (setup area 8).
10. **Duplicate for another recipient.** Named in `docs/screens.md` as the Send
    state's highest-value follow-on, and deliberately not shipped as a dead
    control — it needs a `duplicateProject` seam method.
11. **`/legal/terms`.** `/legal/privacy` shipped because `specs/011` made real
    account PII persist server-side (`specs/013`); nothing yet requires terms.

**Structural, and cheap to keep in mind:**

12. **`Project` has no `kind` discriminator.** Adding flow 1 or flow 2 starts
    here.
13. **The PRD's pilot plan** — Phase 1, the Custom Reports team, a control
    group, engagement and business-outcome measurement — has no instrumentation,
    and cannot until §6's tracking decisions are revisited with real consent.

---

## 8. Where this document goes stale

It is a map between a fixed document and a moving tree. Two things will drift first:

- **§7's gap list**, every time one of the gaps closes. Delete the row and say
  where it went; a gap list nobody trusts is worse than no gap list.
- **§4's coverage column**, whenever a Settings section grows. The route count is
  stable at nine; what each route covers is not.

If the wider AI Creator OS is ever built here — flows 1 and 2 — this file stops
being an alignment note and becomes the argument for how three flows share one
project shell. That is a spec, not a doc. Write it in `specs/`.
