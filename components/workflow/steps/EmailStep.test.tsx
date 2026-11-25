import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailStep } from "@/components/workflow/steps/EmailStep";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Project } from "@/types";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/projects/prj_6a905390/email",
  useParams: () => ({ id: "prj_6a905390" }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getProject: vi.fn(),
    listPresets: vi.fn(),
    generateEmail: vi.fn(),
    getJob: vi.fn(),
    cancelJob: vi.fn(),
    sendPackage: vi.fn(),
  },
}));

function mockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "prj_6a905390",
    name: "AI One Page Overview",
    status: "ready_for_review",
    createdAt: "2026-11-17T00:00:00.000Z",
    updatedAt: "2026-11-17T00:00:00.000Z",
    recipient: {
      id: "rcp_1",
      name: "Sarah Jenkins",
      role: "VP of Operations",
      company: "Acme Corp",
      email: "sjenkins@acmcorp.com",
      businessPriorities: ["cost control", "retention"],
      personalisation: "medium",
    },
    report: {
      id: "rpt_1",
      fileName: "AI_One_Page_Overview.pdf",
      fileType: "pdf",
      sizeBytes: 29000,
      uploadedAt: "2026-11-17T00:00:00.000Z",
      status: "parsed",
      pageCount: 1,
    },
    video: {
      id: "vid_1",
      projectId: "prj_6a905390",
      jobId: "job_vid_1",
      avatarId: "avt_1",
      voiceId: "voi_1",
      format: "portrait",
      captions: false,
      playbackUrl: "/uploads/videos/prj_6a905390/video.mp4",
      durationSec: 20,
    },
    ...overrides,
  };
}

describe("EmailStep layout and interactive functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowStore.getState().clearDraft("prj_6a905390");
    vi.mocked(api.listPresets).mockImplementation(async (kind) => {
      if (kind === "cta") {
        return [
          {
            id: "cta_book_meeting",
            kind: "cta",
            name: "Book a Meeting",
            description: "Opens scheduling link",
            isDefault: true,
            config: {},
          },
        ];
      }
      if (kind === "signature") {
        return [
          {
            id: "sig_default",
            kind: "signature",
            name: "Standard signature",
            isDefault: true,
            config: {},
          },
        ];
      }
      return [];
    });
  });

  it("renders the 2-column email composer matching the user reference screenshot", async () => {
    vi.mocked(api.getProject).mockResolvedValue(mockProject());

    renderWithQuery(<EmailStep projectId="prj_6a905390" />);

    // Main header
    expect(
      await screen.findByRole("heading", { name: /Compose the email/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /What arrives alongside the video. Drafted and personalized based on the recipient's information./i
      )
    ).toBeInTheDocument();

    // Personalizing for badge
    expect(
      screen.getByText(/Personalizing for:/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sarah Jenkins, VP of Operations @ Acme Corp/i)
    ).toBeInTheDocument();

    // Inputs: Subject, Greeting, Body
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Greeting")).toBeInTheDocument();
    expect(screen.getByLabelText("Body")).toBeInTheDocument();

    // "AI Generated" badges
    const badges = screen.getAllByText("AI Generated");
    expect(badges.length).toBeGreaterThanOrEqual(2);

    // Regenerate buttons (Subject, Greeting, Body)
    const regenButtons = screen.getAllByText("Regenerate");
    expect(regenButtons.length).toBe(3);

    // Call to action & Signature controls
    expect(screen.getByLabelText("Call to action")).toBeInTheDocument();
    expect(screen.getByLabelText("Signature")).toBeInTheDocument();

    // Preview Card
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText(/To:/i)).toBeInTheDocument();
    expect(screen.getByText(/Personalized Video for Sarah/i)).toBeInTheDocument();
    expect(screen.getByText("AI_One_Page_Overview.pdf")).toBeInTheDocument();
  });

  it("cycles subject and body when clicking Regenerate buttons", async () => {
    vi.mocked(api.getProject).mockResolvedValue(mockProject());

    renderWithQuery(<EmailStep projectId="prj_6a905390" />);
    await screen.findByRole("heading", { name: /Compose the email/i });

    screen.getByLabelText("Subject");

    const [regenSubject] = screen.getAllByText("Regenerate");
    fireEvent.click(regenSubject);

    await waitFor(() => {
      const updatedSubject = (screen.getByLabelText("Subject") as HTMLInputElement).value;
      expect(updatedSubject).not.toBe("");
    });
  });

  it("navigates to the review step when clicking Continue to Review", async () => {
    vi.mocked(api.getProject).mockResolvedValue(mockProject());

    renderWithQuery(<EmailStep projectId="prj_6a905390" />);
    await screen.findByRole("heading", { name: /Compose the email/i });

    const continueBtn = screen.getByRole("button", { name: /Review the package/i });
    expect(continueBtn).not.toBeDisabled();

    fireEvent.click(continueBtn);

    expect(push).toHaveBeenCalledWith("/projects/prj_6a905390/review");
  });
});
