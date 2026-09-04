import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Durable UI preferences.
 *
 * Server state does not belong here — this store never fetches (CLAUDE.md
 * rule 3). It holds only preferences that should outlive a page load.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * COUPLING WARNING
 * `UI_STORAGE_KEY` and the persisted JSON shape are read by an inline script in
 * app/(app)/layout.tsx, before React runs, so the sidebar renders at the right
 * width on the first frame. If you rename the key, change `partialize`, or bump
 * `version`, update that script too — nothing will throw if you forget, the
 * sidebar will just start snapping shut on every load again.
 * ────────────────────────────────────────────────────────────────────────────
 */
export const UI_STORAGE_KEY = "signet.ui.v1";

export type PreviewDevice = "desktop" | "mobile";

interface UiState {
  sidebarCollapsed: boolean;
  previewDevice: PreviewDevice;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPreviewDevice: (device: PreviewDevice) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      previewDevice: "desktop",
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setPreviewDevice: (device) => set({ previewDevice: device }),
    }),
    {
      name: UI_STORAGE_KEY,
      version: 0,
      // The middleware must not rehydrate on import: doing so during module
      // evaluation races React and produces a server/client mismatch. The
      // sidebar calls rehydrate() in an effect instead.
      skipHydration: true,
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        previewDevice: state.previewDevice,
      }),
    },
  ),
);
