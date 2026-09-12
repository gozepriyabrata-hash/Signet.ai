import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/shell/Sidebar";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import type { Project } from "@/types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({
  api: { createProject: vi.fn() },
}));

vi.mock("@/lib/auth/actions", () => ({
  logoutAction: vi.fn(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUiStore: Object.assign(
    (selector: (state: { sidebarCollapsed: boolean; toggleSidebar: () => void }) => unknown) =>
      selector({ sidebarCollapsed: false, toggleSidebar: vi.fn() }),
    { persist: { rehydrate: vi.fn() } },
  ),
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

/**
 * specs/015-dashboard-redesign.md §3.5 — a second entry point to the same
 * createProject mutation the dashboard's hero CTA calls. No new capability.
 */
describe("Sidebar · New Project", () => {
  it("creates a project and navigates to it, from the sidebar", async () => {
    createProject.mockResolvedValue(CREATED);
    renderWithQuery(<Sidebar />);

    await userEvent.click(screen.getByRole("button", { name: "New Project" }));

    expect(createProject).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/projects/prj_new123");
  });

  it("still renders the five fixed destinations", () => {
    renderWithQuery(<Sidebar />);

    for (const label of ["Dashboard", "Projects", "Campaigns", "Analytics", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
