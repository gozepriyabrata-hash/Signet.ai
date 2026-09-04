import { beforeEach, describe, expect, it } from "vitest";

import { isNotFoundError } from "@/lib/api/errors";
import { mockClient } from "@/lib/api/mock";
import { realClient } from "@/lib/api/real";
import { SEED_PROJECTS } from "@/lib/api/mock/fixtures";
import { readProjects, resetProjects, writeProjects } from "@/lib/api/mock/store";
import type { CommunicationPackage, Recipient } from "@/types";

const RECIPIENT: Recipient = {
  id: "rcp_1",
  name: "Jane Fairweather",
  role: "Chief Investment Officer",
  company: "Meridian Capital",
  email: "jane.fairweather@meridian.example",
  businessPriorities: ["capital preservation"],
  personalisation: "high",
};

/** A package that has not finished sending. It must never reach the history. */
const MID_FLIGHT_PACKAGE: CommunicationPackage = {
  id: "pkg_midflight",
  projectId: "prj_midflight",
  recipient: RECIPIENT,
  email: {
    id: "eml_x",
    projectId: "prj_midflight",
    subject: "Half-built",
    greeting: "Hello,",
    body: "…",
    ctaId: "cta_1",
    signatureId: "sig_1",
    editedByUser: false,
  },
  video: {
    id: "vid_x",
    projectId: "prj_midflight",
    jobId: "job_x",
    avatarId: "avt_1",
    voiceId: "voi_1",
    format: "landscape",
    captions: false,
  },
  reportAttachment: {
    id: "rpt_x",
    fileName: "half-built.pdf",
    fileType: "pdf",
    sizeBytes: 1000,
    uploadedAt: "2026-08-01T00:00:00.000Z",
    status: "parsed",
  },
  status: "ready",
};

beforeEach(() => {
  window.sessionStorage.clear();
  resetProjects();
});

describe("mock adapter", () => {
  it("seeds deterministically, so demos and screenshots are stable", async () => {
    const first = await mockClient.listProjects();
    resetProjects();
    const second = await mockClient.listProjects();

    expect(first.map((p) => p.id)).toEqual(second.map((p) => p.id));
    expect(first).toHaveLength(SEED_PROJECTS.length);
  });

  it("filters by status", async () => {
    const sent = await mockClient.listProjects({ status: "sent" });
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.every((project) => project.status === "sent")).toBe(true);
  });

  it("returns most-recently-updated first", async () => {
    const projects = await mockClient.listProjects();
    const updatedAt = projects.map((project) => project.updatedAt);
    expect(updatedAt).toEqual([...updatedAt].sort().reverse());
  });

  it("persists a created project across reads", async () => {
    const created = await mockClient.createProject();
    const projects = await mockClient.listProjects();

    expect(projects[0]?.id).toBe(created.id);
    expect(created.status).toBe("draft");
  });

  it("derives active-project stats from the store, not a fixed number", async () => {
    const before = await mockClient.getStats();
    await mockClient.createProject();
    const after = await mockClient.getStats();

    expect(after.activeProjects).toBe(before.activeProjects + 1);
  });

  it("searches project names, case-insensitively", async () => {
    const hits = await mockClient.listProjects({ query: "MERIDIAN" });
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.every((project) => project.name.toLowerCase().includes("meridian")),
    ).toBe(true);
  });

  it("combines a status filter with a search", async () => {
    const all = await mockClient.listProjects({ query: "report" });
    const sent = await mockClient.listProjects({
      status: "sent",
      query: "report",
    });

    expect(sent.length).toBeLessThanOrEqual(all.length);
    expect(sent.every((project) => project.status === "sent")).toBe(true);
  });

  /**
   * specs/004 §4 keeps the search box out of the URL because project names
   * already carry client identity. Searching the recipient record as well would
   * put that identity behind a text box and undo the argument.
   */
  it("never matches a recipient field", async () => {
    const created = await mockClient.createProject();
    const withRecipient = { ...created, recipient: RECIPIENT };
    writeProjects([withRecipient]);

    await expect(
      mockClient.listProjects({ query: "Fairweather" }),
    ).resolves.toHaveLength(0);
    await expect(
      mockClient.listProjects({ query: "meridian.example" }),
    ).resolves.toHaveLength(0);
  });

  it("has no unimplemented methods left, while the real adapter has only those", () => {
    // This assertion used to point at the mock, which was partly built. As of
    // specs/007 the mock implements the whole interface, so the "better a loud
    // failure than a plausible fake" discipline now lives on the real adapter —
    // which is where an accidental call would otherwise silently do nothing.
    expect(() => realClient.getJob("job_1")).toThrow(/has no backend yet/);
    expect(() => realClient.sendPackage("pkg_1")).toThrow(/has no backend yet/);
  });

  it("reports a missing project as not found", async () => {
    await expect(mockClient.getProject("prj_nope")).rejects.toThrow(
      /No project with id/,
    );
  });
});

/**
 * specs/005 — the campaigns history. The adapter, not the screen, decides what
 * counts as history, so these are the tests that pin §3.6.
 */
