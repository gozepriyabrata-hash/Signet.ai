import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockClient } from "@/lib/api/mock";
import { resetJobs } from "@/lib/api/mock/jobs";
import { readProjects, resetProjects } from "@/lib/api/mock/store";

beforeEach(() => {
  window.sessionStorage.clear();
  resetProjects();
  resetJobs();
});

afterEach(() => vi.useRealTimers());

/** The first project with a parsed report and a recipient, so the later job
 *  kinds have something coherent to attach their results to. */
function seedProjectId(): string {
  return readProjects()[0].id;
}

/**
 * The job engine derives everything from elapsed time rather than running
 * timers, which is what lets these tests move a twelve-second video render
 * forward instantly instead of waiting for it.
 *
 * Only `Date` is faked, deliberately. Faking `setTimeout` as well would
 * deadlock the adapter's own `delay()` — every method awaits it, and a faked
 * timer that nothing advances never resolves. Faking the clock alone gives the
 * engine a controllable "now" while `delay` keeps using real time.
 */
function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms);
}

describe("mock jobs · progression", () => {
  it("starts queued, runs, then succeeds — never skipping a state", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const projectId = seedProjectId();

    const started = await mockClient.generateEmail(projectId);
    expect(started.status).toBe("queued");
    expect(started.progress).toBe(0);

    advance(1_500);
    const midway = await mockClient.getJob(started.id);
    expect(midway.status).toBe("running");
    expect(midway.progress).toBeGreaterThan(0);

    advance(10_000);
    const done = await mockClient.getJob(started.id);
    expect(done.status).toBe("succeeded");
    expect(done.progress).toBe(100);
  });

  it("never reports 100% before the job is terminal", async () => {
    // A bar that sits full while the card still says "running" is the fastest
    // way for a progress UI to lose a user's trust.
    vi.useFakeTimers({ toFake: ["Date"] });
    const projectId = seedProjectId();
    const started = await mockClient.generateVideo(projectId, {
      avatarId: "avt_default",
      voiceId: "voi_default",
      scriptStyleId: "sty_executive",
      format: "landscape",
      captions: true,
    });

    // Video runs for 12s; step through it and assert the bar never fills while
    // the card would still be saying "running".
    for (let elapsed = 0; elapsed < 11_500; elapsed += 1_500) {
      advance(1_500);
      const job = await mockClient.getJob(started.id);
      if (job.status === "running") expect(job.progress).toBeLessThan(100);
    }
  });

  it("advances monotonically", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const started = await mockClient.generateEmail(seedProjectId());

    let previous = -1;
    for (let i = 0; i < 5; i += 1) {
      advance(800);
      const job = await mockClient.getJob(started.id);
      expect(job.progress).toBeGreaterThanOrEqual(previous);
      previous = job.progress;
    }
  });

  it("reports a named stage rather than a blank spinner", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const started = await mockClient.generateVideo(seedProjectId(), {
      avatarId: "avt_default",
      voiceId: "voi_default",
      scriptStyleId: "sty_executive",
      format: "landscape",
      captions: true,
    });

    advance(1_000);
    const job = await mockClient.getJob(started.id);
    // CLAUDE.md rule 5 — the stages come from docs/screens.md.
    expect(["Synthesising voice", "Rendering avatar", "Compositing"]).toContain(
      job.stage,
    );
  });
});

describe("mock jobs · results reach the project", () => {
  it("writes a succeeded job's result onto the project", async () => {
    // This is what makes the stepper advance: it derives completion from the
    // project, not from the job.
    vi.useFakeTimers({ toFake: ["Date"] });
    const projectId = seedProjectId();
    const started = await mockClient.generateEmail(projectId);

    advance(10_000);
    await mockClient.getJob(started.id);

    const project = readProjects().find((p) => p.id === projectId);
    expect(project?.email).toBeDefined();
    expect(project?.status).toBe("ready_for_review");
  });

  it("carries no external URL on a generated video", async () => {
    // Nothing in this app may make a third-party request (specs/005 §3.10,
    // specs/006 §3.10), and a playback URL is the one field a component would
    // put straight into a src.
    vi.useFakeTimers({ toFake: ["Date"] });
    const projectId = seedProjectId();
    const started = await mockClient.generateVideo(projectId, {
      avatarId: "avt_default",
      voiceId: "voi_default",
      scriptStyleId: "sty_executive",
      format: "landscape",
      captions: true,
    });

    advance(20_000);
    const done = await mockClient.getJob(started.id);
    const url = (done.result as { playbackUrl?: string } | undefined)?.playbackUrl;

    expect(url).toBeDefined();
    expect(url).not.toMatch(/^https?:/);
    expect(url?.startsWith("/")).toBe(true);
  });
});

describe("mock jobs · cancellation", () => {
  it("resolves a cancelled job to failed with a recognisable code", async () => {
    // specs/007 §3.7: cancelling does not add an eighth JobStatus. The code is
    // what tells "you stopped this" apart from "this broke".
    vi.useFakeTimers({ toFake: ["Date"] });
    const started = await mockClient.generateVideo(seedProjectId(), {
      avatarId: "avt_default",
      voiceId: "voi_default",
      scriptStyleId: "sty_executive",
      format: "landscape",
      captions: true,
    });

    advance(2_000);
    const cancelled = await mockClient.cancelJob(started.id);

    expect(cancelled.status).toBe("failed");
    expect(cancelled.error?.code).toBe("CANCELLED");
    expect(cancelled.error?.retryable).toBe(false);
  });

  it("leaves an already-finished job alone", async () => {
    // Clicking Cancel as a job completes must not rewrite a success into a
    // failure — that is the app arguing with what it just showed the user.
    vi.useFakeTimers({ toFake: ["Date"] });
    const started = await mockClient.generateEmail(seedProjectId());

    advance(10_000);
    await mockClient.getJob(started.id);

    const afterCancel = await mockClient.cancelJob(started.id);
    expect(afterCancel.status).toBe("succeeded");
  });
});

describe("mock jobs · failure", () => {
  it("reports a missing job rather than inventing one", async () => {
    await expect(mockClient.getJob("job_nope")).rejects.toThrow(/No job with id/);
  });
});

describe("mock adapter · presets and packages", () => {
  it("lists presets of one kind, defaults first", async () => {
    const avatars = await mockClient.listPresets("avatar");
    expect(avatars.length).toBeGreaterThan(0);
    expect(avatars.every((preset) => preset.kind === "avatar")).toBe(true);
    expect(avatars[0].isDefault).toBe(true);
  });

  it("refuses to assemble a package from an incomplete project", async () => {
    // A half-assembled package on the one screen that can send is exactly the
    // plausible fiction this adapter refuses to produce.
    const draft = readProjects().find((project) => project.status === "draft");
    await expect(
      mockClient.buildPackage(draft?.id ?? "prj_nope"),
    ).rejects.toThrow();
  });
});
