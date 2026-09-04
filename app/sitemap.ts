import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * One public URL. Pricing, Security and How-it-works are in-page anchors, not
 * routes (specs/001 §6), so they are not separate entries.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
