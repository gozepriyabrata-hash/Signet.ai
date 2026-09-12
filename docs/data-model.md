# Data Model & Service Seam

The UI is mock-first: every screen is fully clickable with no backend running.
One environment flag swaps the mock adapter for the real one, and that swap
touches exactly one file.

**One subsystem is exempt and always real:** accounts, sessions and password
reset (§4). Everything else on this page is mock-backed today.

---

## 1. Domain types — `types/index.ts`

Everything below is reachable from `Project`. No orphan types.

```ts
export type ProjectStatus =
  | "draft"
  | "analysing"
  | "video_pending"
  | "email_pending"
  | "ready_for_review"
  | "sent"
  | "failed";

export type WorkflowStepId =
  | "report" | "recipient" | "analysis" | "video" | "email" | "review";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;          // ISO 8601
  updatedAt: string;
  report?: Report;
  recipient?: Recipient;
  analysis?: Analysis;
  script?: Script;
  video?: VideoAsset;
  email?: EmailDraft;
  package?: CommunicationPackage;
}
```

### Job envelope

Every long-running AI operation returns this. It is the reason the UI never
shows an indeterminate spinner.

```ts
export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface Job<T> {
  id: string;
  kind: "parse" | "analysis" | "script" | "video" | "email" | "send";
  status: JobStatus;
  progress: number;           // 0–100, always meaningful
  stage: string;              // human-readable, e.g. "Rendering avatar"
  startedAt: string;
  finishedAt?: string;
  result?: T;                 // present only when succeeded
  error?: { code: string; message: string; retryable: boolean };
}
```

`error.retryable` drives whether `JobProgressCard` shows a Retry button.

### Inputs

```ts
export interface Report {
  id: string;
  fileName: string;
  fileType: "pdf" | "docx";
  sizeBytes: number;
  pageCount?: number;
  uploadedAt: string;
  status: "uploading" | "parsing" | "parsed" | "failed";
  excerpt?: string;           // first ~500 chars, for upload confirmation
  storageUrl?: string;
}

export type PersonalisationLevel = "low" | "medium" | "high";

export interface Recipient {
  id: string;
  name: string;               // required
  role: string;               // required
  company: string;            // required
  email: string;
  industry?: string;
  businessPriorities: string[];
  personalisation: PersonalisationLevel;
}
```

> `Recipient` is client PII. Never log it, never place any field in a URL query
> string, never send it anywhere the user has not configured.

### AI output — all of it user-editable

```ts
export interface Analysis {
  id: string;
  projectId: string;
  executiveSummary: string;
  keyInsights: Insight[];
  talkingPoints: TalkingPoint[];
  generatedAt: string;
  editedByUser: boolean;      // set true on first user edit
}

export interface Insight { id: string; title: string; detail: string; }

export interface TalkingPoint {
  id: string;
  order: number;
  text: string;
  included: boolean;          // user can drop a point from the script
}

export interface Script {
  id: string;
  projectId: string;
  body: string;
  estimatedDurationSec: number;
  styleId: string;            // → ScriptStylePreset
  editedByUser: boolean;
}
```

### Presets — the Settings-owned surface

The whole ~39-item configuration list collapses into presets. Workflow dropdowns
render these; they never define them.

```ts
export type PresetKind =
  | "avatar" | "voice" | "scriptStyle" | "videoTemplate"
  | "branding" | "cta" | "signature" | "segment";

export interface Preset {
  id: string;
  kind: PresetKind;
  name: string;
  description?: string;
  isDefault: boolean;
  thumbnailUrl?: string;
  config: Record<string, unknown>;   // kind-specific, opaque to the workflow
  archivedAt?: string;               // presets are archived, NEVER deleted
}

export interface Avatar extends Preset { kind: "avatar"; previewUrl: string; }
export interface Voice  extends Preset { kind: "voice";  sampleUrl: string; }
export interface CTA    extends Preset { kind: "cta";    label: string; url: string; }
```

`archivedAt` is the whole of `specs/008` §3.3 in one optional field. A sent
`CommunicationPackage` stores `email.ctaId`, `email.signatureId`,
`video.avatarId` and `video.voiceId` as **references**, and `/campaigns/[id]`
exists to say what was sent. Destroying a preset would make that page quietly
show less than the truth about a message that already reached a client — it
would not break, which is what makes it the worst shape of data loss. The rule:
anything a historical record can reference is archived, not destroyed.

