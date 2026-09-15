import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EmailStep } from "@/components/workflow/steps/EmailStep";
import { ReportStep } from "@/components/workflow/steps/ReportStep";
import { ReviewStep } from "@/components/workflow/steps/ReviewStep";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { CommunicationPackage, Project } from "@/types";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects/prj_1/review",
  useParams: () => ({ id: "prj_1" }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getProject: vi.fn(),
    uploadReport: vi.fn(),
    analyzeReport: vi.fn(),
    generateVideo: vi.fn(),
    generateEmail: vi.fn(),
    getJob: vi.fn(),
    cancelJob: vi.fn(),
    listPresets: vi.fn(),
    buildPackage: vi.fn(),
    sendPackage: vi.fn(),
  },
}));

const RECIPIENT = {
  id: "rcp_1",
  name: "Ada Speke",
  role: "CFO",
  company: "Wexley",
  email: "a.speke@wexley.example",
  businessPriorities: ["cash flow"],
  personalisation: "medium" as const,
};

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "prj_1",
    name: "Q3 review",
    status: "ready_for_review",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    report: {
      id: "rpt_1",
      fileName: "q3.pdf",
      fileType: "pdf",
      sizeBytes: 1_000_000,
      uploadedAt: "2026-08-01T00:00:00.000Z",
      status: "parsed",
      pageCount: 12,
    },
    recipient: RECIPIENT,
    analysis: {
      id: "ana_1",
      projectId: "prj_1",
      executiveSummary: "Ahead of benchmark.",
      keyInsights: [],
      talkingPoints: [{ id: "tp_1", order: 1, text: "Open on the gap.", included: true }],
      generatedAt: "2026-08-02T00:00:00.000Z",
      editedByUser: false,
    },
    video: {
      id: "vid_1",
      projectId: "prj_1",
      jobId: "job_1",
      avatarId: "avt_1",
      voiceId: "voi_1",
      format: "landscape",
      captions: true,
      durationSec: 42,
      playbackUrl: "/mock/video/1.mp4",
    },
    email: {
      id: "eml_1",
      projectId: "prj_1",
      subject: "Your Q3 review",
      greeting: "Hello Ada,",
      body: "A short walkthrough.",
      ctaId: "cta_1",
      signatureId: "sig_1",
      editedByUser: false,
    },
    ...overrides,
  };
}

const PACKAGE: CommunicationPackage = {
  id: "pkg_1",
  projectId: "prj_1",
  recipient: RECIPIENT,
  email: project().email!,
  video: project().video!,
  reportAttachment: project().report!,
  status: "ready",
};

/**
 * No `beforeEach` mock reset. Clearing the api mock from a `beforeEach` makes
 * a rejection it later produces surface as an uncaught error rather than as
 * the query's error state.
 */
afterEach(() => {
  vi.clearAllMocks();
  useWorkflowStore.setState({ drafts: {} });
});

// ── Rule 2 ──────────────────────────────────────────────────────────────────

/**
 * The rule this whole spec is organised around. The lint rule stops a call
 * appearing in the wrong file; these stop one happening at the wrong moment.
 */
describe("rule 2 · nothing sends itself", () => {
  it("does not send on mount, even with a package ready and every box ticked", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.buildPackage).mockResolvedValue(PACKAGE);

    renderWithQuery(<ReviewStep projectId="prj_1" />);
    await screen.findByRole("button", { name: /Approve & Send/ });

    // No send on mount, no send in an effect, no send as a side effect of
    // assembling the package.
    await waitFor(() => expect(api.buildPackage).toHaveBeenCalled());
    expect(api.sendPackage).not.toHaveBeenCalled();
  });

  it("does not send when Approve & Send is pressed — only when the dialog is confirmed", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.buildPackage).mockResolvedValue(PACKAGE);

    renderWithQuery(<ReviewStep projectId="prj_1" />);
    const approve = await screen.findByRole("button", { name: /Approve & Send/ });
    await waitFor(() => expect(approve).toBeEnabled());

    await userEvent.click(approve);
    // The dialog is open. Still nothing sent.
    expect(api.sendPackage).not.toHaveBeenCalled();
    expect(screen.getByText("Send this package?")).toBeInTheDocument();
  });

  it("names the recipient and the address in the confirmation", async () => {
    // The last irreversible moment should say exactly what happens and to whom.
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.buildPackage).mockResolvedValue(PACKAGE);

    renderWithQuery(<ReviewStep projectId="prj_1" />);
    const approve = await screen.findByRole("button", { name: /Approve & Send/ });
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);

    const dialog = screen.getByText("Send this package?").closest("dialog");
    expect(dialog).toHaveTextContent("Ada Speke");
    expect(dialog).toHaveTextContent("a.speke@wexley.example");
    expect(dialog).toHaveTextContent(/cannot be unsent/);
  });

  it("sends only after the dialog is confirmed", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.buildPackage).mockResolvedValue(PACKAGE);
    vi.mocked(api.sendPackage).mockResolvedValue({
      id: "job_send",
      kind: "send",
      status: "running",
      progress: 10,
      stage: "Delivering",
      startedAt: new Date().toISOString(),
    });
    vi.mocked(api.getJob).mockResolvedValue({
      id: "job_send",
      kind: "send",
      status: "running",
      progress: 20,
      stage: "Delivering",
      startedAt: new Date().toISOString(),
    });

    renderWithQuery(<ReviewStep projectId="prj_1" />);
    const approve = await screen.findByRole("button", { name: /Approve & Send/ });
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);
    await userEvent.click(screen.getByRole("button", { name: "Send it" }));

    await waitFor(() => expect(api.sendPackage).toHaveBeenCalledWith("pkg_1"));
    expect(api.sendPackage).toHaveBeenCalledTimes(1);
  });

  it("keeps Approve & Send disabled while any requirement is unmet", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project({ video: undefined }));
    vi.mocked(api.buildPackage).mockRejectedValue(new Error("incomplete"));

    renderWithQuery(<ReviewStep projectId="prj_1" />);
    const approve = await screen.findByRole("button", { name: /Approve & Send/ });

    expect(approve).toBeDisabled();
    expect(screen.getByRole("link", { name: /Fix/ })).toHaveAttribute(
      "href",
      "/projects/prj_1/video",
    );
  });

  it("does not send from the Email step, which has no way to", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.listPresets).mockResolvedValue([]);

    renderWithQuery(<EmailStep projectId="prj_1" />);
    await screen.findByLabelText("Subject");

    expect(api.sendPackage).not.toHaveBeenCalled();
  });
});

