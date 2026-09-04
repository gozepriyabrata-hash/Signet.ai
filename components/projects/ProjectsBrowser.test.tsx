import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsBrowser } from "@/components/projects/ProjectsBrowser";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import type { Project } from "@/types";

const routerMock = {
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/projects",
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/api", () => ({
  api: { listProjects: vi.fn(), createProject: vi.fn() },
}));

const listProjects = vi.mocked(api.listProjects);

const PROJECT: Project = {
  id: "prj_8f2a1c",
  name: "Q3 Portfolio Review — Meridian Capital",
  status: "ready_for_review",
  createdAt: "2026-08-28T09:12:00.000Z",
  updatedAt: "2026-08-29T14:03:00.000Z",
  recipient: {
    id: "rcp_1",
    name: "Jane Fairweather",
    role: "Chief Investment Officer",
    company: "Meridian Capital",
    email: "jane.fairweather@meridian.example",
    businessPriorities: ["capital preservation"],
    personalisation: "high",
  },
};

beforeEach(() => {
  searchParams = new URLSearchParams();
  routerMock.replace.mockReset();
  routerMock.push.mockReset();
  listProjects.mockReset();
  listProjects.mockResolvedValue([PROJECT]);
});

/**
 * specs/004 §3.1 and §4. This is the spec's central decision, and the two
 * assertions below are the only thing standing between it and someone
 * "improving" the search box by making it shareable.
 */
describe("ProjectsBrowser · where list state lives", () => {
  it("puts the status filter in the URL", async () => {
    renderWithQuery(<ProjectsBrowser />);
    await screen.findByText(PROJECT.name);

    await userEvent.selectOptions(
      screen.getByLabelText("Status"),
      "ready_for_review",
    );

    expect(routerMock.replace).toHaveBeenCalledWith(
      "/projects?status=ready_for_review",
      { scroll: false },
    );
  });

  it("never puts the search query in the URL", async () => {
    renderWithQuery(<ProjectsBrowser />);
    await screen.findByText(PROJECT.name);

    await userEvent.type(screen.getByLabelText("Search"), "meridian");

    // Rule 11: project names carry client identity, so a ?q= parameter would
    // leak it into history and shared links.
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("replaces rather than pushes, so Back leaves the page", async () => {
    renderWithQuery(<ProjectsBrowser />);
    await screen.findByText(PROJECT.name);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "sent");

    expect(routerMock.replace).toHaveBeenCalledTimes(1);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("drops the parameter entirely when the filter goes back to All", async () => {
    searchParams = new URLSearchParams("status=sent");
    renderWithQuery(<ProjectsBrowser />);
    await screen.findByText(PROJECT.name);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "all");

    expect(routerMock.replace).toHaveBeenCalledWith("/projects", {
      scroll: false,
    });
  });

  it("reads the status back out of the URL on a cold load", async () => {
    searchParams = new URLSearchParams("status=sent");
    renderWithQuery(<ProjectsBrowser />);

    await waitFor(() =>
      expect(listProjects).toHaveBeenCalledWith({
        status: "sent",
        query: undefined,
      }),
    );
    expect(screen.getByLabelText("Status")).toHaveValue("sent");
  });

  it("ignores a status the app does not recognise", async () => {
    searchParams = new URLSearchParams("status=not-a-status");
    renderWithQuery(<ProjectsBrowser />);

    await waitFor(() =>
      expect(listProjects).toHaveBeenCalledWith({
        status: undefined,
        query: undefined,
      }),
    );
    expect(screen.getByLabelText("Status")).toHaveValue("all");
  });
});

describe("ProjectsBrowser · search", () => {
  it("debounces, so typing is one request rather than one per keystroke", async () => {
    // Real timers, not fake ones: TanStack Query schedules its own timers, and
    // faking them alongside userEvent's deadlocks the test rather than
    // advancing it. The debounce is observable without faking anything.
    renderWithQuery(<ProjectsBrowser />);
    await screen.findByText(PROJECT.name);

    const callsBeforeTyping = listProjects.mock.calls.length;
    await userEvent.type(screen.getByLabelText("Search"), "meridian");

    await waitFor(() =>
      expect(listProjects).toHaveBeenLastCalledWith({
        status: undefined,
        query: "meridian",
      }),
    );

    // Eight keystrokes, and far fewer than eight requests.
    expect(listProjects.mock.calls.length - callsBeforeTyping).toBeLessThan(4);
  });

  it("passes an empty search as undefined rather than an empty string", async () => {
    renderWithQuery(<ProjectsBrowser />);
    await screen.findByText(PROJECT.name);

    expect(listProjects).toHaveBeenCalledWith({
      status: undefined,
      query: undefined,
    });
  });
});