### Outputs

```ts
export type VideoFormat = "landscape" | "portrait";

/** The exactly-five controls the Video step is allowed to expose.
 *  Branding is applied from the active brand preset, not chosen here. */
export interface VideoOptions {
  avatarId: string;
  voiceId: string;
  scriptStyleId: string;
  format: VideoFormat;
  captions: boolean;
}

export interface VideoAsset {
  id: string;
  projectId: string;
  jobId: string;
  avatarId: string;
  voiceId: string;
  format: VideoFormat;
  captions: boolean;
  brandingId?: string;
  playbackUrl?: string;
  posterUrl?: string;         // the thumbnail embedded in the email
  durationSec?: number;
}

export interface EmailDraft {
  id: string;
  projectId: string;
  subject: string;
  greeting: string;
  body: string;
  ctaId: string;
  signatureId: string;
  editedByUser: boolean;
}

export interface CommunicationPackage {
  id: string;
  projectId: string;
  recipient: Recipient;
  email: EmailDraft;
  video: VideoAsset;
  reportAttachment: Report;   // always present — the package requires it
  approvedAt?: string;
  approvedBy?: string;
  sentAt?: string;
  status: "assembling" | "ready" | "approved" | "sending" | "sent" | "failed";
}
```

### Workspace-level documents

Four types that are not reachable from `Project`. They are the deliberate
exceptions to the "no orphan types" rule above, because each is an aggregate or
a workspace setting rather than a part of one project.

```ts
/** The three headline numbers on /dashboard. */
export interface DashboardStats {
  activeProjects: number;
  videosGenerated: number;
  emailsSent: number;
}

/** One record, not a list — behind /settings/analytics and /settings/security. */
export interface WorkspaceSettings {
  tracking: {
    opens: boolean;                 // EVERY FIELD HERE DEFAULTS FALSE
    clicks: boolean;
    discloseToRecipient: boolean;   // whether a recipient is told anything is measured
  };
  retention: {
    reportDays: number;             // counted in days; 0 means "keep"
    packageDays: number;
    purgeRecipientWithProject: boolean;
  };
}

/** What /settings/usage reports. Read-only: a control that changed a quota
 *  would be a billing action, and this product has no billing. */
export interface Usage {
  periodStart: string;
  periodEnd: string;
  videosGenerated: number;
  videoQuota: number;
  emailsSent: number;
  emailQuota: number;
  spendMinorUnits: number;          // minor units, so no floating-point money
  currency: string;
}

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

/** What /analytics reports. Aggregates only, permanently — no field here is or
 *  may become per-recipient (specs/006 §3.4). */
export interface AnalyticsSummary {
  range: AnalyticsRange;
  from: string;                     // inclusive ISO bounds, so the screen can
  to: string;                       // label what it is showing
  packagesSent: number;
  videosGenerated: number;
  emailsSent: number;
  sendsFailed: number;
  successRate: number | null;       // NULL, never 0, when a period holds no sends
  medianHoursToSend: number | null;
  sentOverTime: { bucketStart: string; count: number }[];  // INCLUDING empty buckets
  bucket: "day" | "week";
  projectsByStatus: { status: ProjectStatus; count: number }[];  // including zeroes
}
```

Three of those comments are load-bearing and are the reason the shapes look
over-specified:

- **`WorkspaceSettings.tracking` defaults every field to `false`.** That is a
  product decision, not a placeholder (`specs/008` §3.7). A product whose
  proposition is that a human approves every send does not open with recipient
  tracking already enabled and a checkbox to find.
- **`successRate` and `medianHoursToSend` are `number | null`, never `0`.** A
  `0%` success rate rendered from an absence reads as a catastrophe, and "no
  data" and "everything failed" are the two facts a reporting screen most needs
  to keep apart (`specs/006` §4).
- **`sentOverTime` includes empty buckets and `projectsByStatus` includes
  zeroes.** A gap in a time series is data; skipping empty buckets is how a line
  chart silently lies about its x-axis, and a status missing from a chart and a
  status at zero are different facts.

---

