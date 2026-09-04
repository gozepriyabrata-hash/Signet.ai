import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsSettings } from "@/components/settings/AnalyticsSettings";
import { RecipientsSettings } from "@/components/settings/RecipientsSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { UsageSettings } from "@/components/settings/UsageSettings";
import { VoiceSettings } from "@/components/settings/VoiceSettings";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";
import type { Recipient, Usage, WorkspaceSettings } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSelectedLayoutSegment: () => "recipients",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listPresets: vi.fn(),
    createPreset: vi.fn(),
    updatePreset: vi.fn(),
    archivePreset: vi.fn(),
    restorePreset: vi.fn(),
    setDefaultPreset: vi.fn(),
    listRecipients: vi.fn(),
    saveRecipient: vi.fn(),
    deleteRecipient: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    getUsage: vi.fn(),
    sendPackage: vi.fn(),
  },
}));

const RECIPIENTS: Recipient[] = [
  {
    id: "rcp_1",
    name: "Ada Speke",
    role: "CFO",
    company: "Wexley",
    email: "a.speke@wexley.example",
    businessPriorities: [],
    personalisation: "medium",
  },
  {
    id: "rcp_2",
    name: "Bo Ferrier",
    role: "Trustee",
    company: "Calder",
    email: "b.ferrier@calder.example",
    businessPriorities: [],
    personalisation: "low",
  },
];

const SETTINGS: WorkspaceSettings = {
  tracking: { opens: false, clicks: false, discloseToRecipient: false },
  retention: { reportDays: 365, packageDays: 0, purgeRecipientWithProject: false },
};

const USAGE: Usage = {
  periodStart: "2026-09-01T00:00:00.000Z",
  periodEnd: "2026-09-30T00:00:00.000Z",
  videosGenerated: 186,
  videoQuota: 250,
  emailsSent: 142,
  emailQuota: 500,
  spendMinorUnits: 24_180,
  currency: "GBP",
};

/**
 * No `beforeEach` mock reset — see components/campaigns/CampaignDetail.test.tsx.
 */
afterEach(() => vi.clearAllMocks());

/**
 * A native `<dialog>` stays in the DOM when closed — `components/ui/dialog.tsx`
 * has to keep it mounted so `showModal()` and `close()` have something to act
 * on. So `queryByText` finds a closed dialog's title, and asserting on presence
 * proves nothing either way.
 *
 * Two assertions in this file were originally written that way and passed
 * without the dialog ever opening. These read `.open`, which is the fact.
 */
function dialogNamed(title: string): HTMLDialogElement | null {
  return screen.queryByText(title)?.closest("dialog") ?? null;
}

// ── Recipients: the PII screen ──────────────────────────────────────────────

/**
 * specs/008 §3.6 gives this screen four constraints no preset section has, and
 * §10 named it as the one to watch: if it could not be built without
 * `PresetList`, that was a finding about the shape. It could not, and these are
 * the reasons why.
 */
