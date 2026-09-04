import { QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { Project, Recipient } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/projects",
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
  // Deliberately does NOT contain the recipient's personal name, so the PII
  // assertion below cannot pass by accident on a substring of the title.
  name: "Q3 Portfolio Review",
  status: "ready_for_review",
  createdAt: "2026-08-28T09:12:00.000Z",
  updatedAt: "2026-08-29T14:03:00.000Z",
  recipient: RECIPIENT,
};

const props = {
  status: "all" as const,
  query: "",
  isFiltered: false,
  onClearFilters: vi.fn(),
};

beforeEach(() => {
  listProjects.mockReset();
  props.onClearFilters.mockReset();
});

describe("ProjectsTable · the four states", () => {
  it("shows skeleton rows while pending", async () => {
    const pending = deferred<Project[]>();
    listProjects.mockReturnValue(pending.promise);

    const { container } = renderWithQuery(<ProjectsTable {...props} />);

    expect(screen.getByText("Loading projects")).toBeInTheDocument();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);

    pending.resolve([]);
    await screen.findByText("No projects yet");
  });

  it("shows the create-first empty state when nothing is filtered", async () => {
    listProjects.mockResolvedValue([]);
    renderWithQuery(<ProjectsTable {...props} />);

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create your first communication" }),
    ).toBeInTheDocument();
  });

  it("shows a way back, not a way forward, when filters match nothing", async () => {
    listProjects.mockResolvedValue([]);
    renderWithQuery(<ProjectsTable {...props} isFiltered status="sent" />);

    expect(
      await screen.findByText("No projects match these filters."),
    ).toBeInTheDocument();
    // Offering "create a project" to someone who mistyped a search answers a
    // question they did not ask.
    expect(
      screen.queryByRole("button", { name: /create your first/i }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(props.onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("shows an in-place Retry when the query fails", async () => {
    listProjects.mockImplementation(() =>
      Promise.reject(new Error("Could not load projects.")),
    );
    renderWithQuery(<ProjectsTable {...props} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load your projects.",
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders a table with column headers on success", async () => {
    listProjects.mockResolvedValue([PROJECT]);
    renderWithQuery(<ProjectsTable {...props} />);

    // Wait for the DATA, not for a table: the loading state is also a <table>,
    // so findByRole("table") resolves against the skeleton immediately.
    await screen.findByText("Q3 Portfolio Review");
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Project" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Last updated" }),
    ).toBeInTheDocument();
    expect(within(table).getByText("29 Aug 2026")).toBeInTheDocument();
  });
});

/**
 * CLAUDE.md rule 11, and the second place this temptation arises — a table with
 * room for one more column is exactly where a "Client" column gets added.
 */
describe("ProjectsTable · recipient PII", () => {
  it("renders no recipient field, and puts none in a URL", async () => {
    listProjects.mockResolvedValue([PROJECT]);
    const { container } = renderWithQuery(<ProjectsTable {...props} />);

    await screen.findByRole("table");

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

describe("ProjectsTable · changing filters", () => {
  it("keeps the previous rows on screen instead of blanking to skeletons", async () => {
    listProjects.mockResolvedValue([PROJECT]);
    const { rerender, queryClient } = renderWithQuery(
      <ProjectsTable {...props} />,
    );
    await screen.findByText("Q3 Portfolio Review");

    // The next fetch never settles, so the table is mid-change for the whole
    // assertion — exactly the window where it must not blank.
    const pending = deferred<Project[]>();
    listProjects.mockReturnValue(pending.promise);

    // Rerender through the same client, so the cache carries over and
    // keepPreviousData has something to keep.
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProjectsTable {...props} status="sent" isFiltered />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(listProjects).toHaveBeenLastCalledWith({
        status: "sent",
        query: undefined,
      }),
    );

    // Still there, dimmed rather than removed.
    expect(screen.getByText("Q3 Portfolio Review")).toBeInTheDocument();
    expect(screen.queryByText("Loading projects")).not.toBeInTheDocument();

    pending.resolve([]);
  });
});
