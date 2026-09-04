"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { getQueryClient } from "@/lib/query-client";

/**
 * The single client boundary wrapping the workspace.
 *
 * The marketing shell gets none of this. It is a separate root layout with no
 * server state and no theme switch, so the landing page keeps the "exactly one
 * client component" property specs/002 established. Providers are a workspace
 * cost, not an application cost.
 *
 * `attribute="class"` with `defaultTheme="dark"` matches app/globals.css: the
 * dark palette is `:root` and light is opted into by a `.light` class, so the
 * `light` class next-themes writes lands exactly where the stylesheet expects
 * it. The `dark` class it writes in dark mode matches no rule and is inert.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
