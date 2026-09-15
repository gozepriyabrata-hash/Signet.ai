import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * The landing page is the only thing here meant for crawlers. The workspace
 * sits behind a human and is marked noindex in its own root layout.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/projects", "/settings"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