describe("RecipientsSettings · rule 11", () => {
  it("renders no link at all, so no recipient field can reach an href", async () => {
    vi.mocked(api.listRecipients).mockResolvedValue(RECIPIENTS);
    const { container } = renderWithQuery(<RecipientsSettings />);
    await screen.findByText("Ada Speke");

    // Row actions are buttons. A row target would be a URL, and a URL is one of
    // the three channels rule 11 names.
    expect(container.querySelectorAll("a[href]")).toHaveLength(0);
  });

  it("keeps the filter out of the URL", async () => {
    vi.mocked(api.listRecipients).mockResolvedValue(RECIPIENTS);
    renderWithQuery(<RecipientsSettings />);
    await screen.findByText("Ada Speke");

    const before = window.location.search;
    await userEvent.type(screen.getByLabelText("Filter"), "Speke");

    await waitFor(() =>
      expect(screen.queryByText("Bo Ferrier")).not.toBeInTheDocument(),
    );
    // Filtering worked and the address bar never learned a client's name.
    expect(window.location.search).toBe(before);
    expect(screen.getByText("Ada Speke")).toBeInTheDocument();
  });

  it("offers no bulk export", async () => {
    // specs/005 §3.4 refused a column of addresses because a list is one
    // selection away from leaving the UI; a CSV button is that with a filename.
    vi.mocked(api.listRecipients).mockResolvedValue(RECIPIENTS);
    renderWithQuery(<RecipientsSettings />);
    await screen.findByText("Ada Speke");

    for (const button of screen.getAllByRole("button")) {
      expect(button.textContent ?? "").not.toMatch(/export|download|csv/i);
    }
  });

  it("names the person and what survives before deleting", async () => {
    vi.mocked(api.listRecipients).mockResolvedValue(RECIPIENTS);
    renderWithQuery(<RecipientsSettings />);
    await screen.findByText("Ada Speke");

    const row = screen.getByText("Ada Speke").closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "Delete" }));

    const dialog = dialogNamed("Remove this recipient?")!;
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveTextContent("Ada Speke");
    expect(dialog).toHaveTextContent("a.speke@wexley.example");
    // The reason deleting is safe here, said on the screen rather than only in
    // a spec.
    expect(dialog).toHaveTextContent(/keep their own copy/);
    // And nothing deleted yet.
    expect(api.deleteRecipient).not.toHaveBeenCalled();
  });

  it("deletes only after the dialog is confirmed", async () => {
    vi.mocked(api.listRecipients).mockResolvedValue(RECIPIENTS);
    vi.mocked(api.deleteRecipient).mockResolvedValue(undefined);
    renderWithQuery(<RecipientsSettings />);
    await screen.findByText("Ada Speke");

    const row = screen.getByText("Ada Speke").closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(api.deleteRecipient).toHaveBeenCalledWith("rcp_1"));
  });

  it("shows two different empties", async () => {
    vi.mocked(api.listRecipients).mockResolvedValue([]);
    const { unmount } = renderWithQuery(<RecipientsSettings />);
    expect(await screen.findByText("No saved recipients")).toBeInTheDocument();
    unmount();

    vi.mocked(api.listRecipients).mockResolvedValue(RECIPIENTS);
    renderWithQuery(<RecipientsSettings />);
    await screen.findByText("Ada Speke");
    await userEvent.type(screen.getByLabelText("Filter"), "zzz");

    // Nothing matching needs a way back, not a way forward.
    expect(await screen.findByText("Nobody matches that.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear the filter" }),
    ).toBeInTheDocument();
  });
});

// ── The consent gate ────────────────────────────────────────────────────────

describe("AnalyticsSettings · the consent gate", () => {
  it("renders every tracking option off", async () => {
    vi.mocked(api.getSettings).mockResolvedValue(SETTINGS);
    renderWithQuery(<AnalyticsSettings />);

    const opens = await screen.findByLabelText(/Track email opens/);
    expect(opens).not.toBeChecked();
    expect(screen.getByLabelText(/Track CTA clicks/)).not.toBeChecked();
    expect(screen.getByLabelText(/Tell recipients/)).not.toBeChecked();
  });

  it("says on the screen that open tracking does not mean what it says", async () => {
    // specs/006 §2.2 lives in a spec; a user turning the switch on needs it
    // beside the switch. A toggle that promises a number the product cannot
    // compute is worse than no toggle.
    vi.mocked(api.getSettings).mockResolvedValue(SETTINGS);
    renderWithQuery(<AnalyticsSettings />);
    await screen.findByLabelText(/Track email opens/);

    expect(screen.getByText(/Apple Mail loads that pixel on receipt/)).toBeInTheDocument();
  });

  it("patches only its own half of the document", async () => {
    // Two screens edit one record; neither may overwrite the other's half.
    vi.mocked(api.getSettings).mockResolvedValue(SETTINGS);
    vi.mocked(api.updateSettings).mockResolvedValue({
      ...SETTINGS,
      tracking: { ...SETTINGS.tracking, clicks: true },
    });

    renderWithQuery(<AnalyticsSettings />);
    await userEvent.click(await screen.findByLabelText(/Track CTA clicks/));

    await waitFor(() =>
      expect(api.updateSettings).toHaveBeenCalledWith({
        tracking: { opens: false, clicks: true, discloseToRecipient: false },
      }),
    );
    // No retention key in the patch at all.
    expect(vi.mocked(api.updateSettings).mock.calls[0][0]).not.toHaveProperty(
      "retention",
    );
  });
});

