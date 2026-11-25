import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SavedDraftsView } from "@/components/drafts/SavedDraftsView";
import { api } from "@/lib/api";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Project } from "@/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/drafts",
  useSearchParams: () => new URLSearchParams(),
}));

const mockDraftProject: Project = {
  id: "prj_test1",
  name: "Strategic Talent Briefing: AYAN GHOSH",
  status: "draft",
  createdAt: "2026-11-20T08:00:00Z",
  updatedAt: "2026-11-20T09:30:00Z",
  report: {
    id: "rep_1",
    fileName: "investment_summary.docx",
    fileType: "docx",
    sizeBytes: 37000,
    status: "parsed",
    uploadedAt: "2026-11-20T08:05:00Z",
  },
  video: {
    id: "vid_1",
    projectId: "prj_test1",
    jobId: "job_1",
    avatarId: "avatar_1",
    voiceId: "voice_1",
    format: "portrait",
    captions: true,
    playbackUrl: "https://example.com/video.mp4",
  },
  recipient: {
    id: "rec_1",
    name: "AYAN GHOSH",
    role: "VP AI",
    company: "Signet",
    email: "ayan@signetai.com",
    industry: "Tech",
    businessPriorities: ["Automation"],
    personalisation: "medium",
  },
  email: {
    id: "eml_1",
    projectId: "prj_test1",
    subject: "Strategic Briefing",
    greeting: "Hi Ayan",
    body: "Please review the attached brief.",
    ctaId: "cta_1",
    signatureId: "sig_1",
    editedByUser: false,
  },
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("SavedDraftsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowStore.setState({ drafts: {}, activeJobs: {} });
    vi.spyOn(api, "listProjects").mockResolvedValue([mockDraftProject]);
  });

  it("renders page header, breadcrumbs, search bar, and create project button", async () => {
    renderWithClient(<SavedDraftsView />);

    expect(screen.getByText("Saved Drafts")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage, resume, or delete your unpublished work. Drafts are saved securely in your workspace."
      )
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search drafts...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create New Project/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders draft cards with title, relative timestamp, and dynamic status pills", async () => {
    renderWithClient(<SavedDraftsView />);

    await waitFor(() => {
      expect(
        screen.getByText("Strategic Talent Briefing: AYAN GHOSH")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("investment_summary.docx")).toBeInTheDocument();
    expect(screen.getByText("Video ready")).toBeInTheDocument();
    expect(screen.getByText("Recipients set")).toBeInTheDocument();
    expect(screen.getByText("Email draft")).toBeInTheDocument();
  });

  it("resumes editing by hydrating the workflow store and navigating to resume step", async () => {
    const user = userEvent.setup();
    renderWithClient(<SavedDraftsView />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Resume Edition" })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Resume Edition" }));

    // Store is hydrated with recipient, script, email, etc.
    const hydratedDraft = useWorkflowStore.getState().getDraft("prj_test1");
    expect(hydratedDraft?.recipient?.name).toBe("AYAN GHOSH");
    expect(hydratedDraft?.avatarId).toBe("avatar_1");

    // Router navigated to the project
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/projects/prj_test1/")
    );
  });

  it("opens delete confirmation and deletes the draft when confirmed", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(api, "deleteProject").mockResolvedValue();

    renderWithClient(<SavedDraftsView />);

    await waitFor(() => {
      expect(screen.getByTitle("Delete draft")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Delete draft"));

    expect(screen.getByText("Delete draft?")).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmDeleteBtn);

    expect(deleteSpy).toHaveBeenCalledWith("prj_test1");
  });
});
