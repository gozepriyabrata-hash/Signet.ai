import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvatarSettings } from "@/components/settings/AvatarSettings";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { api } from "@/lib/api";
import { deferred } from "@/test/deferred";
import { renderWithQuery } from "@/test/render-with-query";
import type { Preset } from "@/types";

const segment = vi.hoisted(() => ({ current: "avatar" as string | null }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSelectedLayoutSegment: () => segment.current,
}));

vi.mock("@/lib/api", () => ({
  api: {
    listPresets: vi.fn(),
    createPreset: vi.fn(),
    updatePreset: vi.fn(),
    archivePreset: vi.fn(),
    restorePreset: vi.fn(),
    setDefaultPreset: vi.fn(),
    sendPackage: vi.fn(),
  },
}));

const listPresets = vi.mocked(api.listPresets);

function preset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: "avt_1",
    kind: "avatar",
    name: "Priya — Executive",
    description: "Neutral studio background, seated.",
    isDefault: true,
    config: {},
    ...overrides,
  };
}

/**
 * No `beforeEach` mock reset — see components/campaigns/CampaignDetail.test.tsx.
 * Clearing the api mock from a `beforeEach` makes a rejection it later produces
 * surface as an uncaught error rather than as the query's error state.
 */
afterEach(() => {
  vi.clearAllMocks();
  segment.current = "avatar";
});

// ── The nav ─────────────────────────────────────────────────────────────────

describe("SettingsNav", () => {
  it("marks the active section with aria-current=page, not step", () => {
    // specs/008 §2.6: the stepper is a position in a process; this is a set of
    // pages, which is what MDN defines `page` for.
    segment.current = "voice";
    renderWithQuery(<SettingsNav />);

    const current = document.querySelector('[aria-current]');
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveTextContent("Voice");
  });

  it("links to every section, so no nav item can 404", () => {
    renderWithQuery(<SettingsNav />);
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    expect(within(nav).getAllByRole("link")).toHaveLength(9);
  });
});

// ── The repeated shape ──────────────────────────────────────────────────────

/** Rule 9, on the screen where the empty state is the common case rather than
 *  the exceptional one. */
describe("PresetList · the four states", () => {
  it("shows skeletons while pending", async () => {
    const pending = deferred<Preset[]>();
    listPresets.mockReturnValue(pending.promise);

    renderWithQuery(<AvatarSettings />);
    expect(screen.getByLabelText("Loading Avatars")).toBeInTheDocument();

    pending.resolve([]);
    await screen.findByText("Nothing here yet");
  });

  it("offers a create action from the empty state", async () => {
    // A section with nothing in it needs a way forward, not an apology.
    listPresets.mockResolvedValue([]);
    renderWithQuery(<AvatarSettings />);

    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "New avatar" }).length,
    ).toBeGreaterThan(0);
  });

  it("recovers in place when the list fails", async () => {
    listPresets.mockRejectedValue(new Error("Could not reach the server."));

    renderWithQuery(<AvatarSettings />);
    const alert = await screen.findByRole("alert", {}, { timeout: 5_000 });
    expect(alert).toHaveTextContent("Could not load these presets.");

    listPresets.mockResolvedValue([preset()]);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Priya — Executive")).toBeInTheDocument();
  });

  it("renders live presets with a default marker", async () => {
    listPresets.mockResolvedValue([preset()]);
    renderWithQuery(<AvatarSettings />);

    expect(await screen.findByText("Priya — Executive")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });
});

describe("PresetList · archive, never delete", () => {
  it("offers Archive and never Delete", async () => {
    // specs/008 §3.3. `docs/screens.md` says "create/edit/delete"; that line is
    // overridden, and the absence of a Delete control is the decision.
    listPresets.mockResolvedValue([preset()]);
    renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it("separates archived presets and offers restore, saying they still resolve", async () => {
    listPresets.mockResolvedValue([
      preset(),
      preset({
        id: "avt_2",
        name: "Retired avatar",
        isDefault: false,
        archivedAt: "2026-08-01T00:00:00.000Z",
      }),
    ]);

    renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    // Archived rows are not in the main list.
    expect(screen.getByText("1 archived")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(
      screen.getByText(/still resolves for packages already sent/),
    ).toBeInTheDocument();
  });

  it("asks the adapter for archived rows, unlike the workflow", async () => {
    // The settings screen is the ONE caller that passes includeArchived — the
    // workflow's dropdowns pass nothing and stay correct without knowing
    // archiving exists.
    listPresets.mockResolvedValue([preset()]);
    renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    expect(listPresets).toHaveBeenCalledWith("avatar", { includeArchived: true });
  });

  it("archives on click", async () => {
    listPresets.mockResolvedValue([preset()]);
    vi.mocked(api.archivePreset).mockResolvedValue(preset({ archivedAt: "x" }));

    renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(api.archivePreset).toHaveBeenCalledWith("avt_1"));
  });
});

describe("PresetList · creating", () => {
  it("creates through the dialog, not inline", async () => {
    listPresets.mockResolvedValue([preset()]);
    vi.mocked(api.createPreset).mockResolvedValue(preset({ id: "avt_new" }));

    renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    await userEvent.click(screen.getByRole("button", { name: "New avatar" }));
    await userEvent.type(screen.getByLabelText("Name"), "Sam — Warm");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(api.createPreset).toHaveBeenCalledWith("avatar", {
        name: "Sam — Warm",
        description: undefined,
      }),
    );
  });

  it("will not save a preset with no name", async () => {
    listPresets.mockResolvedValue([preset()]);
    renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    await userEvent.click(screen.getByRole("button", { name: "New avatar" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});

/** Rule 12, read as the general instruction rather than a closed list of two
 *  file types (specs/008 §3.10). */
describe("AvatarSettings · upload validation", () => {
  it("refuses a non-image inline, beside the control", async () => {
    listPresets.mockResolvedValue([preset()]);
    const { container } = renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    // fireEvent-style assignment, because userEvent.upload honours `accept` and
    // would never let the rejection path run — a real user can get past it.
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not an image/);
  });

  it("refuses an oversized image", async () => {
    listPresets.mockResolvedValue([preset()]);
    const { container } = renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    const big = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 12 * 1024 * 1024 });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/limit is 8MB/);
  });
});

describe("settings · rule 2", () => {
  it("sends nothing, from any settings screen", async () => {
    listPresets.mockResolvedValue([preset()]);
    renderWithQuery(<AvatarSettings />);
    await screen.findByText("Priya — Executive");

    expect(api.sendPackage).not.toHaveBeenCalled();
  });
});
