import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsBrowser } from "@/components/analytics/AnalyticsBrowser";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { AnalyticsSummary } from "@/types";

const replace = vi.hoisted(() => vi.fn());
const searchParams = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
  usePathname: () => "/analytics",
  useSearchParams: () => searchParams.current,
}));

vi.mock("@/lib/api", () => ({ api: { getAnalytics: vi.fn() } }));

const getAnalytics = vi.mocked(api.getAnalytics);

function summary(overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  return {
    range: "30d",
    from: "2026-08-03T00:00:00.000Z",
    to: "2026-09-01T00:00:00.000Z",
    packagesSent: 6,
    videosGenerated: 186,
    emailsSent: 142,
    sendsFailed: 1,
    successRate: 6 / 7,
    medianHoursToSend: 26,
    bucket: "day",
    sentOverTime: [
      { bucketStart: "2026-08-27T00:00:00.000Z", count: 2 },
      // A zero in the middle: the adapter emits empty buckets, and a chart that
      // skipped them would lie about its x-axis.
      { bucketStart: "2026-08-28T00:00:00.000Z", count: 0 },
      { bucketStart: "2026-08-29T00:00:00.000Z", count: 4 },
    ],
    projectsByStatus: [
      { status: "draft", count: 1 },
      { status: "analysing", count: 1 },
      { status: "video_pending", count: 1 },
      { status: "email_pending", count: 0 },
      { status: "ready_for_review", count: 1 },
      { status: "sent", count: 11 },
      { status: "failed", count: 2 },
    ],
    ...overrides,
  };
}

/**
 * No `beforeEach` mock reset here, deliberately — see the note at the top of
 * components/campaigns/CampaignDetail.test.tsx. Clearing the api mock from a
 * `beforeEach` makes a rejection it later produces surface as an uncaught error
 * rather than as the query's error state.
 */
afterEach(() => {
  vi.clearAllMocks();
  searchParams.current = new URLSearchParams();
});

