import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignsTable } from "@/components/campaigns/CampaignsTable";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { CommunicationPackage, Recipient } from "@/types";

vi.mock("@/lib/api", () => ({
  api: {
    listPackages: vi.fn(),
    getPackage: vi.fn(),
    sendPackage: vi.fn(),
    buildPackage: vi.fn(),
  },
}));

const listPackages = vi.mocked(api.listPackages);

const RECIPIENT: Recipient = {
  id: "rcp_1",
  name: "Priya Raghunathan",
  role: "Head of Reward",
  company: "Northgate",
  email: "p.raghunathan@northgate.example",
  businessPriorities: ["cost control"],
  personalisation: "high",
};

/**
 * The subject deliberately contains no part of the recipient's name, so the PII
 * assertions below cannot pass on a coincidental substring — the same trap
 * ProjectsTable.test.tsx guards against.
 */
function pkg(
  overrides: Partial<CommunicationPackage> = {},
): CommunicationPackage {
  return {
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
    ...overrides,
  };
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

/** Rule 9: loading, empty, error, success. */
describe("CampaignsTable · the four states", () => {
  it("shows skeleton rows while pending", async () => {
    const pending = deferred<CommunicationPackage[]>();
    listPackages.mockReturnValue(pending.promise);

    renderWithQuery(<CampaignsTable />);

    const loading = screen.getByRole("table", { name: "Loading campaigns" });
    expect(within(loading).getAllByRole("row")).toHaveLength(6); // header + 5

    // Settle it, or RTL's cleanup waits on a promise that never resolves.
    pending.resolve([]);
    await screen.findByText("Nothing sent yet");
  });

  it("shows one empty state, with no create action", async () => {
    listPackages.mockResolvedValue([]);
    renderWithQuery(<CampaignsTable />);

    expect(await screen.findByText("Nothing sent yet")).toBeInTheDocument();
    // Unlike the projects list, there is no way forward from here: arriving is
    // a matter of finishing a workflow, and "create a project" answers a
    // question this screen did not ask.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows an in-place Retry when the query fails", async () => {
    listPackages.mockRejectedValue(new Error("Could not reach the server."));

    renderWithQuery(<CampaignsTable />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load your campaigns.");
    expect(alert).toHaveTextContent("Could not reach the server.");

    listPackages.mockResolvedValue([pkg()]);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByText("Your benefits renewal, in three minutes"),
    ).toBeInTheDocument();
  });

  it("renders a table with column headers on success", async () => {
    listPackages.mockResolvedValue([pkg()]);
    renderWithQuery(<CampaignsTable />);

    const table = await screen.findByRole("table", {
      name: "Sent packages, most recently sent first",
    });
    for (const column of ["Subject", "Recipient", "Sent"]) {
      expect(
        within(table).getByRole("columnheader", { name: column }),
      ).toBeInTheDocument();
    }
  });
});

/**
 * specs/005 §3.4 — this is the first screen in the app allowed to render a
 * recipient's name, so the boundary has to be pinned rather than assumed.
 */
describe("CampaignsTable · recipient PII", () => {
  it("shows the recipient's name and company", async () => {
    listPackages.mockResolvedValue([pkg()]);
    renderWithQuery(<CampaignsTable />);

    expect(await screen.findByText(RECIPIENT.name)).toBeInTheDocument();
    expect(screen.getByText(RECIPIENT.company)).toBeInTheDocument();
  });

  it("never shows the recipient's email address", async () => {
    listPackages.mockResolvedValue([pkg()]);
    renderWithQuery(<CampaignsTable />);
    await screen.findByText(RECIPIENT.name);

    // A column of client addresses is a mailing list one selection away from
    // leaving the UI. The detail page shows the address; the list must not.
    expect(document.body.textContent).not.toContain(RECIPIENT.email);
  });

  it("puts nothing recipient-derived in any href", async () => {
    listPackages.mockResolvedValue([pkg()]);
    renderWithQuery(<CampaignsTable />);
    await screen.findByText(RECIPIENT.name);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "");

    expect(hrefs).toContain("/campaigns/pkg_4c81de");
    for (const href of hrefs) {
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

  it("does not read the recipient's name aloud on every row", async () => {
    listPackages.mockResolvedValue([pkg()]);
    renderWithQuery(<CampaignsTable />);
    await screen.findByText(RECIPIENT.name);

    const label = screen.getByRole("link").getAttribute("aria-label") ?? "";
    expect(label).toContain("Your benefits renewal");
    expect(label).not.toContain(RECIPIENT.name);
  });
});

describe("CampaignsTable · a failed send", () => {
  it("links to the project's Review step, not to the campaign detail", async () => {
    // Rule 5 wants the failure recoverable in place; rule 2 puts the only Retry
    // that may re-send on Review. So a failed row leaves this screen entirely.
    listPackages.mockResolvedValue([pkg({ status: "failed" })]);
    renderWithQuery(<CampaignsTable />);

    const link = await screen.findByRole("link", {
      name: /^Open in Review/,
    });
    expect(link).toHaveAttribute("href", "/projects/prj_c14e6b/review");
  });
});

describe("CampaignsTable · rule 2", () => {
  it("never sends anything", async () => {
    listPackages.mockResolvedValue([pkg(), pkg({ id: "pkg_2", status: "failed" })]);
    renderWithQuery(<CampaignsTable />);
    await screen.findByRole("table", {
      name: "Sent packages, most recently sent first",
    });

    // No send on mount, no send as a side effect of rendering a history.
    // eslint.config.mjs stops the import statically; this stops the behaviour.
    await waitFor(() => expect(listPackages).toHaveBeenCalled());
    expect(api.sendPackage).not.toHaveBeenCalled();
    expect(api.buildPackage).not.toHaveBeenCalled();
  });
});
