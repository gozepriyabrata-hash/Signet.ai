import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StatRow } from "@/components/dashboard/StatRow";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { DashboardStats } from "@/types";

vi.mock("@/lib/api", () => ({
  api: { getStats: vi.fn() },
}));

const getStats = vi.mocked(api.getStats);

beforeEach(() => {
  getStats.mockReset();
});

describe("StatRow", () => {
  it("renders one skeleton per tile, so nothing shifts when values land", async () => {
    const pending = deferred<DashboardStats>();
    getStats.mockReturnValue(pending.promise);

    const { container } = renderWithQuery(<StatRow />);

    const skeletonRegion = screen.getByLabelText("Loading statistics");
    // Three tiles in, three tiles out — docs/design-system.md §6 forbids
    // layout shift when async content lands.
    expect(skeletonRegion.children).toHaveLength(3);
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6);

    // Settle it, or RTL's cleanup waits on a promise that never resolves.
    pending.resolve({ activeProjects: 0, videosGenerated: 0, emailsSent: 0 });
    await screen.findByText("Active projects");
  });

  it("renders the three headline numbers on success", async () => {
    getStats.mockResolvedValue({
      activeProjects: 24,
      videosGenerated: 186,
      emailsSent: 142,
    });
    renderWithQuery(<StatRow />);

    expect(await screen.findByText("24")).toBeInTheDocument();
    expect(screen.getByText("186")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
  });

  it("offers an in-place Retry when the query fails", async () => {
    // mockImplementation, not mockRejectedValue: the latter builds the rejected
    // promise when the mock is configured, before anything can attach a
    // handler, so Node reports an unhandled rejection and Vitest fails the test
    // even though the component handles the error correctly.
    getStats.mockImplementation(() =>
      Promise.reject(new Error("Could not load statistics.")),
    );
    renderWithQuery(<StatRow />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load your statistics.",
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
