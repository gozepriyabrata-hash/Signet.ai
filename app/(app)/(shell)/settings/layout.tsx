import type { Metadata } from "next";

import { SettingsNav } from "@/components/settings/SettingsNav";

export const metadata: Metadata = {
  title: { default: "Settings", template: "%s · Settings" },
};

/**
 * The Settings shell: sub-nav left, section right.
 *
 * A Server Component. Only the nav is client, because only the nav needs to
 * know which section is active (`useSelectedLayoutSegment`) — the same split
 * the app shell already uses for its sidebar toggle.
 *
 * `/settings` itself is not a route. It is a redirect in `next.config.ts`,
 * which Next resolves before the filesystem, so there is no page here to
 * accidentally give a side effect to (specs/008 §3.2).
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <h1 className="text-4xl font-light tracking-tight text-foreground">
        Settings
      </h1>
      <p className="mt-3 max-w-[68ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
        Everything the workflow chooses between is defined here. A workflow step
        picks a preset; it never creates one.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
