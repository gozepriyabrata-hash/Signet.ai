import { beforeEach, describe, expect, it } from "vitest";

import { UI_STORAGE_KEY, useUiStore } from "@/stores/ui-store";

beforeEach(() => {
  window.localStorage.clear();
  useUiStore.setState({ sidebarCollapsed: false, previewDevice: "desktop" });
});

describe("ui-store", () => {
  it("toggles the sidebar", () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  /**
   * specs/003 §3.5. Rehydrating during module evaluation races React and
   * produces a server/client mismatch, so the middleware must stay quiet until
   * something calls rehydrate() explicitly.
   */
  it("does not read storage until rehydrate() is called", async () => {
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({ state: { sidebarCollapsed: true }, version: 0 }),
    );

    expect(useUiStore.getState().sidebarCollapsed).toBe(false);

    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  /**
   * The pre-paint script in app/(app)/layout.tsx parses this exact shape by
   * hand. If persist ever changes its envelope, this test fails here rather
   * than the sidebar silently starting to flash again in production.
   */
  it("persists under the key and shape the pre-paint script expects", () => {
    useUiStore.getState().setSidebarCollapsed(true);

    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string);
    expect(parsed.state.sidebarCollapsed).toBe(true);
  });

  it("persists only preferences, never server state", () => {
    useUiStore.getState().setSidebarCollapsed(true);

    const parsed = JSON.parse(
      window.localStorage.getItem(UI_STORAGE_KEY) as string,
    );
    expect(Object.keys(parsed.state).sort()).toEqual([
      "previewDevice",
      "sidebarCollapsed",
    ]);
  });
});