/** Rule 9. */
describe("AnalyticsBrowser · the four states", () => {
  it("shows a skeleton while pending", async () => {
    const pending = deferred<AnalyticsSummary>();
    getAnalytics.mockReturnValue(pending.promise);

    renderWithQuery(<AnalyticsBrowser />);

    expect(screen.getByLabelText("Loading analytics")).toBeInTheDocument();

    pending.resolve(summary());
    await screen.findByText("Packages sent");
  });

  it("renders the figures on success", async () => {
    getAnalytics.mockResolvedValue(summary());
    renderWithQuery(<AnalyticsBrowser />);

    expect(await screen.findByText("Packages sent")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(screen.getByText("26h")).toBeInTheDocument();
    expect(screen.getByText("1 did not reach their recipient.")).toBeInTheDocument();
  });

  it("recovers in place when the query fails", async () => {
    getAnalytics.mockRejectedValue(new Error("Could not reach the server."));

    renderWithQuery(<AnalyticsBrowser />);

    const alert = await screen.findByRole("alert", {}, { timeout: 5_000 });
    expect(alert).toHaveTextContent("Could not load your analytics.");

    getAnalytics.mockResolvedValue(summary());
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Packages sent")).toBeInTheDocument();
  });

  it("shows two different empties, because they need different answers", async () => {
    // A period with nothing in it needs a way to widen the period.
    getAnalytics.mockResolvedValue(
      summary({ range: "7d", packagesSent: 0, sendsFailed: 0, successRate: null }),
    );
    searchParams.current = new URLSearchParams("range=7d");

    const { unmount } = renderWithQuery(<AnalyticsBrowser />);
    expect(
      await screen.findByText("Nothing was sent in this period."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show all time" })).toBeInTheDocument();
    unmount();

    // Nothing sent ever needs no way back — there is nowhere wider to go.
    searchParams.current = new URLSearchParams("range=all");
    getAnalytics.mockResolvedValue(
      summary({ range: "all", packagesSent: 0, sendsFailed: 0, successRate: null }),
    );

    renderWithQuery(<AnalyticsBrowser />);
    expect(await screen.findByText("Nothing sent yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show all time" }),
    ).not.toBeInTheDocument();
  });
});

describe("AnalyticsBrowser · absence is not zero", () => {
  it("renders a null success rate as an em dash, never as 0%", async () => {
    // specs/006 §4: a 0% success rate rendered from an absence reads as a
    // catastrophe. This is why the seam types the field as nullable.
    getAnalytics.mockResolvedValue(
      summary({ packagesSent: 3, successRate: null, medianHoursToSend: null }),
    );

    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});

describe("AnalyticsBrowser · the range", () => {
  it("writes the range to the URL with replace, not push", async () => {
    getAnalytics.mockResolvedValue(summary());
    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    await userEvent.selectOptions(
      screen.getByLabelText("Period"),
      "7d",
    );

    // `replace`, so trying three periods does not cost three Back presses.
    expect(replace).toHaveBeenCalledWith("/analytics?range=7d", {
      scroll: false,
    });
  });

  it("drops the parameter for the default range rather than writing ?range=30d", async () => {
    searchParams.current = new URLSearchParams("range=7d");
    getAnalytics.mockResolvedValue(summary({ range: "7d" }));

    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    await userEvent.selectOptions(screen.getByLabelText("Period"), "30d");
    expect(replace).toHaveBeenCalledWith("/analytics", { scroll: false });
  });

  it("restores the range from a cold load", async () => {
    searchParams.current = new URLSearchParams("range=90d");
    getAnalytics.mockResolvedValue(summary({ range: "90d" }));

    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    expect(screen.getByLabelText("Period")).toHaveValue("90d");
    expect(getAnalytics).toHaveBeenCalledWith("90d");
  });
});

/**
 * specs/006 §3.4 — aggregates only. This screen renders counts and rates and
 * never a row keyed to a person, and §3.5 keeps the records out of its props so
 * there is nothing to leak in the first place.
 */
describe("AnalyticsBrowser · recipient PII", () => {
  it("receives only counts from the seam, never records", async () => {
    getAnalytics.mockResolvedValue(summary());
    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    const payload = JSON.stringify(await getAnalytics.mock.results[0].value);

    // Not a naive substring sweep: `emailsSent` and `email_pending` are counts
    // and legitimately contain the word. What must never appear is a recipient
    // record or anything shaped like an address.
    expect(payload).not.toContain('"recipient"');
    expect(payload).not.toMatch(/[\w.+-]+@[\w.-]+/);
    expect(payload).not.toMatch(/"(name|company|role)"\s*:/);
  });

  it("makes no request to an external origin", async () => {
    // specs/006 §3.10. The screen most likely to acquire a "just to see how the
    // reporting page is used" snippet is the one that must not have one.
    getAnalytics.mockResolvedValue(summary());
    const { container } = renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    expect(container.querySelectorAll("img, script, iframe")).toHaveLength(0);
    for (const link of container.querySelectorAll("a[href]")) {
      expect(link.getAttribute("href")).not.toMatch(/^https?:/);
    }
  });
});

describe("AnalyticsBrowser · the charts", () => {
  it("gives every chart an accessible name and a table of the same numbers", async () => {
    getAnalytics.mockResolvedValue(summary());
    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    const plots = screen.getAllByRole("img");
    expect(plots).toHaveLength(2);
    expect(plots[0]).toHaveAccessibleName(/Packages sent over time/);
    expect(plots[1]).toHaveAccessibleName(/Where work is sitting/);

    // WAI asks for the same information in text, available to everyone.
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    expect(within(tables[0]).getAllByRole("row")).toHaveLength(4); // header + 3
    expect(within(tables[1]).getAllByRole("row")).toHaveLength(8); // header + 7
  });

  it("keeps the status breakdown visible in a period with no sends", async () => {
    // "Where is work sitting" is a present-tense question, so it survives an
    // empty period — it is the one figure the picker does not move.
    searchParams.current = new URLSearchParams("range=7d");
    getAnalytics.mockResolvedValue(
      summary({ range: "7d", packagesSent: 0, sendsFailed: 0, successRate: null }),
    );

    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Nothing was sent in this period.");

    expect(
      screen.getByRole("img", { name: /Where work is sitting/ }),
    ).toBeInTheDocument();
  });

  it("renders a row for a status nobody is sitting on", async () => {
    getAnalytics.mockResolvedValue(summary());
    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    // A status missing from the chart and a status at zero are different facts.
    const table = screen.getAllByRole("table")[1];
    const row = within(table).getByRole("row", { name: /Drafting email/ });
    expect(within(row).getByText("0")).toBeInTheDocument();
  });

  it("shows a bucket's value on hover", async () => {
    getAnalytics.mockResolvedValue(summary());
    renderWithQuery(<AnalyticsBrowser />);
    await screen.findByText("Packages sent");

    const plot = screen.getByRole("img", { name: /Packages sent over time/ });
    const targets = plot.querySelectorAll('rect[fill="transparent"]');
    expect(targets.length).toBe(3);

    await userEvent.hover(targets[2]);
    await waitFor(() => expect(screen.getByText("4 sent")).toBeInTheDocument());
  });
});