`CommunicationPackage` is the deliverable the whole product exists to produce:
email + video + CTA (via `email.ctaId`) + report, approved by a human.

**Two PRD obligations have no field here yet** — the AI disclosure a recipient
is owed, and the provenance trail that ties a generated claim back to a page of
the report. Both are `CLAUDE.md` rules 13 and 14, and both land in these types
when they land at all: a citation the UI cannot render is not a citation. See
`docs/prd-alignment.md` §7.

---

## 2. The service seam — `lib/api/`

```
lib/api/
  index.ts        ← picks the adapter; the ONLY file that changes for a real backend
  types.ts        ← the ApiClient interface
  mock/           ← fixtures, fake latency, simulated job progression
  real/           ← HTTP calls (stubs for now)
```

**Accounts and sessions are not an `ApiClient` concern** (specs/011). `index.ts`'s
mock/real switch is global — a login method half-implemented in `real/` would
break every other screen the moment mocks were turned off. `lib/auth/` is a
separate, always-real subsystem instead: Server Actions
(`signupAction`/`loginAction`/`logoutAction`), a `jose`-signed session cookie,
a `cookies()`-based Data Access Layer, and one SQLite table (`lib/db/schema.ts`).
It is the one part of this repo that is not mock-backed, by direct instruction —
see specs/011 §2.1 for why that departs from this document's "mock-backed
today" framing everywhere else, and **§4 below for the schema itself**.

```ts
/** `query` matches `Project.name` ONLY. It must never be extended to search
 *  `Recipient` fields — see the note under Recipient, and specs/004 §4. */
export interface ListProjectsOptions {
  status?: ProjectStatus;
  query?: string;
}

/** Archived presets are a deliberate opt-in; see `listPresets`. */
export interface ListPresetsOptions {
  includeArchived?: boolean;
}

/** What a settings screen may set on a preset. `id`, `kind` and `archivedAt`
 *  are the adapter's, not the form's. */
export interface PresetInput {
  name: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface ApiClient {
  listProjects(options?: ListProjectsOptions): Promise<Project[]>;
  getProject(id: string): Promise<Project>;
  /** `name` is optional — the dashboard's hero card passes typed text;
   *  every other caller omits it and gets the adapter's default. */
  createProject(name?: string): Promise<Project>;
  getStats(): Promise<DashboardStats>;

  uploadReport(projectId: string, file: File): Promise<Job<Report>>;
  analyzeReport(projectId: string, recipient: Recipient): Promise<Job<Analysis>>;
  generateScript(projectId: string, analysis: Analysis): Promise<Job<Script>>;
  generateVideo(projectId: string, opts: VideoOptions): Promise<Job<VideoAsset>>;
  generateEmail(projectId: string): Promise<Job<EmailDraft>>;

  getJob<T>(jobId: string): Promise<Job<T>>;

  /** Stop a running job. Resolves it to `failed` with a CANCELLED code rather
   *  than adding an eighth JobStatus (specs/007 §3.7). */
  cancelJob(jobId: string): Promise<Job<unknown>>;

  /** Archived presets are EXCLUDED unless asked for, which is what keeps them
   *  out of the workflow's dropdowns without every caller remembering. */
  listPresets(kind: PresetKind, options?: ListPresetsOptions): Promise<Preset[]>;
  createPreset(kind: PresetKind, input: PresetInput): Promise<Preset>;
  updatePreset(id: string, input: Partial<PresetInput>): Promise<Preset>;
  /** Archive, never delete: a sent package references preset ids and
   *  /campaigns/[id] exists to say what was sent (specs/008 §3.3). There is
   *  deliberately no deletePreset. */
  archivePreset(id: string): Promise<Preset>;
  restorePreset(id: string): Promise<Preset>;
  /** Exclusive per kind — two defaults is a silent bug. */
  setDefaultPreset(id: string): Promise<Preset>;

  listRecipients(): Promise<Recipient[]>;
  saveRecipient(input: Recipient): Promise<Recipient>;
  /** A REAL delete — the one place specs/008 does not archive. A sent package
   *  holds its own copy of the recipient, so history survives (§3.4). */
  deleteRecipient(id: string): Promise<void>;

  /** Read-only. A control that changed a quota would be a billing action, and
   *  this product has no billing (specs/008 §3.5). */
  getUsage(): Promise<Usage>;

  getSettings(): Promise<WorkspaceSettings>;
  updateSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings>;
  buildPackage(projectId: string): Promise<CommunicationPackage>;

  /** Sent-package history for /campaigns. Terminal states only — `sent` and
   *  `failed` — most recently sent first. No options object: the screen has no
   *  filters, and specs/005 §3.9 keeps it that way on purpose. */
  listPackages(): Promise<CommunicationPackage[]>;

  /** Keyed by the PACKAGE's id, not its project's (specs/005 §3.2). Rejects
   *  with a NOT_FOUND-coded error; see `isNotFoundError` in lib/api/errors.ts. */
  getPackage(id: string): Promise<CommunicationPackage>;

  /** The /analytics figures, aggregated on THIS side of the seam. Counts, never
   *  records: deriving them in the browser would hold every Recipient in the
   *  memory of the one screen forbidden to display them (specs/006 §3.5). */
  getAnalytics(range: AnalyticsRange): Promise<AnalyticsSummary>;

  sendPackage(packageId: string): Promise<Job<CommunicationPackage>>;
}
```

