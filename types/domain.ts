/**
 * The domain model, specified in docs/data-model.md. Everything below is
 * reachable from `Project`; there are no orphan types.
 */

export type ProjectStatus =
  | "draft"
  | "analysing"
  | "video_pending"
  | "email_pending"
  | "ready_for_review"
  | "sent"
  | "failed";

export type WorkflowStepId =
  | "report"
  | "recipient"
  | "analysis"
  | "video"
  | "email"
  | "review";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

/**
 * The envelope every long-running AI operation returns. It is the reason the
 * UI never shows an indeterminate spinner (CLAUDE.md rule 5).
 */
export interface Job<T> {
  id: string;
  kind: "parse" | "analysis" | "script" | "video" | "email" | "send";
  status: JobStatus;
  /** 0–100, always meaningful. */
  progress: number;
  /** Human-readable, e.g. "Rendering avatar". */
  stage: string;
  startedAt: string;
  finishedAt?: string;
  /** Present only when succeeded. */
  result?: T;
  /** `retryable` drives whether JobProgressCard offers a Retry. */
  error?: { code: string; message: string; retryable: boolean };
}

export interface Report {
  id: string;
  fileName: string;
  fileType: "pdf" | "docx";
  sizeBytes: number;
  pageCount?: number;
  uploadedAt: string;
  status: "uploading" | "parsing" | "parsed" | "failed";
  /** First ~500 chars, for upload confirmation. */
  excerpt?: string;
  storageUrl?: string;
}

export type PersonalisationLevel = "low" | "medium" | "high";

/**
 * Client PII. Never log it, never place any field in a URL query string, never
 * send it to a third party the user did not configure (CLAUDE.md rule 11).
 */
export interface Recipient {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  industry?: string;
  businessPriorities: string[];
  personalisation: PersonalisationLevel;
}

export interface Insight {
  id: string;
  title: string;
  detail: string;
}

export interface TalkingPoint {
  id: string;
  order: number;
  text: string;
  /** The user can drop a point from the script. */
  included: boolean;
}

export interface Analysis {
  id: string;
  projectId: string;
  executiveSummary: string;
  keyInsights: Insight[];
  talkingPoints: TalkingPoint[];
  generatedAt: string;
  /** Set true on first user edit. */
  editedByUser: boolean;
}

export interface Script {
  id: string;
  projectId: string;
  body: string;
  estimatedDurationSec: number;
  styleId: string;
  editedByUser: boolean;
}

export type PresetKind =
  | "avatar"
  | "voice"
  | "scriptStyle"
  | "videoTemplate"
  | "branding"
  | "cta"
  | "signature"
  | "segment";

export interface Preset {
  id: string;
  kind: PresetKind;
  name: string;
  description?: string;
  isDefault: boolean;
  thumbnailUrl?: string;
  /** Kind-specific, opaque to the workflow. */
  config: Record<string, unknown>;

  /**
   * Set when a preset is archived. Presets are NEVER deleted (specs/008 §3.3).
   *
   * A sent `CommunicationPackage` stores `email.ctaId`, `email.signatureId`,
   * `video.avatarId` and `video.voiceId` as REFERENCES, and `/campaigns/[id]`
   * exists to say what was sent. Destroying a preset would make that page
   * quietly show less than the truth about a message that already reached a
   * client — it would not break, which is what makes it the worst shape of
   * data loss.
   *
   * The rule: anything a historical record can reference is archived, not
   * destroyed. `listPresets` excludes archived rows unless asked, which is what
   * keeps them out of the workflow's dropdowns without every caller having to
   * remember.
   */
  archivedAt?: string;
}

export interface Avatar extends Preset {
  kind: "avatar";
  previewUrl: string;
}

export interface Voice extends Preset {
  kind: "voice";
  sampleUrl: string;
}

export interface CTA extends Preset {
  kind: "cta";
  label: string;
  url: string;
}

export type VideoFormat = "landscape" | "portrait";

/**
 * The exactly-five controls the Video step is allowed to expose. Branding is
 * applied from the active brand preset, not chosen here (CLAUDE.md rule 1).
 */
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
  /** The thumbnail embedded in the email. */
  posterUrl?: string;
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

/**
 * The deliverable the whole product exists to produce: email + video + CTA +
 * report, approved by a human.
 */
export interface CommunicationPackage {
  id: string;
  projectId: string;
  recipient: Recipient;
  email: EmailDraft;
  video: VideoAsset;
  /** Always present — the package requires it. */
  reportAttachment: Report;
  approvedAt?: string;
  approvedBy?: string;
  sentAt?: string;
  status: "assembling" | "ready" | "approved" | "sending" | "sent" | "failed";
}


/**
 * The workspace-level document behind `/settings/analytics` and
 * `/settings/security`. One record, not a list — the two sections of Settings
 * that configure the product rather than catalogue presets (specs/008 §3.5).
 */
