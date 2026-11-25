import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecipientStep } from "@/components/workflow/steps/RecipientStep";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Project } from "@/types";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/projects/prj_6a905390/recipient",
  useParams: () => ({ id: "prj_6a905390" }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getProject: vi.fn(),
    listPresets: vi.fn(),
    saveRecipient: vi.fn(),
    analyzeReport: vi.fn(),
    getJob: vi.fn(),
  },
}));

function mockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "prj_6a905390",
    name: "AI One Page Overview",
    status: "ready_for_review",
    createdAt: "2026-11-17T00:00:00.000Z",
    updatedAt: "2026-11-17T00:00:00.000Z",
    video: {
      id: "vid_1",
      projectId: "prj_6a905390",
      jobId: "job_vid_1",
      avatarId: "avt_1",
      voiceId: "voi_1",
      format: "portrait",
      captions: false,
      playbackUrl: "/uploads/videos/prj_6a905390/4a7bb161-4179-404f-a500-3204d0648c85_1794906795.mp4",
      durationSec: 20,
    },
    ...overrides,
  };
}

describe("RecipientStep layout and functional connectivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLMediaElement.prototype.load = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    useWorkflowStore.getState().clearDraft("prj_6a905390");
    vi.mocked(api.listPresets).mockResolvedValue([]);
  });

  it("renders the 2-column layout matching the design reference", async () => {
    vi.mocked(api.getProject).mockResolvedValue(mockProject());

    renderWithQuery(<RecipientStep projectId="prj_6a905390" />);

    // Header & Titles
    expect(
      await screen.findByRole("heading", { name: /Add Your Recipient/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tell us who you're personalizing the video and email for.")
    ).toBeInTheDocument();

    // Form inputs
    expect(screen.getByPlaceholderText("e.g. Sarah Jenkins")).toBeInTheDocument();
    expect(screen.getByText(/^Role/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Acme Corp")).toBeInTheDocument();
    expect(screen.getByText(/^Industry/i)).toBeInTheDocument();
    expect(screen.getByText(/Business Priorities/i)).toBeInTheDocument();

    // Priority Pills
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getAllByText("AI Automation").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Team Efficiency")).toBeInTheDocument();
    expect(screen.getByText("Cost Control")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More/i })).toBeInTheDocument();

    // Note input and character count
    expect(
      screen.getByPlaceholderText("Any additional details about this recipient...")
    ).toBeInTheDocument();
    expect(screen.getByText("0/500")).toBeInTheDocument();

    // Video Preview section
    expect(screen.getByText("Video Preview")).toBeInTheDocument();
    expect(
      screen.getByText("Looks great! Your personalized video is ready.")
    ).toBeInTheDocument();
  });

  it("connects the generated video from the previous step to the video player", async () => {
    vi.mocked(api.getProject).mockResolvedValue(mockProject());

    const { container } = renderWithQuery(<RecipientStep projectId="prj_6a905390" />);
    await screen.findByRole("heading", { name: /Add Your Recipient/i });

    const videoElement = container.querySelector("video");
    expect(videoElement).toBeInTheDocument();
    expect(videoElement?.getAttribute("src")).toContain(
      "/uploads/videos/prj_6a905390/4a7bb161-4179-404f-a500-3204d0648c85_1794906795.mp4"
    );
  });

  it("disables the Continue button until Full Name is provided", async () => {
    vi.mocked(api.getProject).mockResolvedValue(mockProject());

    renderWithQuery(<RecipientStep projectId="prj_6a905390" />);
    await screen.findByRole("heading", { name: /Add Your Recipient/i });

    const continueBtn = screen.getByRole("button", { name: /Continue to Email/i });
    expect(continueBtn).toBeDisabled();

    // Type full name to enable it
    const nameInput = screen.getByPlaceholderText("e.g. Sarah Jenkins");
    await userEvent.type(nameInput, "Sarah Jenkins");
    expect(continueBtn).not.toBeDisabled();
  });

  it("submits the recipient form, saves draft, and navigates to the Email page", async () => {
    vi.mocked(api.getProject).mockResolvedValue(mockProject());
    vi.mocked(api.saveRecipient).mockResolvedValue({
      id: "rcp_new",
      name: "Sarah Jenkins",
      role: "CEO / Founder",
      company: "Acme Corp",
      email: "sarah.jenkins@acmecorp.com",
      businessPriorities: ["AI Automation", "Growth"],
      personalisation: "medium",
    });
    vi.mocked(api.analyzeReport).mockResolvedValue({
      id: "job_an",
      kind: "analysis",
      status: "succeeded",
      progress: 100,
      stage: "Done",
      startedAt: new Date().toISOString(),
    });

    renderWithQuery(<RecipientStep projectId="prj_6a905390" />);
    await screen.findByRole("heading", { name: /Add Your Recipient/i });

    // Fill Full Name
    const nameInput = screen.getByPlaceholderText("e.g. Sarah Jenkins");
    await userEvent.type(nameInput, "Sarah Jenkins");

    // Fill Email Address
    const emailInput = screen.getByPlaceholderText("e.g. example@gmail.com");
    await userEvent.type(emailInput, "sarah.jenkins@acmecorp.com");

    // Fill Company
    const companyInput = screen.getByPlaceholderText("e.g. Acme Corp");
    await userEvent.type(companyInput, "Acme Corp");


    // Toggle Growth priority
    const growthPill = screen.getByText("Growth");
    fireEvent.click(growthPill);

    // Click Continue to Email
    const continueBtn = screen.getByRole("button", { name: /Continue to Email/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/projects/prj_6a905390/email");
    });

    // Check that draft was updated in store
    const draft = useWorkflowStore.getState().getDraft("prj_6a905390");
    expect(draft.recipient?.name).toBe("Sarah Jenkins");
    expect(draft.recipient?.email).toBe("sarah.jenkins@acmecorp.com");
    expect(draft.recipient?.company).toBe("Acme Corp");

    expect(draft.recipient?.businessPriorities).toContain("AI Automation");
    expect(draft.recipient?.businessPriorities).toContain("Growth");
  });
});
