import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Job, PersonalisationLevel } from "@/types";

/**
 * Unsaved workflow edits, keyed by project id.
 *
 * ── What belongs here, and what does not ────────────────────────────────────
 * CLAUDE.md rule 3 splits state in two: server state to TanStack Query, draft
 * edits and UI preferences to Zustand. This store holds the half a user has
 * typed and not yet committed. It **never fetches** — a store that fetches is
 * the failure rule 3 is written to prevent.
 *
 * It also does **not** hold the current step. The step is the URL, because the
 * step *is* the address: it survives a refresh, it is linkable, and the Back
 * button already moves it correctly. `docs/data-model.md` lists "current step"
 * under this store, and specs/007 §4 reads that as the *resume position* —
 * which `lib/workflow.ts` derives from the project's data rather than storing.
 * That reading is recorded there as this spec's rather than the document's.
 *
 * ── Why it is persisted, and why there is no navigation guard ───────────────
 * Drafts survive a refresh and a route change, which is what makes moving
 * backwards through the workflow lossless. It is also why nothing blocks
 * navigation: Next's `onNavigate` + `preventDefault()` catches `Link` clicks
 * but not the Back button, the address bar, or a programmatic push, and a guard
 * that catches some exits teaches a user their work is safe and then loses it
 * on the one it misses (specs/007 §3.4). Persistence removes the problem rather
 * than warning about it.
 *
 * Keyed by project id so two projects open in two tabs cannot overwrite each
 * other's work.
 */

export const WORKFLOW_STORAGE_KEY = "signet.workflow.v1";

/** The recipient form, held loose while it is being typed. It is committed —
 *  and validated — by the `analyzeReport` mutation on the step's Next. */
export interface RecipientDraft {
  name: string;
  role: string;
  company: string;
  industry: string;
  businessPriorities: string[];
  personalisation: PersonalisationLevel;
}

export interface WorkflowDraft {
  recipient?: Partial<RecipientDraft>;
  /** Analysis edits, held until Next commits them. */
  executiveSummary?: string;
  talkingPointsIncluded?: Record<string, boolean>;
  script?: string;
  subject?: string;
  greeting?: string;
  body?: string;
  ctaId?: string;
  signatureId?: string;
}

type JobKind = Job<unknown>["kind"];

/**
 * The id of a job that is still in flight, keyed `projectId:kind`.
 *
 * ── Why this is in the store and not in a component ─────────────────────────
 * A job can be STARTED on one step and CONSUMED on another: the Recipient
 * step's Next kicks off the analysis and immediately navigates to Analysis,
 * which is the screen that shows its progress. Held in component state, the id
 * dies with the Recipient step — nothing polls the job, so nothing ever
 * observes it finishing, so its result is never written to the project and the
 * user watches a progress bar that will never move.
 *
 * That is not hypothetical: it is exactly what happened the first time this
 * workflow was walked end to end, and no test caught it because every test
 * renders one step at a time.
 *
 * Persisted for the same reason drafts are — a refresh mid-render should rejoin
 * the job, not orphan it.
 */
interface WorkflowState {
  drafts: Record<string, WorkflowDraft>;
  activeJobs: Record<string, string>;
  /** Shallow-merges, so a step only has to send what it changed. */
  patchDraft: (projectId: string, patch: WorkflowDraft) => void;
  getDraft: (projectId: string) => WorkflowDraft;
  /** Called once a project is sent, or when a step's edits are committed and
   *  the server copy becomes the truth. */
  clearDraft: (projectId: string) => void;

  setActiveJob: (projectId: string, kind: JobKind, jobId: string) => void;
  getActiveJob: (projectId: string, kind: JobKind) => string | undefined;
  clearActiveJob: (projectId: string, kind: JobKind) => void;
}

const jobKey = (projectId: string, kind: JobKind) => `${projectId}:${kind}`;

const EMPTY: WorkflowDraft = {};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      drafts: {},
      activeJobs: {},

      patchDraft: (projectId, patch) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [projectId]: { ...state.drafts[projectId], ...patch },
          },
        })),

      getDraft: (projectId) => get().drafts[projectId] ?? EMPTY,

      clearDraft: (projectId) =>
        set((state) => {
          if (!(projectId in state.drafts)) return state;
          const next = { ...state.drafts };
          delete next[projectId];
          return { drafts: next };
        }),

      setActiveJob: (projectId, kind, jobId) =>
        set((state) => ({
          activeJobs: { ...state.activeJobs, [jobKey(projectId, kind)]: jobId },
        })),

      getActiveJob: (projectId, kind) => get().activeJobs[jobKey(projectId, kind)],

      clearActiveJob: (projectId, kind) =>
        set((state) => {
          const key = jobKey(projectId, kind);
          if (!(key in state.activeJobs)) return state;
          const next = { ...state.activeJobs };
          delete next[key];
          return { activeJobs: next };
        }),
    }),
    {
      name: WORKFLOW_STORAGE_KEY,
      version: 0,
      // Same reason as ui-store: rehydrating during module evaluation races
      // React and produces a server/client mismatch. The workflow shell calls
      // rehydrate() in an effect instead.
      skipHydration: true,
      partialize: (state) => ({
        drafts: state.drafts,
        activeJobs: state.activeJobs,
      }),
    },
  ),
);
