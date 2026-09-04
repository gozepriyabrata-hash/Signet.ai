import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewProjectButton } from "@/components/shared/NewProjectButton";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import type { Project } from "@/types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({
  api: { createProject: vi.fn() },
}));

const createProject = vi.mocked(api.createProject);

const CREATED: Project = {
  id: "prj_new123",
  name: "Untitled project",
  status: "draft",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

beforeEach(() => {
  createProject.mockReset();
  push.mockReset();
});

describe("NewProjectButton", () => {
  /**
   * The single most important assertion here. Creating a project is a write,
   * and a write that fires on mount would run on every dashboard visit — the
   * same class of mistake CLAUDE.md rule 2 forbids for sending.
   */
  it("does not create a project on mount", () => {
    createProject.mockResolvedValue(CREATED);
    renderWithQuery(<NewProjectButton />);

    expect(createProject).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("creates exactly one project per click, and navigates to it", async () => {
    createProject.mockResolvedValue(CREATED);
    renderWithQuery(<NewProjectButton />);

    await userEvent.click(screen.getByRole("button", { name: "+ Create New" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/projects/prj_new123"));
    expect(createProject).toHaveBeenCalledTimes(1);
  });

  it("offers a retry when creation fails, and does not navigate", async () => {
    createProject.mockImplementation(() =>
      Promise.reject(new Error("Could not create the project.")),
    );
    renderWithQuery(<NewProjectButton />);

    await userEvent.click(screen.getByRole("button", { name: "+ Create New" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not create the project.");
    expect(push).not.toHaveBeenCalled();

    createProject.mockResolvedValue(CREATED);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/projects/prj_new123"));
  });

  it("takes a custom label, for the empty state", () => {
    createProject.mockResolvedValue(CREATED);
    renderWithQuery(<NewProjectButton label="Create your first communication" />);

    expect(
      screen.getByRole("button", { name: "Create your first communication" }),
    ).toBeInTheDocument();
  });
});
