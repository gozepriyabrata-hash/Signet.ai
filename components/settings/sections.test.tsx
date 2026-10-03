import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VoiceSettings } from "@/components/settings/VoiceSettings";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/render-with-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSelectedLayoutSegment: () => "voice",
}));

vi.mock("@/lib/api", () => ({
  api: {
    listPresets: vi.fn(),
    createPreset: vi.fn(),
    updatePreset: vi.fn(),
    archivePreset: vi.fn(),
    restorePreset: vi.fn(),
    setDefaultPreset: vi.fn(),
  },
}));

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