describe("mock adapter · packages", () => {
  it("returns only packages in a terminal send state", async () => {
    const packages = await mockClient.listPackages();

    expect(packages.length).toBeGreaterThan(0);
    // assembling / ready / approved / sending are mid-workflow: they belong to
    // a project, and a history that shows work in progress is a second
    // projects list.
    expect(
      packages.every((pkg) => pkg.status === "sent" || pkg.status === "failed"),
    ).toBe(true);
  });

  it("includes a failed send, because that is what a user comes here to find", async () => {
    const packages = await mockClient.listPackages();
    expect(packages.some((pkg) => pkg.status === "failed")).toBe(true);
  });

  it("excludes a package that has not reached a terminal state", async () => {
    const [first, ...rest] = readProjects();
    writeProjects([
      { ...first, package: { ...MID_FLIGHT_PACKAGE, status: "sending" } },
      ...rest.map((project) => ({ ...project, package: undefined })),
    ]);

    await expect(mockClient.listPackages()).resolves.toHaveLength(0);
  });

  it("returns most-recently-sent first", async () => {
    const sentAt = (await mockClient.listPackages()).map((pkg) => pkg.sentAt);
    expect(sentAt).toEqual([...sentAt].sort().reverse());
  });

  it("finds a package by its own id, not its project's", async () => {
    const [first] = await mockClient.listPackages();
    const found = await mockClient.getPackage(first.id);

    expect(found.id).toBe(first.id);
    // The project id must NOT resolve — specs/005 §3.2 keys this route on the
    // package, and a lookup that accepted both would hide the difference.
    await expect(mockClient.getPackage(first.projectId)).rejects.toThrow(
      /No package with id/,
    );
  });

  it("raises a missing package as a NOT_FOUND the UI can recognise", async () => {
    // The screen offers a way back for this and a Retry for anything else, so
    // the code is load-bearing rather than cosmetic.
    await expect(mockClient.getPackage("pkg_nope")).rejects.toSatisfy(
      isNotFoundError,
    );
  });
});

/**
 * specs/006 — the analytics aggregation. The adapter decides what a bucket is
 * and what a null means, so these are the tests that pin §3.5.
 */
describe("mock adapter · analytics", () => {
  it("emits every bucket in the window, including the empty ones", async () => {
    // A gap in a time series is data. Skipping empty buckets is how a line
    // chart lies about its x-axis without anyone noticing.
    const summary = await mockClient.getAnalytics("30d");
    const starts = summary.sentOverTime.map((point) =>
      new Date(point.bucketStart).getTime(),
    );

    expect(starts.length).toBeGreaterThan(1);
    const step = starts[1] - starts[0];
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i] - starts[i - 1]).toBe(step);
    }
    expect(summary.sentOverTime.some((point) => point.count === 0)).toBe(true);
  });

  it("buckets by day over short ranges and by week over long ones", async () => {
    // Daily buckets over 90 days would be ninety points on a 720px axis.
    await expect(mockClient.getAnalytics("7d")).resolves.toMatchObject({
      bucket: "day",
    });
    await expect(mockClient.getAnalytics("all")).resolves.toMatchObject({
      bucket: "week",
    });
  });

  it("does not explode the bucket count over all time", async () => {
    const summary = await mockClient.getAnalytics("all");
    expect(summary.sentOverTime.length).toBeLessThan(60);
  });

  it("reports every ProjectStatus, including the ones at zero", async () => {
    const summary = await mockClient.getAnalytics("30d");
    expect(summary.projectsByStatus).toHaveLength(7);
    expect(summary.projectsByStatus.map((row) => row.status)).toEqual([
      "draft",
      "analysing",
      "video_pending",
      "email_pending",
      "ready_for_review",
      "sent",
      "failed",
    ]);
  });

  it("counts project status across everything, not through the date range", async () => {
    // "Where is work sitting" is a present-tense question; filtering it through
    // the range would make the chart answer something nobody asked.
    const week = await mockClient.getAnalytics("7d");
    const all = await mockClient.getAnalytics("all");
    expect(week.projectsByStatus).toEqual(all.projectsByStatus);
  });

  it("narrows the sends as the range narrows", async () => {
    const week = await mockClient.getAnalytics("7d");
    const all = await mockClient.getAnalytics("all");

    expect(all.packagesSent).toBeGreaterThan(0);
    expect(week.packagesSent).toBeLessThanOrEqual(all.packagesSent);
  });

  it("returns null, not zero, when a period holds no sends", async () => {
    // specs/006 §4: a 0% success rate rendered from an absence reads as a
    // catastrophe, and "no data" must stay distinguishable from "all failed".
    writeProjects(
      readProjects().map((project) => ({ ...project, package: undefined })),
    );

    const summary = await mockClient.getAnalytics("all");
    expect(summary.packagesSent).toBe(0);
    expect(summary.successRate).toBeNull();
    expect(summary.medianHoursToSend).toBeNull();
  });

  it("computes a success rate from sends and failures", async () => {
    const summary = await mockClient.getAnalytics("all");
    expect(summary.successRate).not.toBeNull();
    expect(summary.successRate).toBeGreaterThan(0);
    expect(summary.successRate).toBeLessThanOrEqual(1);
    expect(summary.sendsFailed).toBeGreaterThan(0);
  });

  it("derives a median time-to-send from varied inputs, not one literal", async () => {
    const summary = await mockClient.getAnalytics("all");
    expect(summary.medianHoursToSend).not.toBeNull();
    expect(summary.medianHoursToSend).toBeGreaterThan(0);
  });

  it("carries no recipient record into the summary", async () => {
    // The whole reason aggregation happens on this side of the seam.
    const payload = JSON.stringify(await mockClient.getAnalytics("all"));
    expect(payload).not.toContain('"recipient"');
    expect(payload).not.toMatch(/[\w.+-]+@[\w.-]+/);
  });
});
