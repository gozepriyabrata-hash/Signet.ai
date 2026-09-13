"use client";

import { useSyncExternalStore } from "react";

/**
 * True only once the client has mounted. `next-themes`' `theme`/`resolvedTheme`
 * (and any other localStorage-derived value) is unreadable during SSR, so
 * anything that renders differently before and after hydration must gate on
 * this rather than guess a value the server never had.
 *
 * `useSyncExternalStore` — server snapshot `false`, client snapshot `true` —
 * rather than `useEffect(() => setMounted(true))`: that pattern is a setState
 * inside an effect, which the React Compiler lint rules reject outright.
 */
const subscribeToNothing = () => () => {};

export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}
