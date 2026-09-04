import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIEditableField } from "@/components/workflow/AIEditableField";
import { JobProgressCard } from "@/components/workflow/JobProgressCard";
import { WorkflowStepper } from "@/components/workflow/WorkflowStepper";
import { completedStepsFor } from "@/lib/workflow";
import type { Job, Project } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/prj_1/analysis",
}));

afterEach(() => vi.clearAllMocks());

function job(overrides: Partial<Job<unknown>> = {}): Job<unknown> {
  return {
    id: "job_1",
    kind: "video",
    status: "running",
    progress: 40,
    stage: "Rendering avatar",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── WorkflowStepper ─────────────────────────────────────────────────────────

/**
 * specs/007 §3.5. The stepper must never let a user past an unmet dependency,
 * and it must derive "done" from the same predicates the resume redirect uses —
 * if the two disagree, one is wrong and nothing says which.
 */
describe("WorkflowStepper", () => {
  it("links only to completed steps, and never to the current one", () => {
    render(
      <WorkflowStepper
        projectId="prj_1"
        current="analysis"
        completed={["report", "recipient"]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Workflow progress" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(hrefs).toEqual([
      "/projects/prj_1/report",
      "/projects/prj_1/recipient",
    ]);
  });

  it("does not make a future step focusable", () => {
    // A disabled control still sits in the reading order, so a keyboard user
    // would tab past four dead nodes on every step. Future steps are text.
    render(
      <WorkflowStepper projectId="prj_1" current="report" completed={[]} />,
    );

    const nav = screen.getByRole("navigation", { name: "Workflow progress" });
    expect(within(nav).queryAllByRole("link")).toHaveLength(0);
    expect(within(nav).queryAllByRole("button")).toHaveLength(0);
  });

  it("marks the current step with aria-current, since ARIA has no stepper role", () => {
    render(
      <WorkflowStepper
        projectId="prj_1"
        current="video"
        completed={["report", "recipient", "analysis"]}
      />,
    );

    const current = document.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current).toHaveTextContent("Video");
  });

  it("takes its completion from lib/workflow, not from a second derivation", () => {
    // The regression that matters: if this ever stops matching, the stepper and
    // the /projects/[id] resume redirect disagree about what "done" means.
    const project: Project = {
      id: "prj_1",
      name: "Q3 review",
      status: "analysing",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
      report: {
        id: "rpt_1",
        fileName: "r.pdf",
        fileType: "pdf",
        sizeBytes: 1,
        uploadedAt: "2026-08-01T00:00:00.000Z",
        status: "parsed",
      },
      recipient: {
        id: "rcp_1",
        name: "Ada Speke",
        role: "CFO",
        company: "Wexley",
        email: "a.speke@wexley.example",
        businessPriorities: [],
        personalisation: "medium",
      },
    };

    render(
      <WorkflowStepper
        projectId="prj_1"
        current="analysis"
        completed={completedStepsFor(project)}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Workflow progress" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/projects/prj_1/report", "/projects/prj_1/recipient"]);
  });
});

// ── JobProgressCard ─────────────────────────────────────────────────────────

/** CLAUDE.md rule 5. */
describe("JobProgressCard", () => {
  it("shows a stage label and determinate progress while running", () => {
    render(<JobProgressCard job={job()} label="Video" />);

    expect(screen.getByText(/Rendering avatar/)).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("announces the stage politely", () => {
    // Rule 10: the bar alone announces as a bare number.
    render(<JobProgressCard job={job()} label="Video" />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("Rendering avatar");
  });

  it("puts Retry inside the card when a job fails", async () => {
    // Rule 5: never a dead end. A Retry elsewhere on the page is a dead end
    // with a button near it.
    const onRetry = vi.fn();
    render(
      <JobProgressCard
        job={job({
          status: "failed",
          error: { code: "MOCK_VIDEO_FAILED", message: "Render failed.", retryable: true },
        })}
        label="Video"
        onRetry={onRetry}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Render failed.");

    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("offers no Retry for a cancellation", () => {
    // specs/007 §3.7: a cancellation is `failed` with a non-retryable code.
    // Pushing "try again" at someone who just pressed Cancel is an argument.
    render(
      <JobProgressCard
        job={job({
          status: "failed",
          error: { code: "CANCELLED", message: "You stopped this.", retryable: false },
        })}
        label="Video"
        onRetry={vi.fn()}
      />,
    );

    // Neutral status, not a danger alert. A stopped job is not a broken one,
    // and the card must not say otherwise just because it shares a JobStatus
    // with one (specs/007 §3.7).
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Video stopped");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("collapses to one line when it succeeds", () => {
    render(<JobProgressCard job={job({ status: "succeeded", progress: 100 })} label="Video" />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText(/done in/)).toBeInTheDocument();
  });

  it("offers Cancel only while the job is running", () => {
    const { rerender } = render(
      <JobProgressCard job={job()} label="Video" onCancel={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    rerender(
      <JobProgressCard
        job={job({ status: "succeeded", progress: 100 })}
        label="Video"
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});

// ── AIEditableField ─────────────────────────────────────────────────────────

/** CLAUDE.md rule 4 — the rule admits no exceptions, so neither does this. */
describe("AIEditableField", () => {
  it("renders a real editable control, not prose", async () => {
    const onChange = vi.fn();
    render(
      <AIEditableField label="Subject" value="Your report" onChange={onChange} />,
    );

    const field = screen.getByLabelText("Subject");
    await userEvent.type(field, "!");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders a textarea variant that is also editable", async () => {
    const onChange = vi.fn();
    render(
      <AIEditableField
        label="Body"
        variant="textarea"
        value="Based on your report"
        onChange={onChange}
      />,
    );

    await userEvent.type(screen.getByLabelText("Body"), "x");
    expect(onChange).toHaveBeenCalled();
  });

  it("drops the AI badge once the caller marks the field as edited", () => {
    // The badge is a truth claim: after a human changes the words, calling them
    // AI output is false.
    const { rerender } = render(
      <AIEditableField label="Subject" value="a" onChange={vi.fn()} aiGenerated />,
    );
    expect(screen.getByText("AI generated")).toBeInTheDocument();

    rerender(
      <AIEditableField label="Subject" value="ab" onChange={vi.fn()} aiGenerated={false} />,
    );
    expect(screen.queryByText("AI generated")).not.toBeInTheDocument();
  });

  it("regenerates without a dialog while the text is still untouched", async () => {
    const onRegenerate = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AIEditableField
        label="Subject"
        value="a"
        onChange={vi.fn()}
        aiGenerated
        onRegenerate={onRegenerate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onRegenerate).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });

  it("confirms before discarding edits the user made", async () => {
    const onRegenerate = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <AIEditableField
        label="Subject"
        value="a"
        onChange={vi.fn()}
        aiGenerated={false}
        onRegenerate={onRegenerate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onRegenerate).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
