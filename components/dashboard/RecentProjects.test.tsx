import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { Project, Recipient } from "@/types";

// The empty state now renders NewProjectButton (specs/004 §3.8 replaced a dead
// /projects/new link with a mutation), so this suite needs a router and a
// createProject as well.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({
  api: { listProjects: vi.fn(), createProject: vi.fn() },
}));

const listProjects = vi.mocked(api.listProjects);

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

beforeEach(() => listProjects.mockReset());
afterEach(() => vi.clearAllMocks());

/**
 * Rule 9 says every async surface ships loading, empty, error and success.
 * These four tests are that rule, made enforceable.
 */
describe("RecentProjects · the four states", () => {
  it("shows skeleton rows while pending", async () => {
    const pending = deferred<Project[]>();
    listProjects.mockReturnValue(pending.promise);
    renderWithQuery(<RecentProjects />);

    const list = screen.getByRole("list", { name: "Loading projects" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);

    // Settle it, or RTL's cleanup waits on a promise that never resolves.
    pending.resolve([]);
    await screen.findByText("No projects yet");
  });

  it("shows the EmptyState with a create action when there are no projects", async () => {
    listProjects.mockResolvedValue([]);
    renderWithQuery(<RecentProjects />);

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create your first communication" }),
    ).toBeInTheDocument();
  });

  it("shows an in-place Retry when the query fails, and refetches on click", async () => {
    // mockImplementation, not mockRejectedValue — see the note in
    // StatRow.test.tsx: the eager form produces an unhandled rejection.
    listProjects.mockImplementation(() =>
      Promise.reject(new Error("Could not load projects.")),
    );
    renderWithQuery(<RecentProjects />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load your projects.");

    // Recoverable in place — never a dead end.
    listProjects.mockResolvedValue([PROJECT]);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Q3 Portfolio Review")).toBeInTheDocument();
  });

  it("renders a row per project on success", async () => {
    listProjects.mockResolvedValue([PROJECT]);
    renderWithQuery(<RecentProjects />);

    expect(await screen.findByText("Q3 Portfolio Review")).toBeInTheDocument();

    // Scoped to the list: "Ready for review" is also one of the filter's
    // <option> labels, so an unscoped query matches twice.
    const list = screen.getByRole("list");
    expect(within(list).getByText("Ready for review")).toBeInTheDocument();
    expect(
      within(list).getByRole("link", { name: "Review Q3 Portfolio Review" }),
    ).toHaveAttribute("href", "/projects/prj_8f2a1c");

    // Absolute, not relative — specs/015-dashboard-redesign.md §3.3, same
    // formatDate() output components/projects/ProjectsTable.test.tsx already
    // asserts for the identical fixture updatedAt.
    expect(within(list).getByText("29 Aug 2026")).toBeInTheDocument();
  });
});

/**
 * CLAUDE.md rule 11. A "recent activity" list is the single most natural place
 * for someone to add "to: Jane Doe, Acme" as a helpful detail, so this is
 * pinned rather than trusted.
 */
describe("RecentProjects · recipient PII", () => {
  it("renders no recipient field, and puts none in a URL", async () => {
    listProjects.mockResolvedValue([PROJECT]);
    const { container } = renderWithQuery(<RecentProjects />);

    await screen.findByText("Q3 Portfolio Review");

    const markup = container.innerHTML;
    for (const secret of [
      RECIPIENT.name,
      RECIPIENT.email,
      RECIPIENT.company,
      RECIPIENT.role,
    ]) {
      expect(markup).not.toContain(secret);
    }

    for (const link of container.querySelectorAll("a")) {
      expect(link.getAttribute("href")).toBe(`/projects/${PROJECT.id}`);
    }
  });
});

describe("RecentProjects · status filter", () => {
  it("refetches with the chosen status and keeps it out of the URL", async () => {
    listProjects.mockResolvedValue([PROJECT]);
    renderWithQuery(<RecentProjects />);
    await screen.findByText("Q3 Portfolio Review");

    const before = window.location.search;
    await userEvent.selectOptions(
      screen.getByLabelText("Status"),
      "ready_for_review",
    );

    await waitFor(() =>
      expect(listProjects).toHaveBeenCalledWith({ status: "ready_for_review" }),
    );
    // specs/003 §3.7 — component state, not a searchParams value.
    expect(window.location.search).toBe(before);
  });

  it("offers a way back when a filter matches nothing", async () => {
    listProjects.mockResolvedValue([]);
    renderWithQuery(<RecentProjects />);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "failed");

    expect(
      await screen.findByText("No projects with this status."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show all projects" }),
    ).toBeInTheDocument();
  });
});
