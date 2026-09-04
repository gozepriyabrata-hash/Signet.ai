import { Inter } from "next/font/google";

/**
 * The one font instance in the application.
 *
 * Both root layouts import this module rather than calling the loader
 * themselves. `next/font` hosts one instance per call, and preloads a font
 * only on the routes its caller wraps — with two root layouts (specs/001) and
 * no top-level app/layout.tsx, calling it twice would host the same face twice.
 *
 * Saans is the brand face, but it is a commercial typeface and is not
 * redistributable (docs/design-system.md §2), so Inter ships. When a licence
 * exists, swap to next/font/local HERE and nowhere else: the CSS variable name
 * stays `--font-brand`, so app/globals.css does not change.
 */
export const brandFont = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brand",
});
