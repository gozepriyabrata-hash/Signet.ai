import type { Metadata } from "next";

import { brandFont } from "@/app/fonts";
import { Providers } from "@/app/(app)/providers";
import { SITE_NAME, SITE_URL } from "@/lib/site";

import "@/app/globals.css";

/**
 * Root layout #2 — the workspace shell.
 *
 * Owns only what a root layout must: <html>, <body>, the shared font and the
 * providers. The navbar lives one level down in `(shell)`, so the
 * `(focus)` group beside it can render workflow routes with no sidebar at all
 * (specs/003-dashboard.md §3.1).
 *
 * It must NOT import anything from components/marketing/ — see the
 * no-restricted-imports boundary in eslint.config.mjs.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Workspace · ${SITE_NAME}`,
    template: `%s · ${SITE_NAME}`,
  },
  // The workspace is not for search engines; it is behind a human.
  robots: { index: false, follow: false },
};

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning is required by next-themes, which mutates this
    // element before React hydrates. It applies one level deep only, so it does
    // not mask mismatches anywhere else in the tree.
    <html
      lang="en"
      className={brandFont.variable}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
