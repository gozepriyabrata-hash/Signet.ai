import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useJobPolling } from "@/hooks/use-job-polling";
import { api } from "@/lib/api";
import type { Job } from "@/types";

vi.mock("@/lib/api", () => ({ api: { getJob: vi.fn() } }));

const getJob = vi.mocked(api.getJob);

function job(overrides: Partial<Job<string>> = {}): Job<string> {
  return {
    id: "job_1",
    kind: "video",
    status: "running",
    progress: 40,
    stage: "Rendering avatar",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** A short interval keeps the polling tests honest without fake timers, which
 *  fight TanStack's internal scheduling. */
function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * No `beforeEach` mock reset — see the note at the top of
 * components/campaigns/CampaignDetail.test.tsx. Clearing the api mock from a
 * `beforeEach` makes a rejection it later produces surface as an uncaught error
 * rather than as the query's error state.
 */
afterEach(() => vi.clearAllMocks());

describe("useJobPolling · stopping", () => {
  /**
   * The most important test in this file.
   *
   * `docs/data-model.md`: "Never poll a succeeded or failed job — that is a bug,
   * not a safety net." A job that keeps polling after it finishes is invisible
   * in the UI and costs a request every two seconds for as long as the tab is
   * open, so nothing but a test will ever catch it.
   */
  it("stops polling once a job succeeds", async () => {
    getJob.mockResolvedValue(job({ status: "succeeded", progress: 100 }));

    renderHook(() => useJobPolling<string>("job_1", "prj_1"), { wrapper });

    await waitFor(() => expect(getJob).toHaveBeenCalled());
    const callsAtTerminal = getJob.mock.calls.length;

    // Well past two poll intervals. If refetchInterval did not return false,
    // this window would add several calls.
    await new Promise((resolve) => setTimeout(resolve, 4_500));
    expect(getJob.mock.calls.length).toBe(callsAtTerminal);
  }, 10_000);

  it("stops polling once a job fails", async () => {
    getJob.mockResolvedValue(
      job({
        status: "failed",
        error: { code: "MOCK_VIDEO_FAILED", message: "Nope.", retryable: true },
      }),
    );

    renderHook(() => useJobPolling<string>("job_1", "prj_1"), { wrapper });

    await waitFor(() => expect(getJob).toHaveBeenCalled());
    const callsAtTerminal = getJob.mock.calls.length;

    await new Promise((resolve) => setTimeout(resolve, 4_500));
    expect(getJob.mock.calls.length).toBe(callsAtTerminal);
  }, 10_000);

  it("keeps polling while a job is still running", async () => {
    getJob.mockResolvedValue(job({ status: "running" }));

    renderHook(() => useJobPolling<string>("job_1", "prj_1"), { wrapper });

    await waitFor(() => expect(getJob).toHaveBeenCalled());
    // Two poll intervals is 4s; expect at least one more call than the first.
    await waitFor(() => expect(getJob.mock.calls.length).toBeGreaterThan(1), {
      timeout: 6_000,
    });
  }, 10_000);
});

describe("useJobPolling · what a failure is", () => {
  it("treats a failed job as a successful read, not an error state", async () => {
    // Rule 5: a failed generation is recoverable in place, so it must not
    // surface as a query error — the card renders the failure itself.
    getJob.mockResolvedValue(
      job({
        status: "failed",
        error: { code: "MOCK_VIDEO_FAILED", message: "Nope.", retryable: true },
      }),
    );

    const { result } = renderHook(
      () => useJobPolling<string>("job_1", "prj_1"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.isError).toBe(false);
    expect(result.current.data?.status).toBe("failed");
  });

  it("does not run at all without a job id", () => {
    renderHook(() => useJobPolling<string>(undefined, "prj_1"), { wrapper });
    expect(getJob).not.toHaveBeenCalled();
  });
});
