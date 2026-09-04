import type {
  ApiClient,
  ListPresetsOptions,
  ListProjectsOptions,
  PresetInput,
} from "@/lib/api/types";
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

import { SEED_COUNTERS, SEED_USAGE } from "./fixtures";
import {
  readPresets,
  readRecipients,
  readSettings,
  writePresets,
  writeRecipients,
  writeSettings,
} from "./settings-store";
import { cancelJobRecord, readJob, startJob } from "./jobs";
import { readProjects, writeProjects } from "./store";

/**
 * The mock adapter.
 *
 * Realistic latency on every call — 300–800ms — because loading states that are
 * never visible during development rot (docs/data-model.md). Deterministic, so
 * demos and screenshots are stable.
 *
 * Every method is implemented as of specs/007. What is still deliberately fake
 * is the *content*: a job's stages and durations are simulated (see ./jobs.ts),
 * and the generated copy is fixed text rather than anything a model produced.
 * Nothing here returns a plausible fake of a thing that failed — a missing
 * project or an incomplete package throws.
 */

/** Deterministic latency: same call shape, same delay, every run. */
function latencyFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return 300 + (Math.abs(hash) % 501); // 300–800ms
}

function delay(seed: string): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, latencyFor(seed)));
}

/**
 * Forceable failures, so error states are buildable and reviewable without
 * waiting for a real outage (docs/data-model.md). A project named with the
 * `FAIL_` prefix fails at its next job; `?mockFail=<kind>` fails that kind once.
 */
function shouldFail(kind: string): boolean {
  if (typeof window === "undefined") return false;
  const requested = new URLSearchParams(window.location.search).get("mockFail");
  return requested === kind;
}

class MockError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = true) {
    super(message);
    this.name = "MockError";
    this.code = code;
    this.retryable = retryable;
  }
}


const DAY_MS = 86_400_000;

/** Every ProjectStatus, in workflow order, so the breakdown can emit the zeroes
 *  rather than silently omitting a status nobody is currently sitting on. */
const ALL_STATUSES: readonly ProjectStatus[] = [
  "draft",
  "analysing",
  "video_pending",
  "email_pending",
  "ready_for_review",
  "sent",
  "failed",
];

/** Daily buckets read well over a week or a month; over 90 days or the whole
 *  history they would be hundreds of points on a 720px axis. The choice is
 *  returned in `AnalyticsSummary.bucket` so the axis label can be honest. */
function bucketFor(range: AnalyticsRange): "day" | "week" {
  return range === "7d" || range === "30d" ? "day" : "week";
}

function startOfDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export const mockClient: ApiClient = {
  async listProjects(options?: ListProjectsOptions): Promise<Project[]> {
    const { status, query } = options ?? {};
    // Seeded per distinct request, so two different searches do not share a
    // latency and a demo stays reproducible.
    await delay(`listProjects:${status ?? "all"}:${query ?? ""}`);
    if (shouldFail("projects")) {
      throw new MockError("MOCK_PROJECTS", "Could not load projects.");
    }

    const needle = query?.trim().toLowerCase();

    const visible = readProjects().filter((project) => {
      if (status && project.status !== status) return false;
      // Matches `name` and nothing else. Do not add `project.recipient` here —
      // see the note on ListProjectsOptions.
      if (needle && !project.name.toLowerCase().includes(needle)) return false;
      return true;
    });

    return [...visible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getProject(id: string): Promise<Project> {
    await delay(`getProject:${id}`);
    const project = readProjects().find((candidate) => candidate.id === id);
    if (!project) {
      throw new MockError("NOT_FOUND", `No project with id ${id}.`, false);
    }
    return project;
  },

  async createProject(): Promise<Project> {
    await delay("createProject");
    const projects = readProjects();
    const now = new Date().toISOString();
    const project: Project = {
      id: `prj_${Math.random().toString(16).slice(2, 8)}`,
      name: "Untitled project",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    writeProjects([project, ...projects]);
    return project;
  },

  async getStats(): Promise<DashboardStats> {
    await delay("getStats");
    if (shouldFail("stats")) {
      throw new MockError("MOCK_STATS", "Could not load statistics.");
    }

    const projects = readProjects();
    return {
      activeProjects: projects.filter(
        (project) => project.status !== "sent" && project.status !== "failed",
      ).length,
      videosGenerated: SEED_COUNTERS.videosGenerated,
      emailsSent: SEED_COUNTERS.emailsSent,
    };
  },

  /**
   * The sent-package history behind `/campaigns` (specs/005 §3.3).
   *
   * Derived from the project store rather than kept in a second collection, so
   * there is one source of truth and a future `sendPackage` only has to attach
   * a package to its project.
   *
   * Terminal states only. `assembling`, `ready`, `approved` and `sending` are
   * mid-workflow and belong to a project; a history that shows work in progress
   * is a second projects list (specs/005 §3.6).
   */
  async listPackages(): Promise<CommunicationPackage[]> {
    await delay("listPackages");
    if (shouldFail("campaigns")) {
      throw new MockError("MOCK_CAMPAIGNS", "Could not load your campaigns.");
    }

    return readProjects()
      .map((project) => project.package)
      .filter(
        (pkg): pkg is CommunicationPackage =>
          pkg !== undefined && (pkg.status === "sent" || pkg.status === "failed"),
      )
      .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""));
  },

  /** Keyed by the PACKAGE's id, not its project's (specs/005 §3.2). */
  async getPackage(id: string): Promise<CommunicationPackage> {
    await delay(`getPackage:${id}`);
    if (shouldFail("campaign")) {
      throw new MockError("MOCK_CAMPAIGN", "Could not load this campaign.");
    }

    const found = readProjects().find(
      (project) => project.package?.id === id,
    )?.package;

    if (!found) {
      // The code `lib/api/errors.ts` documents, so the screen can tell a
      // missing package from a failed lookup and offer a way back rather than
      // a Retry that can never succeed.
      throw new MockError("NOT_FOUND", `No package with id ${id}.`, false);
    }
    return found;
  },


  /**
   * The `/analytics` figures (specs/006 §3.5).
   *
   * Aggregated here rather than in the component, and not only because counting
   * is a backend's job: deriving these in the browser would mean shipping every
   * package — each carrying a full `Recipient` — into the memory of the one
   * screen forbidden to display them.
   *
   * Everything below is derived from the product's record of its own work.
   * Nothing is observed about a recipient, because nothing about a recipient is
   * observed anywhere in this product (§3.2).
   */
  async getAnalytics(range: AnalyticsRange): Promise<AnalyticsSummary> {
    await delay(`getAnalytics:${range}`);
    if (shouldFail("analytics")) {
      throw new MockError("MOCK_ANALYTICS", "Could not load your analytics.");
    }

    const projects = readProjects();
    const packages = projects
      .map((project) => project.package)
      .filter(
        (pkg): pkg is CommunicationPackage =>
          pkg !== undefined &&
          (pkg.status === "sent" || pkg.status === "failed"),
      );

    // "Now" is the latest thing in the store rather than Date.now(), so a
    // fixture set with fixed dates stays inside its own window and the demo
    // does not silently empty out as the calendar moves past it.
    const latest = Math.max(
      ...projects.map((project) => new Date(project.updatedAt).getTime()),
    );
    const spanDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const earliest = Math.min(
      ...projects.map((project) => new Date(project.createdAt).getTime()),
    );
    const fromMs =
      range === "all" ? earliest : latest - (spanDays - 1) * DAY_MS;

    const inWindow = packages.filter((pkg) => {
      if (!pkg.sentAt) return false;
      const at = new Date(pkg.sentAt).getTime();
      return at >= fromMs && at <= latest;
    });

    const sent = inWindow.filter((pkg) => pkg.status === "sent");
    const failed = inWindow.filter((pkg) => pkg.status === "failed");

    // null, not 0. "No data" and "everything failed" are the two facts a
    // reporting screen most needs to keep apart (specs/006 §4).
    const successRate =
      inWindow.length === 0 ? null : sent.length / inWindow.length;

    const hoursToSend = inWindow.flatMap((pkg) => {
      const project = projects.find(
        (candidate) => candidate.id === pkg.projectId,
      );
      if (!project || !pkg.sentAt) return [];
      const ms =
        new Date(pkg.sentAt).getTime() - new Date(project.createdAt).getTime();
      return ms >= 0 ? [ms / 3_600_000] : [];
    });

    const bucket = bucketFor(range);
    const step = bucket === "day" ? DAY_MS : 7 * DAY_MS;
    const firstBucket = startOfDay(fromMs);
    const lastBucket = startOfDay(latest);

    // Every bucket in the window, including the empty ones. A gap in a time
    // series is data; skipping empty buckets is how a line chart lies about its
    // x-axis without anyone noticing.
    const sentOverTime: AnalyticsSummary["sentOverTime"] = [];
    for (let at = firstBucket; at <= lastBucket; at += step) {
      const end = at + step;
      sentOverTime.push({
        bucketStart: new Date(at).toISOString(),
        count: sent.filter((pkg) => {
          const ms = new Date(pkg.sentAt ?? 0).getTime();
          return ms >= at && ms < end;
        }).length,
      });
    }

    return {
      range,
      from: new Date(fromMs).toISOString(),
      to: new Date(latest).toISOString(),

      packagesSent: sent.length,
      videosGenerated: SEED_COUNTERS.videosGenerated,
      emailsSent: SEED_COUNTERS.emailsSent,
      sendsFailed: failed.length,

      successRate,
      medianHoursToSend: median(hoursToSend),

      sentOverTime,
      bucket,

      // NOT filtered by the range. "Where is work sitting" is a present-tense
      // question, and answering it through a date window would make the chart
      // answer something nobody asked (specs/006 §3.5).
      projectsByStatus: ALL_STATUSES.map((status) => ({
        status,
        count: projects.filter((project) => project.status === status).length,
      })),
    };
  },

  // ── Jobs (CLAUDE.md rule 5) ───────────────────────────────────────────────
  // Every method below returns a Job envelope rather than a value. The engine
  // in ./jobs.ts derives status, stage and progress from elapsed time; these
  // methods only decide what kind of job to start and against which project.
  //
  // `shouldFail(kind)` is read once, at creation, so a job's outcome cannot
  // change between two polls of the same job.

  async uploadReport(projectId: string, file: File): Promise<Job<Report>> {
    await delay(`uploadReport:${projectId}`);

    // The file is recorded before parsing so the Report step can show what
    // landed while the job runs. Type and size are validated in the component
    // before this is ever called — and that check is a UX affordance, not a
    // security control (specs/007 §3.6).
    const projects = readProjects();
    const index = projects.findIndex((project) => project.id === projectId);
    if (index === -1) {
      throw new MockError("NOT_FOUND", `No project with id ${projectId}.`, false);
    }

    projects[index] = {
      ...projects[index],
      report: {
        id: `rpt_${projectId.slice(4)}`,
        fileName: file.name,
        fileType: file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf",
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        status: "parsing",
      },
      updatedAt: new Date().toISOString(),
    };
    writeProjects(projects);

    const record = startJob("parse", projectId, shouldFail("parse"));
    return readJob<Report>(record.id) as Job<Report>;
  },

  async analyzeReport(
    projectId: string,
    recipient: Recipient,
  ): Promise<Job<Analysis>> {
    await delay(`analyzeReport:${projectId}`);

    // The recipient is committed here — this is the mutation the Recipient
    // step's Next runs, which is what makes the draft slice's edits durable
    // (docs/data-model.md).
    const projects = readProjects();
    const index = projects.findIndex((project) => project.id === projectId);
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        recipient,
        status: "analysing",
        updatedAt: new Date().toISOString(),
      };
      writeProjects(projects);
    }

    const record = startJob("analysis", projectId, shouldFail("analysis"));
    return readJob<Analysis>(record.id) as Job<Analysis>;
  },

  async generateScript(projectId: string): Promise<Job<Script>> {
    await delay(`generateScript:${projectId}`);
    const record = startJob("script", projectId, shouldFail("script"));
    return readJob<Script>(record.id) as Job<Script>;
  },

  async generateVideo(
    projectId: string,
    opts: VideoOptions,
  ): Promise<Job<VideoAsset>> {
    await delay(`generateVideo:${projectId}`);

    const projects = readProjects();
    const index = projects.findIndex((project) => project.id === projectId);
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        status: "video_pending",
        updatedAt: new Date().toISOString(),
      };
      writeProjects(projects);
    }
    void opts;

    const record = startJob("video", projectId, shouldFail("video"));
    return readJob<VideoAsset>(record.id) as Job<VideoAsset>;
  },

  async generateEmail(projectId: string): Promise<Job<EmailDraft>> {
    await delay(`generateEmail:${projectId}`);
    const record = startJob("email", projectId, shouldFail("email"));
    return readJob<EmailDraft>(record.id) as Job<EmailDraft>;
  },

  async getJob<T>(jobId: string): Promise<Job<T>> {
    // Deliberately NOT delayed. This is polled every two seconds, and adding
    // 300-800ms of artificial latency to a poll makes the progress bar lag the
    // job it is reporting on.
    const job = readJob<T>(jobId);
    if (!job) {
      throw new MockError("NOT_FOUND", `No job with id ${jobId}.`, false);
    }
    return job;
  },

  async cancelJob(jobId: string): Promise<Job<unknown>> {
    await delay(`cancelJob:${jobId}`);
    const job = cancelJobRecord(jobId);
    if (!job) {
      throw new MockError("NOT_FOUND", `No job with id ${jobId}.`, false);
    }
    return job;
  },

  async listPresets(
    kind: PresetKind,
    options?: ListPresetsOptions,
  ): Promise<Preset[]> {
    await delay(`listPresets:${kind}:${options?.includeArchived ?? false}`);

    return readPresets()
      .filter((preset) => preset.kind === kind)
      // Archived rows are excluded unless asked for. The workflow's dropdowns
      // pass nothing, which is what keeps an archived avatar out of them
      // without VideoStep having to know archiving exists (specs/008 §3.4).
      .filter((preset) => options?.includeArchived || !preset.archivedAt)
      // Defaults first, so a dropdown's first option is the one the workflow
      // would have picked anyway.
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  },

  async createPreset(kind: PresetKind, input: PresetInput): Promise<Preset> {
    await delay(`createPreset:${kind}`);
    const presets = readPresets();
    const preset: Preset = {
      id: `${kind.slice(0, 3)}_${Math.random().toString(16).slice(2, 8)}`,
      kind,
      name: input.name,
      description: input.description,
      // The first preset of a kind becomes its default, because a kind with
      // presets and no default leaves the workflow's dropdown with nothing to
      // pre-select.
      isDefault: !presets.some(
        (candidate) => candidate.kind === kind && !candidate.archivedAt,
      ),
      config: input.config ?? {},
    };
    writePresets([...presets, preset]);
    return preset;
  },

  async updatePreset(id: string, input: Partial<PresetInput>): Promise<Preset> {
    await delay(`updatePreset:${id}`);
    const presets = readPresets();
    const index = presets.findIndex((preset) => preset.id === id);
    if (index === -1) {
      throw new MockError("NOT_FOUND", `No preset with id ${id}.`, false);
    }
    const next = { ...presets[index], ...input };
    presets[index] = next;
    writePresets(presets);
    return next;
  },

  /**
   * Archive, never delete (specs/008 §3.3).
   *
   * An archived preset leaves every workflow dropdown and still resolves for a
   * `CommunicationPackage` that references it, which is the whole point: the
   * record of what was sent keeps its meaning.
   */
  async archivePreset(id: string): Promise<Preset> {
    await delay(`archivePreset:${id}`);
    const presets = readPresets();
    const index = presets.findIndex((preset) => preset.id === id);
    if (index === -1) {
      throw new MockError("NOT_FOUND", `No preset with id ${id}.`, false);
    }

    // An archived preset cannot stay the default — the dropdown it defaults in
    // can no longer show it. The next live preset of the kind takes over.
    const archived: Preset = {
      ...presets[index],
      archivedAt: new Date().toISOString(),
      isDefault: false,
    };
    presets[index] = archived;

    if (!presets.some((p) => p.kind === archived.kind && p.isDefault && !p.archivedAt)) {
      const heir = presets.findIndex(
        (p) => p.kind === archived.kind && !p.archivedAt,
      );
      if (heir !== -1) presets[heir] = { ...presets[heir], isDefault: true };
    }

    writePresets(presets);
    return archived;
  },

  async restorePreset(id: string): Promise<Preset> {
    await delay(`restorePreset:${id}`);
    const presets = readPresets();
    const index = presets.findIndex((preset) => preset.id === id);
    if (index === -1) {
      throw new MockError("NOT_FOUND", `No preset with id ${id}.`, false);
    }
    const restored: Preset = { ...presets[index], archivedAt: undefined };
    presets[index] = restored;
    writePresets(presets);
    return restored;
  },

  /** Exclusive per kind. Two defaults is a silent bug — nothing would surface
   *  it, and a dropdown would just pre-select whichever sorted first. */
  async setDefaultPreset(id: string): Promise<Preset> {
    await delay(`setDefaultPreset:${id}`);
    const presets = readPresets();
    const target = presets.find((preset) => preset.id === id);
    if (!target) {
      throw new MockError("NOT_FOUND", `No preset with id ${id}.`, false);
    }
    if (target.archivedAt) {
      throw new MockError(
        "ARCHIVED",
        "An archived preset cannot be the default. Restore it first.",
        false,
      );
    }

    writePresets(
      presets.map((preset) =>
        preset.kind === target.kind
          ? { ...preset, isDefault: preset.id === id }
          : preset,
      ),
    );
    return { ...target, isDefault: true };
  },

  async listRecipients(): Promise<Recipient[]> {
    await delay("listRecipients");
    if (shouldFail("recipients")) {
      throw new MockError("MOCK_RECIPIENTS", "Could not load your recipients.");
    }
    return [...readRecipients()].sort((a, b) => a.name.localeCompare(b.name));
  },

  async saveRecipient(input: Recipient): Promise<Recipient> {
    await delay(`saveRecipient:${input.id}`);
    const recipients = readRecipients();
    const index = recipients.findIndex((entry) => entry.id === input.id);
    if (index === -1) recipients.push(input);
    else recipients[index] = input;
    writeRecipients(recipients);
    return input;
  },

  /**
   * A real delete — the one place specs/008 does not archive.
   *
   * A saved recipient is a person, and "we kept it, just hidden" is the wrong
   * answer to "remove this person". History survives because a sent package
   * holds its own COPY of the recipient rather than a reference, so nothing
   * here rewrites what was already sent.
   */
  async deleteRecipient(id: string): Promise<void> {
    await delay(`deleteRecipient:${id}`);
    writeRecipients(readRecipients().filter((entry) => entry.id !== id));
  },

  async getUsage(): Promise<Usage> {
    await delay("getUsage");
    return SEED_USAGE;
  },

  async getSettings(): Promise<WorkspaceSettings> {
    await delay("getSettings");
    return readSettings();
  },

  async updateSettings(
    patch: Partial<WorkspaceSettings>,
  ): Promise<WorkspaceSettings> {
    await delay("updateSettings");
    const current = readSettings();
    // Merged one level deep: a screen patches `tracking` without having to
    // resend `retention`, and vice versa.
    const next: WorkspaceSettings = {
      tracking: { ...current.tracking, ...patch.tracking },
      retention: { ...current.retention, ...patch.retention },
    };
    writeSettings(next);
    return next;
  },

  /**
   * Assemble what Review shows. NOT a job: nothing is generated here, the
   * pieces already exist and this collects them.
   *
   * Throws rather than returning a partial package if a piece is missing —
   * a half-assembled package on the one screen that can send is exactly the
   * kind of plausible fiction the mock refuses to produce.
   */
  async buildPackage(projectId: string): Promise<CommunicationPackage> {
    await delay(`buildPackage:${projectId}`);

    const project = readProjects().find(
      (candidate) => candidate.id === projectId,
    );
    if (!project) {
      throw new MockError("NOT_FOUND", `No project with id ${projectId}.`, false);
    }

    const { recipient, email, video, report } = project;
    if (!recipient || !email || !video || !report) {
      throw new MockError(
        "INCOMPLETE",
        "This project is missing a piece the package requires.",
        false,
      );
    }

    const existing = project.package;
    const pkg: CommunicationPackage = {
      id: existing?.id ?? `pkg_${projectId.slice(4)}`,
      projectId,
      recipient,
      email,
      video,
      reportAttachment: report,
      approvedAt: existing?.approvedAt,
      approvedBy: existing?.approvedBy,
      sentAt: existing?.sentAt,
      status: existing?.status ?? "ready",
    };

    const projects = readProjects();
    const index = projects.findIndex((candidate) => candidate.id === projectId);
    if (index !== -1) {
      projects[index] = { ...projects[index], package: pkg };
      writeProjects(projects);
    }
    return pkg;
  },

  /**
   * ──────────────────────────────────────────────────────────────────────────
   * The only method in this adapter that reaches a human outside the product.
   *
   * CLAUDE.md rule 2: reachable ONLY from the Review screen, and only after an
   * explicit approval. Nothing else in this codebase may call it — a
   * `no-restricted-syntax` rule in eslint.config.mjs enforces that across the
   * campaign and workflow trees rather than trusting this comment.
   *
   * It stamps the approval before starting the send, so the audit trail exists
   * even if the send then fails. A package that was approved and did not go out
   * is a different fact from one that was never approved.
   * ──────────────────────────────────────────────────────────────────────────
   */
  async sendPackage(packageId: string): Promise<Job<CommunicationPackage>> {
    await delay(`sendPackage:${packageId}`);

    const projects = readProjects();
    const index = projects.findIndex(
      (project) => project.package?.id === packageId,
    );
    if (index === -1) {
      throw new MockError("NOT_FOUND", `No package with id ${packageId}.`, false);
    }

    const project = projects[index];
    projects[index] = {
      ...project,
      package: {
        ...project.package!,
        status: "sending",
        approvedAt: project.package!.approvedAt ?? new Date().toISOString(),
        approvedBy: project.package!.approvedBy ?? "You",
      },
      updatedAt: new Date().toISOString(),
    };
    writeProjects(projects);

    const record = startJob("send", project.id, shouldFail("send"));
    return readJob<CommunicationPackage>(record.id) as Job<CommunicationPackage>;
  },
};
