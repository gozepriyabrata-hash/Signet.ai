"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

/**
 * The sidebar collapse control, and the one place the persisted store is
 * rehydrated.
 *
 * `ui-store` sets `skipHydration: true`, so nothing reads localStorage during
 * module evaluation — that would race React and produce a mismatch. Rehydration
 * happens here, in an effect, after the first paint the inline script in
 * app/(app)/layout.tsx has already made correct.
 *
 * The store owns the state from that point on and keeps the `data-sidebar`
 * attribute in sync, so the CSS variable and React never disagree.
 */
export function SidebarToggle() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) root.dataset.sidebar = "collapsed";
    else delete root.dataset.sidebar;
  }, [collapsed]);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      aria-expanded={!collapsed}
      aria-controls="workspace-sidebar"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
    </Button>
  );
}