describe("SecuritySettings", () => {
  it("explains why there is no CSP switch rather than leaving a gap", async () => {
    vi.mocked(api.getSettings).mockResolvedValue(SETTINGS);
    renderWithQuery(<SecuritySettings />);

    expect(
      await screen.findByText(/Content Security Policy/),
    ).toBeInTheDocument();
    expect(screen.getByText(/the look of a control without one/)).toBeInTheDocument();
    // And it is prose, not a control.
    expect(screen.queryByLabelText(/Content Security Policy/)).not.toBeInTheDocument();
  });

  it("defaults sent packages to being kept indefinitely", async () => {
    // A record of a message sent to a client is the last thing that should
    // expire by accident.
    vi.mocked(api.getSettings).mockResolvedValue(SETTINGS);
    renderWithQuery(<SecuritySettings />);

    const field = await screen.findByLabelText(/Keep sent packages for/);
    expect(field).toHaveValue(0);
    expect(screen.getByText(/kept indefinitely/)).toBeInTheDocument();
  });
});

describe("UsageSettings · read-only by design", () => {
  it("offers no control that changes anything", async () => {
    // specs/008 §3.5: a control that changed a quota would be a billing action,
    // and this product has no billing. The absence is the design.
    vi.mocked(api.getUsage).mockResolvedValue(USAGE);
    renderWithQuery(<UsageSettings />);
    await screen.findByText("Videos generated");

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("renders meters with real bounds, and money from minor units", async () => {
    vi.mocked(api.getUsage).mockResolvedValue(USAGE);
    renderWithQuery(<UsageSettings />);

    const meter = await screen.findByRole("meter", { name: "Videos generated" });
    expect(meter).toHaveAttribute("aria-valuenow", "186");
    expect(meter).toHaveAttribute("aria-valuemax", "250");
    // 24180 minor units, never touched by floating-point arithmetic.
    expect(screen.getByText("£241.80")).toBeInTheDocument();
  });
});

describe("VoiceSettings · cloning asks first", () => {
  it("does not clone until the person is named", async () => {
    // specs/008 §3.10: the one upload where the person providing the sample and
    // the person clicking may not be the same.
    vi.mocked(api.listPresets).mockResolvedValue([]);
    const { container } = renderWithQuery(<VoiceSettings />);
    await screen.findByText("Clone a voice");

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const sample = new File(["x"], "sample.wav", { type: "audio/wav" });
    Object.defineProperty(input, "files", { value: [sample], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await waitFor(() => expect(dialogNamed("Whose voice is this?")?.open).toBe(true));
    // Naming the person IS the confirmation.
    expect(screen.getByRole("button", { name: "Clone this voice" })).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/Name of the person/),
      "Ada Speke",
    );
    expect(screen.getByRole("button", { name: "Clone this voice" })).toBeEnabled();
  });

  it("rejects a non-audio file before any dialog opens", async () => {
    vi.mocked(api.listPresets).mockResolvedValue([]);
    const { container } = renderWithQuery(<VoiceSettings />);
    await screen.findByText("Clone a voice");

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const wrong = new File(["x"], "notes.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [wrong], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not an audio file/);
    // The dialog element exists but was never opened.
    expect(dialogNamed("Whose voice is this?")?.open).toBe(false);
  });
});
