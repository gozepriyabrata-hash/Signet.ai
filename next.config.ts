import type { NextConfig } from "next";

/**
 * Deliberately close to empty.
 *
 * `cacheComponents` stays OFF — see specs/002-landing-page.md §3.1 and §5.
 * Enabling it is an application-wide change of rendering model, and the
 * landing page fetches nothing, so it would cache nothing. When the workspace
 * adopts Cache Components it gets its own spec.
 *
 * Turbopack is the default bundler in Next.js 16; there is no flag to pass.
 */
const nextConfig: NextConfig = {
  /**
   * `/settings` → `/settings/avatar`, in config rather than in a `page.tsx`
   * that calls `redirect()`.
   *
   * Next checks redirects "before the filesystem which includes pages", so this
   * never reaches React — and, the reason that matters here, it is not a file
   * anyone can later add a side effect to. specs/004 §3.8 refused
   * `/projects/new` on exactly that ground.
   *
   * `permanent: false` DELIBERATELY. A 308 "instructs clients/search engines to
   * cache the redirect forever", and which section Settings opens on is a
   * product guess — Avatar is first because it is first in a list, not because
   * anyone decided it is what a user most often wants. A 308 would burn that
   * guess into every user's browser, and the people who visit most would be the
   * last to see it change (specs/008 §3.2).
   */
  async redirects() {
    return [
      {
        source: "/settings",
        destination: "/settings/avatar",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
