import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignDetail } from "@/components/campaigns/CampaignDetail";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { CommunicationPackage, Recipient } from "@/types";

vi.mock("@/lib/api", () => ({
  api: {
    getPackage: vi.fn(),
    listPackages: vi.fn(),
    sendPackage: vi.fn(),
    buildPackage: vi.fn(),
  },
}));

const getPackage = vi.mocked(api.getPackage);

const RECIPIENT: Recipient = {
  id: "rcp_1",
  name: "Priya Raghunathan",
  role: "Head of Reward",
  company: "Northgate",
  email: "p.raghunathan@northgate.example",
  businessPriorities: ["cost control"],
  personalisation: "high",
};

const PACKAGE: CommunicationPackage = {
  id: "pkg_4c81de",
  projectId: "prj_c14e6b",
  recipient: RECIPIENT,
  email: {
    id: "eml_1",
    projectId: "prj_c14e6b",
    subject: "Your benefits renewal, in three minutes",
    greeting: "Hello Priya,",
    body: "A short walkthrough of the three numbers that moved.",
    ctaId: "cta_1",
    signatureId: "sig_1",
    editedByUser: true,
  },
  video: {
    id: "vid_1",
    projectId: "prj_c14e6b",
    jobId: "job_1",
    avatarId: "avt_1",
    voiceId: "voi_1",
    format: "landscape",
    captions: true,
    durationSec: 168,
  },
  reportAttachment: {
    id: "rpt_1",
    fileName: "benefits-renewal.pdf",
    fileType: "pdf",
    sizeBytes: 1_248_000,
    uploadedAt: "2026-08-22T16:12:00.000Z",
    status: "parsed",
  },
  approvedAt: "2026-08-22T16:12:00.000Z",
  approvedBy: "Alex Warrender",
  sentAt: "2026-08-22T16:20:00.000Z",
  status: "sent",
};

/** What the mock adapter raises for an id that is not in the store. */
class NotFound extends Error {
  readonly code = "NOT_FOUND";
  readonly retryable = false;
}

/**
 * No `beforeEach` mock reset here, deliberately.
 *
 * Clearing or resetting the `api` mock from a `beforeEach` makes a rejection it
 * later produces surface as an UNCAUGHT ERROR rather than as the query's error
 * state, and the test fails with the rejection reason even though every
 * assertion in it passed. Reproduced down to a bare `useQuery` over a mocked
 * module: `beforeEach(() => apiMock.mockClear())` fails, a no-op `beforeEach`
 * passes, and `afterEach(vi.clearAllMocks)` alone passes while still giving each
 * test a clean call count.
 *
 * The reset was never load-bearing: every test below sets its own
 * implementation, so a stale one from the previous test cannot survive.
 */
afterEach(() => vi.clearAllMocks());

/** Rule 9, with two distinct failures rather than one. */
describe("CampaignDetail · the four states", () => {
  it("announces the lookup while it is pending", async () => {
    const pending = deferred<CommunicationPackage>();
    getPackage.mockReturnValue(pending.promise);

    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading campaign");

    pending.resolve(PACKAGE);
    await screen.findByRole("heading", { level: 1 });
  });

  it("renders the record on success", async () => {
    getPackage.mockResolvedValue(PACKAGE);
    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Your benefits renewal, in three minutes",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("benefits-renewal.pdf")).toBeInTheDocument();
  });

  it("offers a way back, not a Retry, when the package does not exist", async () => {
    getPackage.mockRejectedValue(new NotFound("No package with id pkg_gone."));

    renderWithQuery(<CampaignDetail packageId="pkg_gone" />);

    expect(
      await screen.findByText("That campaign no longer exists"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to campaigns" }),
    ).toHaveAttribute("href", "/campaigns");
    expect(screen.queryByRole("button", { name: /Retry/ })).not.toBeInTheDocument();
  });

  it("does not retry a package that is not there", async () => {
    getPackage.mockRejectedValue(new NotFound("No package with id pkg_gone."));

    renderWithQuery(<CampaignDetail packageId="pkg_gone" />);
    await screen.findByText("That campaign no longer exists");

    // A 404 does not become a 200 on the second attempt.
    expect(getPackage).toHaveBeenCalledTimes(1);
  });

  it("recovers in place when the lookup fails", async () => {
    // Rejected every time, not once: a transient failure is retried once before
    // the error state is reached, so a single rejection never gets there.
    getPackage.mockRejectedValue(new Error("Network unreachable."));

    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);

    // The single retry runs on TanStack's default ~1s backoff, so the error
    // state legitimately arrives later than findBy's 1s default allows.
    const alert = await screen.findByRole("alert", {}, { timeout: 5_000 });
    expect(alert).toHaveTextContent("Could not load this campaign.");

    getPackage.mockResolvedValue(PACKAGE);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

/**
 * specs/005 §3.4 — the detail page is where the full recipient record belongs,
 * because verifying what left the building is the page's whole job.
 */
describe("CampaignDetail · recipient PII", () => {
  it("shows the email address the package was sent to", async () => {
    getPackage.mockResolvedValue(PACKAGE);
    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);

    expect(await screen.findByText(RECIPIENT.email)).toBeInTheDocument();
    expect(screen.getByText(RECIPIENT.name)).toBeInTheDocument();
  });

  it("puts nothing recipient-derived in any href", async () => {
    getPackage.mockResolvedValue(PACKAGE);
    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);
    await screen.findByText(RECIPIENT.email);

    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      for (const value of [
        RECIPIENT.name,
        RECIPIENT.email,
        RECIPIENT.company,
        RECIPIENT.role,
      ]) {
        expect(href).not.toContain(value);
      }
    }
  });
});

describe("CampaignDetail · a failed send", () => {
  it("sends the user to Review rather than offering a resend", async () => {
    getPackage.mockResolvedValue({ ...PACKAGE, status: "failed" });
    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);

    expect(await screen.findByText("Send failed")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open in Review" }),
    ).toHaveAttribute("href", "/projects/prj_c14e6b/review");
  });
});

describe("CampaignDetail · rule 2", () => {
  it("offers no control that sends, and sends nothing on mount", async () => {
    getPackage.mockResolvedValue(PACKAGE);
    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);
    await screen.findByRole("heading", { level: 1 });

    await waitFor(() => expect(getPackage).toHaveBeenCalled());
    expect(api.sendPackage).not.toHaveBeenCalled();
    expect(api.buildPackage).not.toHaveBeenCalled();

    // No Resend, by design (specs/005 §3.5). If this assertion ever fails, the
    // question is not "fix the test" — it is whether rule 2 still holds.
    for (const control of [
      ...screen.queryAllByRole("button"),
      ...screen.queryAllByRole("link"),
    ]) {
      expect(control.textContent ?? "").not.toMatch(/resend|send again/i);
    }
  });

  it("shows the approval trail, which is what makes rule 2 a record", async () => {
    getPackage.mockResolvedValue(PACKAGE);
    renderWithQuery(<CampaignDetail packageId="pkg_4c81de" />);

    expect(await screen.findByText("Alex Warrender")).toBeInTheDocument();
  });
});
