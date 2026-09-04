"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

/**
 * The theme switch.
 *
 * `useTheme` returns undefined on the server, because localStorage is not
 * readable there. next-themes' own guidance is to render nothing
 * theme-dependent until mounted; the button reserves its final size from the
 * first frame so the navbar does not shift when the label appears.
 *
 * "Mounted" is derived with useSyncExternalStore — a server snapshot of false
 * and a client snapshot of true — rather than the usual
 * `useEffect(() => setMounted(true))`. That pattern is a setState inside an
 * effect, which triggers a cascading render and which the React Compiler lint
 * rules reject outright.
 */
const subscribeToNothing = () => () => {};

function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const mounted = useHasMounted();
  const { resolvedTheme, setTheme } = useTheme();

  const isLight = resolvedTheme === "light";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={
        mounted ? `Switch to ${isLight ? "dark" : "light"} theme` : "Switch theme"
      }
      className="min-w-20"
    >
      {/* Empty until mounted, but the button keeps its width. */}
      <span aria-hidden="true">{mounted ? (isLight ? "Dark" : "Light") : ""}</span>
    </Button>
  );
}
