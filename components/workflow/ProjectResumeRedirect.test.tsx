import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectResumeRedirect } from "@/components/workflow/ProjectResumeRedirect";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { Project, Recipient } from "@/types";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({ api: { getProject: vi.fn() } }));

const getProject = vi.mocked(api.getProject);

const RECIPIENT: Recipient = {
  id: "rcp_1",
  name: "Jane Fairweather",
  role: "Chief Investment Officer",
  company: "Meridian Capital",
  email: "jane.fairweather@meridian.example",
  businessPriorities: ["capital preservation"],
  personalisation: "high",
};

const PROJECT: Project = {
  id: "prj_8f2a1c",
  name: "Q3 Portfolio Review",
  status: "ready_for_review",
  createdAt: "2026-08-28T09:12:00.000Z",
  updatedAt: "2026-08-29T14:03:00.000Z",
  recipient: RECIPIENT,
};

/** What the mock adapter raises for an id that is not in the store. */
class NotFound extends Error {
  readonly code = "NOT_FOUND";
  readonly retryable = false;
}

beforeEach(() => {
  getProject.mockReset();
  redirect.mockReset();
});
afterEach(() => vi.clearAllMocks());

/** Rule 9: loading, empty, error, success — all four, on a route whose entire
 *  job is to disappear. */
describe("ProjectResumeRedirect · the four states", () => {
  it("announces the lookup and redirects nowhere while it is pending", async () => {
    const pending = deferred<Project>();
    getProject.mockReturnValue(pending.promise);

    renderWithQuery(<ProjectResumeRedirect projectId="prj_8f2a1c" />);

    expect(screen.getByRole("status")).toHaveTextContent("Opening project");
    expect(redirect).not.toHaveBeenCalled();

    // Settle it, or RTL's cleanup waits on a promise that never resolves.
    pending.resolve(PROJECT);
    await waitFor(() => expect(redirect).toHaveBeenCalled());
  });

  it("redirects a ready project to its review step", async () => {
    getProject.mockResolvedValue(PROJECT);

    renderWithQuery(<ProjectResumeRedirect projectId="prj_8f2a1c" />);

    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith("/projects/prj_8f2a1c/review"),
    );
  });

  it("offers a way back when the project does not exist", async () => {
    getProject.mockRejectedValue(new NotFound("No project with id prj_gone."));

    renderWithQuery(<ProjectResumeRedirect projectId="prj_gone" />);

    expect(
      await screen.findByText("That project no longer exists"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it("recovers in place when the lookup fails", async () => {
    // Rejected every time, not once: a transient failure is retried once
    // before the error state is reached, so a single rejection never gets
    // there.
    getProject.mockRejectedValue(new Error("Network unreachable."));

    renderWithQuery(<ProjectResumeRedirect projectId="prj_8f2a1c" />);

    // The single retry runs on TanStack's default ~1s backoff, so the error
    // state legitimately arrives later than findBy's 1s default allows.
    const alert = await screen.findByRole("alert", {}, { timeout: 5_000 });
    expect(alert).toHaveTextContent("Could not open this project");
    expect(alert).toHaveTextContent("Network unreachable.");

    getProject.mockResolvedValue(PROJECT);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(redirect).toHaveBeenCalledWith("/projects/prj_8f2a1c/review"),
    );
  });
});

describe("ProjectResumeRedirect · the redirect target", () => {
  it("does not retry a project that is not there", async () => {
    getProject.mockRejectedValue(new NotFound("No project with id prj_gone."));

    renderWithQuery(<ProjectResumeRedirect projectId="prj_gone" />);
    await screen.findByText("That project no longer exists");

    // A 404 does not become a 200 on the second attempt; retrying only makes
    // the user wait through another round of latency for the same answer.
    expect(getProject).toHaveBeenCalledTimes(1);
  });

  it("resolves each status to its own step", async () => {
    for (const [status, step] of [
      ["draft", "report"],
      ["analysing", "analysis"],
      ["video_pending", "video"],
      ["email_pending", "email"],
      ["sent", "review"],
    ] as const) {
      redirect.mockReset();
      getProject.mockResolvedValue({ ...PROJECT, status });

      const { unmount } = renderWithQuery(
        <ProjectResumeRedirect projectId="prj_8f2a1c" />,
      );

      await waitFor(() =>
        expect(redirect).toHaveBeenCalledWith(`/projects/prj_8f2a1c/${step}`),
      );
      unmount();
    }
  });

  it("keeps the recipient out of the URL it navigates to", async () => {
    // Rule 11, at the one boundary where a project's PII could reach a URL.
    getProject.mockResolvedValue(PROJECT);

    renderWithQuery(<ProjectResumeRedirect projectId="prj_8f2a1c" />);
    await waitFor(() => expect(redirect).toHaveBeenCalled());

    const [href] = redirect.mock.calls[0] as [string];
    for (const value of [RECIPIENT.name, RECIPIENT.email, RECIPIENT.company]) {
      expect(href).not.toContain(value);
    }
  });
});
