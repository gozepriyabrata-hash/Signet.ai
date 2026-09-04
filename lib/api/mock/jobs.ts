import type {
  Analysis,
  CommunicationPackage,
  EmailDraft,
  Job,
  JobStatus,
  Project,
  Report,
  Script,
  VideoAsset,
} from "@/types";

import { readProjects, writeProjects } from "./store";

/**
 * The mock's job engine — CLAUDE.md rule 5, simulated.
 *
 * ── Jobs are computed from elapsed time, not driven by timers ───────────────
 * A job record stores only what it was started with: a kind, a start time, a
 * duration and whether it is destined to fail. `readJob` derives status, stage
 * and progress from `Date.now() - startedAt` every time it is asked.
 *
 * That is the whole design, and it buys three things a `setTimeout` ladder
 * would not:
 *
 *  1. **It survives a backgrounded tab.** TanStack Query stops polling when the
 *     tab is hidden (`refetchIntervalInBackground` defaults to false), so a
 *     timer-driven job would keep firing into a UI nobody is polling. Elapsed
 *     time just keeps elapsing, and the first poll after refocus reports the
 *     truth.
 *  2. **It survives a refresh.** The records persist beside the projects, so
 *     reloading mid-render resumes the same job rather than orphaning it.
 *  3. **There is nothing to clean up.** No handles, no leaks, no cancellation
 *     bookkeeping beyond a flag.
 *
 * ── Durations are declared here, once ──────────────────────────────────────
 * `lib/api/mock/index.ts` picked 300–800ms of latency so loading states would
 * not rot from never being seen. Job durations need the same reasoning made
 * explicitly rather than sprinkled: long enough that a staged progress bar is
 * genuinely exercised by a human watching it, short enough that a demo and a
 * test suite do not pay for the realism.
 */

const STORAGE_KEY = "signet.mock.jobs.v1";

/** What a job needs to reconstruct itself. Everything else is derived. */
interface JobRecord {
  id: string;
  kind: Job<unknown>["kind"];
  projectId: string;
  startedAt: string;
  durationMs: number;
  /** Decided at creation so a job's outcome does not change between polls. */
  willFail: boolean;
  /** Set by `cancelJob`; makes the job terminal at the next read. */
  cancelledAt?: string;
  /** Set once, the first time the job is observed to have finished, so the
   *  result is written onto the project exactly once. */
  settled?: boolean;
}

/**
 * Stage labels per kind, from `docs/screens.md`.
 *
 * The stage a job reports is its elapsed fraction mapped across this list, so
 * a longer job simply dwells longer on each label. A blank spinner is what rule
 * 5 exists to prevent; these are what replace it.
 */
const STAGES: Record<Job<unknown>["kind"], readonly string[]> = {
  parse: ["Reading file", "Extracting text", "Detecting sections"],
  analysis: ["Reading report", "Extracting insights", "Drafting talking points"],
  script: ["Shaping the narrative", "Writing the script", "Timing the read"],
  video: ["Synthesising voice", "Rendering avatar", "Compositing"],
  email: ["Drafting subject", "Writing the body", "Placing the CTA"],
  send: ["Assembling package", "Attaching report", "Delivering"],
};

const DURATION_MS: Record<Job<unknown>["kind"], number> = {
  parse: 3_000,
  analysis: 6_000,
  script: 4_000,
  video: 12_000,
  email: 4_000,
  send: 3_000,
};

// ── Persistence ─────────────────────────────────────────────────────────────
// Same discipline as store.ts: every access is lazy and guarded, because
// sessionStorage does not exist in Node and throws outright in some privacy
// modes.

let memory: JobRecord[] | null = null;

function canUseStorage(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

function readRecords(): JobRecord[] {
  if (canUseStorage()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as JobRecord[];
    } catch {
      // Corrupt or unreadable — start clean rather than throwing at a caller
      // who only asked for a progress bar.
    }
    return [];
  }
  memory ??= [];
  return memory;
}

function writeRecords(records: JobRecord[]): void {
  if (canUseStorage()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return;
    } catch {
      // Quota or private mode — keep going in memory.
    }
  }
  memory = records;
}

/** Test seam: drop every job. */
export function resetJobs(): void {
  memory = null;
  if (canUseStorage()) {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do.
    }
  }
}

// ── Deriving a job from its record ──────────────────────────────────────────

function statusFor(record: JobRecord, elapsed: number): JobStatus {
  if (record.cancelledAt) return "failed";
  if (elapsed >= record.durationMs) return record.willFail ? "failed" : "succeeded";
  // A brief queued phase, so the UI has to handle a status with no progress
  // rather than assuming everything starts running.
  return elapsed < 400 ? "queued" : "running";
}

