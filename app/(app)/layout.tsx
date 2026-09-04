import type { Metadata } from "next";

import { brandFont } from "@/app/fonts";
import { Providers } from "@/app/(app)/providers";
import { UI_STORAGE_KEY } from "@/stores/ui-store";
import { SITE_NAME, SITE_URL } from "@/lib/site";

import "@/app/globals.css";

/**
 * Root layout #2 — the workspace shell.
 *
 * Owns only what a root layout must: <html>, <body>, the shared font and the
 * providers. The navbar and sidebar live one level down in `(shell)`, so the
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

/**
 * Runs before first paint, so the sidebar renders at its saved width on the
 * very first frame instead of rendering expanded and snapping shut. This is the
 * same trick next-themes performs for the theme, applied to the one other
 * preference visible before React runs.
 *
 * Reads the exact key and shape the persist middleware writes — see the
 * COUPLING WARNING in stores/ui-store.ts. Wrapped in try/catch because
 * localStorage throws outright in some privacy modes.
 */
const SIDEBAR_PREPAINT = `
try {
  var raw = localStorage.getItem(${JSON.stringify(UI_STORAGE_KEY)});
  if (raw && JSON.parse(raw).state.sidebarCollapsed) {
    document.documentElement.dataset.sidebar = 'collapsed';
  }
} catch (e) {}
`;

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
      // `group/shell` lets descendants react to the data-sidebar attribute the
      // pre-paint script stamps here (see components/shell/Sidebar.tsx).
      className={`${brandFont.variable} group/shell`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_PREPAINT }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