```ts
// lib/api/index.ts
import { mockClient } from "./mock";
import { realClient } from "./real";

export const api: ApiClient =
  process.env.NEXT_PUBLIC_USE_MOCKS === "false" ? realClient : mockClient;
```

Mocks are the **default**, so a fresh clone runs with no configuration.
Components import `api` — never a mock module directly.

Setting `NEXT_PUBLIC_USE_MOCKS=false` today gets you `realClient`, whose every
method throws a named `notImplemented` error rather than returning an empty
result. That is deliberate: a stub that resolves to `[]` looks like an empty
workspace, and the difference between "no data" and "no backend" is the thing a
developer most needs told.

### Mock adapter rules — `lib/api/mock/`

- **Seeded fixtures.** A deterministic seed so screenshots and demos are stable
  across reloads. Seven seed projects spanning every `ProjectStatus`, plus ten
  already-sent packages behind `/campaigns` and `/analytics` — enough history
  that the charts have a real shape rather than three points.
- **Realistic latency.** 300–800ms for reads and mutations. Not instant — the
  loading states must be visible during development or they rot.
- **Real job progression.** `getJob` advances `progress` and `stage` on each
  call against an in-memory clock, so polling exercises the real code path:
  parse ~3s, analysis ~6s, video ~25s, email ~4s.
- **Forceable failures.** A deterministic hook so error states are buildable and
  reviewable without waiting for a real outage:
  - any project named with the prefix `FAIL_` fails at its next job, and
  - `?mockFail=video` in the URL fails that job kind once.
  Failures set `error.retryable` so the Retry path is exercised too.
- Mock data is persisted to `sessionStorage` so a page refresh mid-workflow does
  not reset the demo.

---

## 3. TanStack Query conventions

```ts
export const qk = {
  projects: (status?: string, query?: string) =>
    ["projects", status ?? "all", query ?? ""] as const,
  project:  (id: string)      => ["project", id] as const,
  job:      (id: string)      => ["job", id] as const,
  presets:  (kind: PresetKind, includeArchived = false) =>
    ["presets", kind, includeArchived] as const,

  // Two keys, because there are two questions. `package` is "this package, by
  // its own id" and belongs to /campaigns/[id]; `packageForProject` is "the
  // package for this project", which Review asks before any package id exists.
  // They were one entry meaning both things until specs/005 §3.2 split them —
  // the strings never collided, the meanings did.
  package:  (packageId: string) => ["package", packageId] as const,
  packageForProject: (projectId: string) =>
    ["package", "for-project", projectId] as const,
  packages: ()                => ["packages"] as const,
  analytics: (range: AnalyticsRange) => ["analytics", range] as const,
  recipients: ()              => ["recipients"] as const,
  settings:   ()              => ["settings"] as const,
  usage:      ()              => ["usage"] as const,

  stats:    ()                => ["stats"] as const,
};
```

### Polling rule — `hooks/use-job-polling.ts`

One hook owns all job polling. Nothing else calls `getJob`.

```ts
useQuery({
  queryKey: qk.job(jobId),
  queryFn: () => api.getJob(jobId),
  enabled: Boolean(jobId),
  refetchInterval: (query) => {
    const s = query.state.data?.status;
    return s === "queued" || s === "running" ? 2000 : false;  // stop on terminal
  },
});
```

