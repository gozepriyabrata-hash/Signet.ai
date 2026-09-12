import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { Job, Project, Report } from "@/types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({
  api: { createProject: vi.fn(), uploadReport: vi.fn() },
}));

const createProject = vi.mocked(api.createProject);
const uploadReport = vi.mocked(api.uploadReport);

const CREATED: Project = {
  id: "prj_new123",
  name: "Untitled project",
  status: "draft",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

const PARSE_JOB: Job<Report> = {
  id: "job_parse1",
  kind: "parse",
  status: "running",
  progress: 10,
  stage: "Reading the report",
  startedAt: "2026-09-01T10:00:00.000Z",
};

function pdfFile(name = "report.pdf") {
  return new File(["%PDF-1.4"], name, { type: "application/pdf" });
}

beforeEach(() => {
  createProject.mockReset();
  uploadReport.mockReset();
  push.mockReset();
  useWorkflowStore.setState({ activeJobs: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DashboardHeader · greeting", () => {
  it("greets by name and time of day, once the mount effect resolves it", async () => {
    vi.setSystemTime(new Date(2026, 8, 11, 9, 0));
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Good morning, Priyabrata",
      ),
    );
  });

  it("drops the name when there is no signed-in account", async () => {
    vi.setSystemTime(new Date(2026, 8, 11, 20, 0));
    renderWithQuery(<DashboardHeader accountName={null} />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Good evening",
      ),
    );
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(
      ",",
    );
  });
});

describe("DashboardHeader · starting a project", () => {
  it("does nothing on mount — only a click or Enter starts a project", () => {
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("creates a project with no name typed, and navigates to it", async () => {
    createProject.mockResolvedValue(CREATED);
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Start a new project" }),
    );

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/projects/prj_new123"),
    );
    expect(createProject).toHaveBeenCalledWith(undefined);
    expect(uploadReport).not.toHaveBeenCalled();
  });

  it("uses the typed text as the project name", async () => {
    createProject.mockResolvedValue(CREATED);
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    await userEvent.type(
      screen.getByLabelText("Project name"),
      "Q4 renewal brief",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Start a new project" }),
    );

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith("Q4 renewal brief"),
    );
  });

  it("submits on Enter, not just on button click", async () => {
    createProject.mockResolvedValue(CREATED);
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    await userEvent.type(screen.getByLabelText("Project name"), "Brief{Enter}");

    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
  });

  it("uploads an attached report after the project is created, and tracks its job", async () => {
    createProject.mockResolvedValue(CREATED);
    uploadReport.mockResolvedValue(PARSE_JOB);
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    const file = pdfFile();
    const picker = screen.getByLabelText("Attach a report") as HTMLInputElement;
    await userEvent.upload(picker, file);

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Start a new project" }),
    );

    await waitFor(() => expect(uploadReport).toHaveBeenCalledWith("prj_new123", file));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/projects/prj_new123"),
    );
    expect(useWorkflowStore.getState().getActiveJob("prj_new123", "parse")).toBe(
      "job_parse1",
    );
  });

  it("rejects a file that is not a PDF or DOCX, inline, and does not attach it", async () => {
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    // Dropped, not picked: user-event's upload() filters candidates against
    // the input's own `accept` attribute, which is exactly the enforcement
    // lib/report-validation.ts's docstring says not to rely on (MDN: accept
    // "doesn't validate the types of the selected files"). A drop bypasses
    // that filter, same as a real browser's drag-and-drop does.
    const dropzone = screen.getByPlaceholderText(
      "Start a new project — upload a report to begin.",
    ).parentElement!;
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [new File(["hi"], "notes.txt", { type: "text/plain" })],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That file is not a PDF or a Word document. Upload a .pdf or .docx.",
    );
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
  });

  it("lets a picked file be removed before starting", async () => {
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    const picker = screen.getByLabelText("Attach a report") as HTMLInputElement;
    await userEvent.upload(picker, pdfFile());
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Remove report.pdf" }),
    );
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("shows an inline error and stays put when creation fails", async () => {
    createProject.mockImplementation(() =>
      Promise.reject(new Error("Could not start the project.")),
    );
    renderWithQuery(<DashboardHeader accountName="Priyabrata" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Start a new project" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not start the project.",
    );
    expect(push).not.toHaveBeenCalled();
  });
});
