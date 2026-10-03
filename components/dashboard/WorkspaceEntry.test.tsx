import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceEntry } from "@/components/dashboard/WorkspaceEntry";
import { renderWithQuery } from "@/test/render-with-query";

const replace = vi.fn();
const listProjects = vi.fn();
const createProject = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listProjects: (...args: unknown[]) => listProjects(...args),
    createProject: (...args: unknown[]) => createProject(...args),
  },
}));

afterEach(() => vi.clearAllMocks());

const project = (id: string, extra: object = {}) => ({
  id,
  name: id,
  status: "draft",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...extra,
});

describe("WorkspaceEntry", () => {
  it("reopens an untouched project instead of creating another", async () => {
    listProjects.mockResolvedValue([
      project("prj_started", { report: { status: "parsed" } }),
      project("prj_fresh"),
    ]);
    renderWithQuery(<WorkspaceEntry />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects/prj_fresh"));
    expect(createProject).not.toHaveBeenCalled();
  });

  it("creates exactly one project when there is nothing untouched", async () => {
    listProjects.mockResolvedValue([project("prj_sent", { status: "sent" })]);
    createProject.mockResolvedValue(project("prj_new"));
    renderWithQuery(<WorkspaceEntry />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects/prj_new"));
    expect(createProject).toHaveBeenCalledTimes(1);
  });
});
