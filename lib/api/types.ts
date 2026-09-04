import type {
  Analysis,
  AnalyticsRange,
  AnalyticsSummary,
  CommunicationPackage,
  DashboardStats,
  EmailDraft,
  Job,
  Preset,
  PresetKind,
  Project,
  ProjectStatus,
  Recipient,
  Report,
  Script,
  VideoAsset,
  Usage,
  VideoOptions,
  WorkspaceSettings,
} from "@/types";

/**
 * Options for a project listing.
 *
 * `query` is a free-text search and matches `Project.name` ONLY. It must never
 * be extended to search `Recipient` fields: specs/004 §4 keeps the search box
 * out of the URL precisely because project names already carry client
 * identity, and searching the recipient record would put that identity behind
 * a text box as well.
 */
export interface ListProjectsOptions {
  status?: ProjectStatus;
  query?: string;
}

/**
 * The service seam, per docs/data-model.md §2.
 *
 * Components import the `api` singleton from `@/lib/api` — never a mock module
 * directly. Swapping to a real backend touches `lib/api/index.ts` and nothing
 * else.
 */
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
  createProject(): Promise<Project>;

  /**
   * Not in docs/data-model.md's interface — see the note on `DashboardStats`.
   * docs/screens.md requires it and the query-key factory already reserves the
   * key, so the omission is in that document, not here.
   */
  getStats(): Promise<DashboardStats>;

  uploadReport(projectId: string, file: File): Promise<Job<Report>>;
  analyzeReport(projectId: string, recipient: Recipient): Promise<Job<Analysis>>;
  generateScript(projectId: string, analysis: Analysis): Promise<Job<Script>>;
  generateVideo(projectId: string, opts: VideoOptions): Promise<Job<VideoAsset>>;
  generateEmail(projectId: string): Promise<Job<EmailDraft>>;

  getJob<T>(jobId: string): Promise<Job<T>>;

  /**
   * Stop a running job. The one job transition a user initiates.
   *
   * Resolves the job to `failed` with a `CANCELLED` code rather than adding an
   * eighth `JobStatus` member (specs/007 §3.7). The trade is deliberate and is
   * the decision in that spec most likely to be revisited: it means "you
   * cancelled this" and "this broke" are the same status with different
   * messages, and the code is what tells them apart.
   */
  cancelJob(jobId: string): Promise<Job<unknown>>;

  /**
   * Presets of one kind, defaults first.
   *
   * **Archived presets are excluded unless asked for.** That default is what
   * keeps them out of every workflow dropdown without each call site having to
   * remember (specs/008 §3.4) — the Video and Email steps pass nothing and stay
   * correct.
   */
  listPresets(kind: PresetKind, options?: ListPresetsOptions): Promise<Preset[]>;

  createPreset(kind: PresetKind, input: PresetInput): Promise<Preset>;
  updatePreset(id: string, input: Partial<PresetInput>): Promise<Preset>;

  /**
   * Archive, not delete — and there is deliberately no `deletePreset`
   * (specs/008 §3.3). A sent `CommunicationPackage` references preset ids, and
   * `/campaigns/[id]` exists to say what was sent; destroying a preset makes
   * that page quietly show less than the truth about a message already
   * delivered.
   */
  archivePreset(id: string): Promise<Preset>;
  restorePreset(id: string): Promise<Preset>;

  /** Exclusive per kind: setting one default clears the others, because two
   *  defaults is a silent bug nothing would surface. */
  setDefaultPreset(id: string): Promise<Preset>;

  /**
   * The saved-recipient store. `deleteRecipient` is a REAL delete — the one
   * place specs/008 does not archive. A saved recipient is a person, and "we
   * kept it, just hidden" is the wrong answer to "remove this person"; a sent
   * package holds its own copy, so history survives without the store having
   * to (§3.4).
   */
  listRecipients(): Promise<Recipient[]>;
  saveRecipient(input: Recipient): Promise<Recipient>;
  deleteRecipient(id: string): Promise<void>;

  /** Read-only. A control that changed a quota would be a billing action, and
   *  this product has no billing (specs/008 §3.5). */
  getUsage(): Promise<Usage>;

  getSettings(): Promise<WorkspaceSettings>;
  updateSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings>;
  buildPackage(projectId: string): Promise<CommunicationPackage>;

  /**
   * Sent-package history, for `/campaigns` (specs/005 §3.3).
   *
   * Returns packages in a terminal send state — `sent` and `failed` — most
   * recently sent first. Mid-workflow states belong to a project, not to a
   * history; a history screen that shows work in progress is a second projects
   * list (specs/005 §3.6).
   *
   * No options object, and that is a decision rather than an omission: specs/005
   * §3.9 ships the screen with zero controls, so there is nothing to filter by.
   * A filter arrives here as an options object when one is justified, the way
   * `listProjects` gained `ListProjectsOptions` in specs/004.
   */
  listPackages(): Promise<CommunicationPackage[]>;

  /** One sent package, keyed by `CommunicationPackage.id` — NOT by project id
   *  (specs/005 §3.2). Rejects with a `NOT_FOUND`-coded error for an unknown
   *  id; see `isNotFoundError` in lib/api/errors.ts. */
  getPackage(id: string): Promise<CommunicationPackage>;

  /**
   * The `/analytics` figures, aggregated on THIS side of the seam (specs/006
   * §3.5).
   *
   * Returning counts rather than records is a rule 11 decision as much as an
   * architectural one: deriving these numbers in the browser would mean holding
   * every `CommunicationPackage`, each carrying a full `Recipient`, in the
   * memory of the one screen forbidden to display them.
   */
  getAnalytics(range: AnalyticsRange): Promise<AnalyticsSummary>;

  /**
   * Reachable only from the Review screen, and only after an explicit human
   * approval (CLAUDE.md rule 2). Never call this from an effect or on mount.
   */
  sendPackage(packageId: string): Promise<Job<CommunicationPackage>>;
}
