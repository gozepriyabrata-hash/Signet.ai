import { describe, expect, it } from "vitest";

import { WORKFLOW_STEP_ORDER, resumeHref, resumeStepFor } from "@/lib/workflow";
import type {
  Analysis,
  EmailDraft,
  Project,
  ProjectStatus,
  Recipient,
  Report,
  VideoAsset,
} from "@/types";

const ALL_STATUSES: readonly ProjectStatus[] = [
  "draft",
  "analysing",
  "video_pending",
  "email_pending",
  "ready_for_review",
  "sent",
  "failed",
];

const PARSED_REPORT: Report = {
  id: "rpt_1",
  fileName: "q3-review.pdf",
  fileType: "pdf",
  sizeBytes: 482_000,
  uploadedAt: "2026-08-28T09:12:00.000Z",
  status: "parsed",
};

const RECIPIENT: Recipient = {
  id: "rcp_1",
  name: "Jane Fairweather",
  role: "Chief Investment Officer",
  company: "Meridian Capital",
  email: "jane.fairweather@meridian.example",
  businessPriorities: ["capital preservation"],
  personalisation: "high",
};

const ANALYSIS: Analysis = {
  id: "ana_1",
  projectId: "prj_1",
  executiveSummary: "Up 4.2% against a 2.8% benchmark.",
  keyInsights: [],
  talkingPoints: [],
  generatedAt: "2026-08-28T10:00:00.000Z",
  editedByUser: false,
};

const RENDERED_VIDEO: VideoAsset = {
  id: "vid_1",
  projectId: "prj_1",
  jobId: "job_1",
  avatarId: "avt_1",
  voiceId: "voi_1",
  format: "landscape",
  captions: true,
  playbackUrl: "https://cdn.example/vid_1.mp4",
};

/** Queued for render: a job exists, nothing is watchable yet. */
const QUEUED_VIDEO: VideoAsset = {
  id: "vid_2",
  projectId: "prj_1",
  jobId: "job_2",
  avatarId: "avt_1",
  voiceId: "voi_1",
  format: "landscape",
  captions: true,
};

const EMAIL: EmailDraft = {
  id: "eml_1",
  projectId: "prj_1",
  subject: "Your Q3 review",
  greeting: "Jane,",
  body: "…",
  ctaId: "cta_1",
  signatureId: "sig_1",
  editedByUser: false,
};

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "prj_1",
    name: "Q3 Portfolio Review",
    status: "draft",
    createdAt: "2026-08-28T09:12:00.000Z",
    updatedAt: "2026-08-29T14:03:00.000Z",
    ...overrides,
  };
}

describe("resumeStepFor · statuses that name exactly one step", () => {
  it.each([
    ["analysing", "analysis"],
    ["video_pending", "video"],
    ["email_pending", "email"],
    ["ready_for_review", "review"],
  ] as const)("resolves %s to %s", (status, step) => {
    expect(resumeStepFor(project({ status }))).toBe(step);
  });

  it("resolves a sent project to review, because Send is Review's confirmed state", () => {
    // specs/001 §3: there is no /send route, so a sent project has nowhere else
    // to land. If this ever resolves to a seventh step, rule 2 has been broken.
    expect(resumeStepFor(project({ status: "sent" }))).toBe("review");
  });
});

describe("resumeStepFor · draft spans two steps", () => {
  it("sends an empty draft to the report step", () => {
    expect(resumeStepFor(project({ status: "draft" }))).toBe("report");
  });

  it("sends a draft with a parsed report to the recipient step", () => {
    expect(
      resumeStepFor(project({ status: "draft", report: PARSED_REPORT })),
    ).toBe("recipient");
  });

  it("keeps a draft on the report step while the report is still parsing", () => {
    expect(
      resumeStepFor(
        project({
          status: "draft",
          report: { ...PARSED_REPORT, status: "parsing" },
        }),
      ),
    ).toBe("report");
  });
});

describe("resumeStepFor · failed resolves to the step that failed", () => {
  it("lands on report when the upload failed", () => {
    expect(
      resumeStepFor(
        project({
          status: "failed",
          report: { ...PARSED_REPORT, status: "failed" },
        }),
      ),
    ).toBe("report");
  });

  it("lands on analysis when the report and recipient are done but analysis is not", () => {
    expect(
      resumeStepFor(
        project({
          status: "failed",
          report: PARSED_REPORT,
          recipient: RECIPIENT,
        }),
      ),
    ).toBe("analysis");
  });

  it("lands on video when a render was queued but produced no playable asset", () => {
    expect(
      resumeStepFor(
        project({
          status: "failed",
          report: PARSED_REPORT,
          recipient: RECIPIENT,
          analysis: ANALYSIS,
          // A VideoAsset carries a jobId long before it carries a playbackUrl,
          // so presence alone must not count as done.
          video: QUEUED_VIDEO,
        }),
      ),
    ).toBe("video");
  });

  it("lands on email when everything before it succeeded", () => {
    expect(
      resumeStepFor(
        project({
          status: "failed",
          report: PARSED_REPORT,
          recipient: RECIPIENT,
          analysis: ANALYSIS,
          video: RENDERED_VIDEO,
        }),
      ),
    ).toBe("email");
  });

  it("falls back to review when every earlier step has its output", () => {
    expect(
      resumeStepFor(
        project({
          status: "failed",
          report: PARSED_REPORT,
          recipient: RECIPIENT,
          analysis: ANALYSIS,
          video: RENDERED_VIDEO,
          email: EMAIL,
        }),
      ),
    ).toBe("review");
  });
});

describe("resumeStepFor · totality", () => {
  it("resolves every ProjectStatus to a real workflow step", () => {
    // The switch is exhaustive at compile time; this pins it at run time too,
    // so a status added to the union without a case here fails a test rather
    // than returning undefined into a URL.
    for (const status of ALL_STATUSES) {
      expect(WORKFLOW_STEP_ORDER).toContain(resumeStepFor(project({ status })));
    }
  });
});

describe("resumeHref", () => {
  it("builds the step URL from the project id", () => {
    expect(resumeHref(project({ status: "ready_for_review" }))).toBe(
      "/projects/prj_1/review",
    );
  });

  it("puts nothing from the recipient into the URL", () => {
    // CLAUDE.md rule 11 names the URL query string explicitly. This is the
    // regression test for it.
    const href = resumeHref(
      project({
        status: "email_pending",
        report: PARSED_REPORT,
        recipient: RECIPIENT,
      }),
    );

    expect(href).toBe("/projects/prj_1/email");
    for (const value of [
      RECIPIENT.name,
      RECIPIENT.email,
      RECIPIENT.company,
      RECIPIENT.role,
    ]) {
      expect(href).not.toContain(value);
    }
  });
});