function stageFor(record: JobRecord, status: JobStatus, elapsed: number): string {
  const stages = STAGES[record.kind];
  if (status === "queued") return "Queued";
  if (status === "succeeded") return "Done";
  if (status === "failed") return record.cancelledAt ? "Cancelled" : "Failed";

  const index = Math.min(
    stages.length - 1,
    Math.floor((elapsed / record.durationMs) * stages.length),
  );
  return stages[index];
}

/**
 * Progress never reaches 100 before the status is terminal.
 *
 * A bar that sits full while the card still says "running" is the single most
 * common way a progress UI loses a user's trust, so the running case is capped
 * at 99 rather than allowed to round up.
 */
function progressFor(status: JobStatus, elapsed: number, durationMs: number): number {
  if (status === "succeeded") return 100;
  if (status === "failed") return 100;
  if (status === "queued") return 0;
  return Math.min(99, Math.round((elapsed / durationMs) * 100));
}

function errorFor(record: JobRecord): Job<unknown>["error"] {
  if (record.cancelledAt) {
    return {
      code: "CANCELLED",
      message: "You stopped this before it finished.",
      // Not retryable through the card's Retry: the user chose to stop, and
      // offering "try again" as the response to "stop" is an argument.
      retryable: false,
    };
  }
  return {
    code: `MOCK_${record.kind.toUpperCase()}_FAILED`,
    message: `The ${record.kind} step did not complete. Nothing has been sent.`,
    retryable: true,
  };
}

// ── Public surface ──────────────────────────────────────────────────────────

export function startJob(
  kind: Job<unknown>["kind"],
  projectId: string,
  willFail: boolean,
): JobRecord {
  const record: JobRecord = {
    id: `job_${kind}_${Math.random().toString(16).slice(2, 10)}`,
    kind,
    projectId,
    startedAt: new Date().toISOString(),
    durationMs: DURATION_MS[kind],
    willFail,
  };
  writeRecords([record, ...readRecords()]);
  return record;
}

/**
 * The job as it stands right now.
 *
 * On the first read that observes a finished job, the result is applied to the
 * project — see `applyResult`. That happens here rather than on a timer because
 * here is the only place that knows the job has finished.
 */
export function readJob<T>(jobId: string): Job<T> | undefined {
  const records = readRecords();
  const record = records.find((candidate) => candidate.id === jobId);
  if (!record) return undefined;

  const elapsed = Date.now() - new Date(record.startedAt).getTime();
  const status = statusFor(record, elapsed);
  const terminal = status === "succeeded" || status === "failed";

  if (terminal && !record.settled) {
    record.settled = true;
    if (status === "succeeded") applyResult(record);
    writeRecords(records);
  }

  const job: Job<T> = {
    id: record.id,
    kind: record.kind,
    status,
    progress: progressFor(status, elapsed, record.durationMs),
    stage: stageFor(record, status, elapsed),
    startedAt: record.startedAt,
  };

  if (terminal) {
    job.finishedAt = new Date(
      Math.min(
        Date.now(),
        new Date(record.startedAt).getTime() + record.durationMs,
      ),
    ).toISOString();
  }
  if (status === "failed") job.error = errorFor(record);
  if (status === "succeeded") {
    job.result = resultFor(record) as T;
  }

  return job;
}

export function cancelJobRecord(jobId: string): Job<unknown> | undefined {
  const records = readRecords();
  const record = records.find((candidate) => candidate.id === jobId);
  if (!record) return undefined;

  const elapsed = Date.now() - new Date(record.startedAt).getTime();
  // Cancelling something that already finished is a no-op, not an error: the
  // user clicked as it completed, and rewriting a succeeded job to failed would
  // be the app arguing with what it just showed them.
  if (elapsed < record.durationMs && !record.cancelledAt) {
    record.cancelledAt = new Date().toISOString();
    record.settled = true;
    writeRecords(records);
  }
  return readJob(jobId);
}

// ── Results ─────────────────────────────────────────────────────────────────

function projectOf(record: JobRecord): Project | undefined {
  return readProjects().find((project) => project.id === record.projectId);
}

/**
 * What a finished job produces.
 *
 * Deterministic per project id so a demo re-run produces the same words, for
 * the same reason the fixtures use fixed dates rather than `Date.now()`.
 */