// ── Rule 12 ─────────────────────────────────────────────────────────────────

describe("rule 12 · uploads are validated before the seam", () => {
  it("refuses a wrong file type without calling uploadReport", async () => {
    vi.mocked(api.getProject).mockResolvedValue(
      project({ report: undefined, analysis: undefined }),
    );

    const { container } = renderWithQuery(<ReportStep projectId="prj_1" />);
    await screen.findByText(/Drop a report here/);

    // `fireEvent`, not `userEvent.upload`: userEvent honours the `accept`
    // attribute and silently refuses to attach a non-matching file, so the
    // rejection path would never run. A real user CAN get past `accept` — MDN
    // says so explicitly — which is the whole reason this validation exists.
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /not a PDF or a Word document/,
    );
    expect(api.uploadReport).not.toHaveBeenCalled();
  });

  it("refuses an oversized file without calling uploadReport", async () => {
    vi.mocked(api.getProject).mockResolvedValue(
      project({ report: undefined, analysis: undefined }),
    );

    const { container } = renderWithQuery(<ReportStep projectId="prj_1" />);
    await screen.findByText(/Drop a report here/);

    const big = new File(["x"], "huge.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 30 * 1024 * 1024 });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [big] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/limit is 25MB/);
    expect(api.uploadReport).not.toHaveBeenCalled();
  });

  it("accepts a valid PDF and starts the parse job", async () => {
    vi.mocked(api.getProject).mockResolvedValue(
      project({ report: undefined, analysis: undefined }),
    );
    vi.mocked(api.uploadReport).mockResolvedValue({
      id: "job_parse",
      kind: "parse",
      status: "queued",
      progress: 0,
      stage: "Queued",
      startedAt: new Date().toISOString(),
    });
    vi.mocked(api.getJob).mockResolvedValue({
      id: "job_parse",
      kind: "parse",
      status: "running",
      progress: 30,
      stage: "Extracting text",
      startedAt: new Date().toISOString(),
    });

    const { container } = renderWithQuery(<ReportStep projectId="prj_1" />);
    await screen.findByText(/Drop a report here/);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["x"], "q3.pdf", { type: "application/pdf" }),
    );

    await waitFor(() => expect(api.uploadReport).toHaveBeenCalled());
  });
});

// ── Rule 4 ──────────────────────────────────────────────────────────────────

describe("rule 4 · every AI string is editable", () => {
  it("renders subject, greeting and body as real controls", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.listPresets).mockResolvedValue([]);

    renderWithQuery(<EmailStep projectId="prj_1" />);

    for (const label of ["Subject", "Greeting", "Body"]) {
      const field = await screen.findByLabelText(label);
      await userEvent.type(field, "!");
    }

    // Typing wrote through to the draft store — the edit survives leaving.
    const draft = useWorkflowStore.getState().getDraft("prj_1");
    expect(draft.subject).toBeDefined();
    expect(draft.body).toBeDefined();
  });
});

// ── Rule 11 ─────────────────────────────────────────────────────────────────

describe("rule 11 · recipient data stays off the URL", () => {
  it("puts nothing recipient-derived in any href on Review", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.buildPackage).mockResolvedValue(PACKAGE);

    const { container } = renderWithQuery(<ReviewStep projectId="prj_1" />);
    await screen.findByRole("button", { name: /Approve & Send/ });

    for (const link of container.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href") ?? "";
      for (const value of [RECIPIENT.name, RECIPIENT.email, RECIPIENT.company]) {
        expect(href).not.toContain(value);
      }
    }
  });

  it("navigates between steps by id alone", async () => {
    vi.mocked(api.getProject).mockResolvedValue(project());
    vi.mocked(api.listPresets).mockResolvedValue([]);

    renderWithQuery(<EmailStep projectId="prj_1" />);
    await screen.findByLabelText("Subject");

    await userEvent.click(screen.getByRole("button", { name: /Review the package/ }));
    expect(push).toHaveBeenCalledWith("/projects/prj_1/review");
  });
});

// ── Step 7 ──────────────────────────────────────────────────────────────────

describe("send is Review's confirmed state, not a route", () => {
  it("renders the success state in place once the package is sent", async () => {
    vi.mocked(api.getProject).mockResolvedValue(
      project({
        status: "sent",
        package: { ...PACKAGE, status: "sent", sentAt: "2026-09-01T10:00:00.000Z" },
      }),
    );
    vi.mocked(api.buildPackage).mockResolvedValue(PACKAGE);

    renderWithQuery(<ReviewStep projectId="prj_1" />);

    expect(await screen.findByText(/reached Ada Speke/)).toBeInTheDocument();
    // And no way to send it again from here.
    expect(
      screen.queryByRole("button", { name: /Approve & Send/ }),
    ).not.toBeInTheDocument();
  });
});
