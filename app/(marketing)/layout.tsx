import type { Metadata } from "next";

import { brandFont } from "@/app/fonts";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

import "@/app/globals.css";

/**
 * Root layout #1 — the public shell.
 *
 * There is no top-level app/layout.tsx (specs/001). This layout and
 * app/(app)/layout.tsx are both root layouts, so each declares its own <html>
 * and <body> and sets its own metadataBase. Navigating between them is a
 * documented full page load, which is what we want at this boundary: no
 * marketing CSS or client JS reaches the workspace.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — review every AI package before it sends`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — review every AI package before it sends`,
    description: SITE_TAGLINE,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — review every AI package before it sends`,
    description: SITE_TAGLINE,
  },
};

export default function MarketingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `marketing-shell` scopes smooth in-page anchoring to this shell only.
    // No data-scroll-behavior="smooth": there is one route here, so there is
    // no client-side transition for Next.js to suppress.
    //
    // suppressHydrationWarning: this layout has no theme script and no client
    // component that touches <html> (see app/(app)/providers.tsx — the
    // ThemeProvider is workspace-only), so a "dark" class appearing only on
    // the client is a third party — a browser dark-mode extension — mutating
    // the element before React hydrates, not a real mismatch. One level deep
    // only; it does not mask mismatches elsewhere in the tree.
    <html
      lang="en"
      className={`${brandFont.variable} marketing-shell`}
      suppressHydrationWarning
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