function resultFor(record: JobRecord): unknown {
  const project = projectOf(record);
  const short = record.projectId.slice(4);

  switch (record.kind) {
    case "parse": {
      const report: Report = project?.report
        ? { ...project.report, status: "parsed", pageCount: 14 }
        : {
            id: `rpt_${short}`,
            fileName: "report.pdf",
            fileType: "pdf",
            sizeBytes: 1_200_000,
            uploadedAt: record.startedAt,
            status: "parsed",
            pageCount: 14,
          };
      return {
        ...report,
        excerpt:
          "This report covers performance across the period, the three positions that drove it, and the two areas we are watching into next quarter.",
      } satisfies Report;
    }

    case "analysis":
      return {
        id: `ana_${short}`,
        projectId: record.projectId,
        executiveSummary:
          "Performance ran ahead of benchmark on the back of two positions, with costs flat and one exposure worth discussing before the next review.",
        keyInsights: [
          { id: "ins_1", title: "Ahead of benchmark", detail: "Up 4.2% against 2.8%." },
          { id: "ins_2", title: "Costs held flat", detail: "No change against the prior period." },
          { id: "ins_3", title: "One concentrated exposure", detail: "Worth a conversation before the next review." },
        ],
        talkingPoints: [
          { id: "tp_1", order: 1, text: "Open on the benchmark gap — it is the headline.", included: true },
          { id: "tp_2", order: 2, text: "Costs are flat; say so plainly and move on.", included: true },
          { id: "tp_3", order: 3, text: "Raise the concentrated position as a question, not a warning.", included: true },
        ],
        generatedAt: new Date().toISOString(),
        editedByUser: false,
      } satisfies Analysis;

    case "script":
      return {
        id: `scr_${short}`,
        projectId: record.projectId,
        body: "Hello — I have recorded a short walkthrough of your report. The headline is that performance ran ahead of benchmark, costs held flat, and there is one position I would like to talk through with you.",
        estimatedDurationSec: 42,
        styleId: "sty_executive",
        editedByUser: false,
      } satisfies Script;

    case "video":
      return {
        id: `vid_${short}`,
        projectId: record.projectId,
        jobId: record.id,
        avatarId: "avt_default",
        voiceId: "voi_default",
        format: "landscape",
        captions: true,
        durationSec: 42,
        // Same-origin and deliberately not a real file. Nothing on any screen
        // may make an external request (specs/005 §3.10, specs/006 §3.10), and
        // a CDN URL here would be the one fixture that does. The Video and
        // Campaign screens render a placeholder frame plus metadata rather than
        // a player, exactly as the campaign detail page already does.
        playbackUrl: `/mock/video/${short}.mp4`,
      } satisfies VideoAsset;

    case "email": {
      const first = project?.recipient?.name.split(" ")[0] ?? "there";
      return {
        id: `eml_${short}`,
        projectId: record.projectId,
        subject: "Your report, walked through in two minutes",
        greeting: `Hello ${first},`,
        body: "Rather than send the report on its own, I have recorded a short walkthrough of the parts that matter and what they mean for you. The full document is attached.",
        ctaId: "cta_book_meeting",
        signatureId: "sig_default",
        editedByUser: false,
      } satisfies EmailDraft;
    }

    case "send": {
      const existing = project?.package;
      if (!existing) return undefined;
      return {
        ...existing,
        status: "sent",
        sentAt: new Date().toISOString(),
      } satisfies CommunicationPackage;
    }
  }
}

/**
 * Write a finished job's result onto its project, so `getProject` reflects it
 * and the stepper advances.
 *
 * The stepper derives completion from the project (lib/workflow.ts), so this is
 * the step that makes a succeeded job visible as progress rather than as a
 * green tick on a card nobody will look at again.
 */
function applyResult(record: JobRecord): void {
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === record.projectId);
  if (index === -1) return;

  const project = projects[index];
  const result = resultFor(record);
  if (result === undefined) return;

  const now = new Date().toISOString();
  let next: Project;

  switch (record.kind) {
    case "parse":
      next = { ...project, report: result as Report, updatedAt: now };
      break;
    case "analysis":
      next = {
        ...project,
        analysis: result as Analysis,
        status: "video_pending",
        updatedAt: now,
      };
      break;
    case "script":
      next = { ...project, script: result as Script, updatedAt: now };
      break;
    case "video":
      next = {
        ...project,
        video: result as VideoAsset,
        status: "email_pending",
        updatedAt: now,
      };
      break;
    case "email":
      next = {
        ...project,
        email: result as EmailDraft,
        status: "ready_for_review",
        updatedAt: now,
      };
      break;
    case "send":
      next = {
        ...project,
        package: result as CommunicationPackage,
        status: "sent",
        updatedAt: now,
      };
      break;
  }

  projects[index] = next;
  writeProjects(projects);
}
