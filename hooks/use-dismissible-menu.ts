"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes an open hand-rolled menu on an outside pointerdown or Escape, and
 * returns focus to the trigger on Escape. No popover/dropdown-menu primitive
 * is vendored into `components/ui/` and no Radix package beyond
 * `react-slot` is a dependency (see `specs/015-dashboard-redesign.md` §12),
 * so every menu in this app — `DashboardHeader`'s "+" menu, `ProfileMenu`'s
 * account menu — shares this one small hook instead of each re-implementing
 * the same two `document` listeners.
 *
 * Listeners attach only while `open` is true, and `triggerRef`/`menuRef` are
 * `useRef` objects, so their identity is stable across renders — including
 * them in the dependency array does not cause extra re-subscriptions beyond
 * what `open` and `onClose` already would.
 */
export function useDismissibleMenu(
  open: boolean,
  onClose: () => void,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;

    const closeIfOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose, triggerRef, menuRef]);
}