export interface WorkspaceSettings {
  /**
   * The consent gate spec 006 §3.3 assigned to `/settings/analytics`:
   * "`/analytics` may only display metrics whose collection
   * `/settings/analytics` has switched on."
   *
   * EVERY FIELD HERE DEFAULTS FALSE, and that is a product decision rather
   * than a placeholder (specs/008 §3.7). A product whose proposition is that a
   * human approves every send does not open with recipient tracking already
   * enabled and a checkbox to find.
   */
  tracking: {
    /**
     * Open tracking is unreliable by construction — Apple's Mail Privacy
     * Protection fetches remote content "regardless of whether you engage with
     * the email" (specs/006 §2.2). The screen says so beside this toggle; a
     * switch that promises a number the product cannot compute is worse than
     * no switch.
     */
    opens: boolean;
    clicks: boolean;
    /** Whether a recipient is told that anything is measured. */
    discloseToRecipient: boolean;
  };

  /** `/settings/security`. Retention is counted in days; 0 means "keep". */
  retention: {
    reportDays: number;
    packageDays: number;
    /** Whether deleting a project also removes its recipient record. */
    purgeRecipientWithProject: boolean;
  };
}

/**
 * What `/settings/usage` reports. Read-only by design: a control that changed a
 * quota would be a billing action, and this product has no billing (specs/008
 * §3.5). The section answers "what have I used", and the answer is not
 * editable.
 */
export interface Usage {
  periodStart: string;
  periodEnd: string;
  videosGenerated: number;
  videoQuota: number;
  emailsSent: number;
  emailQuota: number;
  /** Minor units, so no floating-point money. */
  spendMinorUnits: number;
  currency: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
  report?: Report;
  recipient?: Recipient;
  analysis?: Analysis;
  script?: Script;
  video?: VideoAsset;
  email?: EmailDraft;
  package?: CommunicationPackage;
}

/** The four windows `/analytics` can be viewed through. A four-value enum that
 *  identifies nobody, which is why specs/006 §3.6 lets it into the URL while
 *  specs/004 §4 keeps the projects search box out of it. */
export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

/**
 * What `/analytics` reports (specs/006 §3.5).
 *
 * Everything here is derived from the product's record of its OWN work. There
 * is deliberately no open rate, click-through rate or engagement score: a
 * pixel-derived open rate is unmeasurable for a large share of recipients
 * (specs/006 §2.2), and collecting one means instrumenting a named client,
 * which is `/settings/analytics`'s decision to make and not this screen's to
 * display (§3.3).
 *
 * Aggregates only. No field here is or may become per-recipient — §3.4 makes
 * that permanent, including after tracking is switched on.
 */
export interface AnalyticsSummary {
  range: AnalyticsRange;
  /** Inclusive ISO bounds, so the screen can label what it is showing. */
  from: string;
  to: string;

  packagesSent: number;
  videosGenerated: number;
  emailsSent: number;
  sendsFailed: number;

  /**
   * NULL, never 0, when the period holds no sends.
   *
   * A `0%` success rate rendered from an absence reads as a catastrophe, and
   * "no data" and "everything failed" are the two facts a reporting screen most
   * needs to keep apart (specs/006 §4).
   */
  successRate: number | null;
  medianHoursToSend: number | null;

  /** One point per bucket, oldest first, INCLUDING empty ones. A gap in a time
   *  series is data; skipping empty buckets is how a line chart silently lies
   *  about its x-axis. */
  sentOverTime: { bucketStart: string; count: number }[];
  /** Named so the axis can be labelled honestly rather than guessed at. */
  bucket: "day" | "week";

  /** Every ProjectStatus, including the zeroes — a status missing from the
   *  chart and a status at zero are different facts. NOT filtered by `range`:
   *  "where is work sitting" is a present-tense question. */
  projectsByStatus: { status: ProjectStatus; count: number }[];
}

/**
 * The dashboard's three headline numbers.
 *
 * NOT in docs/data-model.md's `ApiClient` interface, which is an omission in
 * that document: docs/screens.md specifies `useQuery(['stats'])` and the same
 * file's query-key factory already reserves a `stats` key, but no method
 * returns them. Added here and in ApiClient; docs/data-model.md needs the
 * matching correction.
 */
export interface DashboardStats {
  activeProjects: number;
  videosGenerated: number;
  emailsSent: number;
}

/**
 * What `signupAction` accepts (specs/011 §3.5 — was `api.createAccount`'s
 * input under specs/009 §3.1). Real now: `password` was added when specs/011
 * built an actual account store and login to check it against, reopening
 * specs/009 §3.1's original "no password field" decision. No
 * confirm-password, no terms checkbox — the rest of specs/009 §2.1's
 * reasoning still holds for those two.
 */
export interface SignupInput {
  name: string;
  workEmail: string;
  company: string;
  password: string;
}

/** What `loginAction` accepts (specs/011 §3.5). */
export interface LoginInput {
  workEmail: string;
  password: string;
}

/**
 * The safe account DTO — never `passwordHash` (specs/011 §4's DTO
 * discipline). Returned by `signupAction`/`loginAction` on success and by
 * `getCurrentAccount()` (`lib/auth/dal.ts`); used once per session-establishing
 * action to redirect, and by the DAL wherever a Server Component needs the
 * signed-in account's name/email/company.
 *
 * PII by analogy (CLAUDE.md rule 11, specs/009 §2.4): `name` and
 * `workEmail` describe the person using the product, not a `Recipient`, but
 * the same discipline applies — never logged, never placed in a URL.
 */
export interface WorkspaceAccount {
  id: string;
  name: string;
  workEmail: string;
  company: string;
  /** ISO 8601. */
  createdAt: string;
}