On a terminal status the hook invalidates `qk.project(projectId)` so the
workflow picks up the new asset, then stops. Never poll a `succeeded` or
`failed` job — that is a bug, not a safety net.

### State ownership, restated

| Data | Owner |
|---|---|
| Projects, reports, jobs, presets, package | TanStack Query |
| Current step, unsaved draft edits, dropzone state | Zustand `workflow-store` |
| Sidebar collapse, theme, preview device | Zustand `ui-store` (persisted) |

Never fetch inside a Zustand store. Never put the step index in the Query cache.
Draft edits stay in Zustand until the step's Next commits them through a
mutation — that is what makes back-navigation lossless.

**"Current step" in that table is the *resume position*, not a stored index.**
The step a user is on is the URL, because the step *is* the address: it survives
a refresh, it is linkable, and the Back button already moves it correctly.
`lib/workflow.ts` derives the resume position from the project's data instead of
storing it, so the stepper and the `/projects/[id]` redirect cannot drift apart
and leave no test able to say which one is wrong (`specs/007` §3.5, §4).

---

## 4. The auth schema — the one real database

Everything above is mock-backed. This is not. `specs/011` and `specs/014` build
account creation, login, logout and password reset for real, against two SQLite
tables, because a login form has nothing to check a credential against
otherwise.

```ts
// lib/db/schema.ts
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  workEmail: text("work_email").notNull().unique(),
  company: text("company").notNull(),
  passwordHash: text("password_hash").notNull(),   // never leaves the DAL
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),      // SHA-256 of the token, not the token
  accountId: text("account_id").notNull().references(() => accounts.id),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
```

**There is no `sessions` table.** Sessions are stateless, carried entirely in a
`jose`-signed cookie (`lib/auth/session.ts`, `specs/011` §3.2).

**The reset token's primary key is a hash of the token, never the token.** A
database read alone must not be enough to reset an account's password — the same
reasoning `accounts.passwordHash` already applies to login credentials. Rows are
single-use and deleted the moment they are consumed. It is a database row rather
than a signed JWT because revocability is the one property this token needs that
a session does not (`specs/014` §3.2).

### The DTO discipline

`passwordHash` is never returned from a Server Action or from the DAL. What
crosses that boundary is `WorkspaceAccount`, and the two input shapes:

```ts
export interface SignupInput { name: string; workEmail: string; company: string; password: string; }
export interface LoginInput  { workEmail: string; password: string; }

/** The safe account DTO. Returned by signupAction/loginAction on success and by
 *  getCurrentAccount(). PII by analogy with rule 11: `name` and `workEmail`
 *  describe the person using the product rather than a Recipient, but the same
 *  discipline applies — never logged, never placed in a URL. */
export interface WorkspaceAccount {
  id: string; name: string; workEmail: string; company: string; createdAt: string;
}
```

### Driver and deployment

`drizzle-orm/libsql`, not `better-sqlite3`. The same client works against a
local file in dev (`DATABASE_FILE_PATH`, default `./data/app.db`, gitignored)
and a hosted Turso database in production (`TURSO_DATABASE_URL` +
`TURSO_AUTH_TOKEN`) — a serverless deployment has no writable, persistent
filesystem for a plain SQLite file, and native bindings are a build risk this
repo does not need to take. `getDb()` constructs lazily, so importing the module
does not open a database during a build step that never touches one.

> `specs/011` §7 still lists `better-sqlite3` and `@types/better-sqlite3` as the
> dependencies it added. That is the spec recording what was true when it was
> written; the swap to libsql came later and is recorded here rather than by
> editing an accepted spec's history.

### Route protection

`proxy.ts` — Next 16's rename of `middleware.ts`, deprecated rather than
aliased — reads only the cookie's shape, with no database round-trip, per the
Next.js Authentication guide's own instruction for optimistic checks. **It is
the only protection layer today**, and that is a known limit rather than the
finished boundary: `specs/003` §3.3 committed every `(app)` route to
client-side-only fetching with no server prefetch, so there is no
server-rendered protected data yet for a DAL guard to sit in front of
(`specs/011` §2.5).
