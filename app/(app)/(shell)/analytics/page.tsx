import type { Metadata } from "next";
import { Suspense } from "react";

import { AnalyticsBrowser } from "@/components/analytics/AnalyticsBrowser";
import { RangePickerFallback } from "@/components/analytics/RangePicker";

export const metadata: Metadata = { title: "Analytics" };

/**
 * The reporting surface.
 *
 * It answers "what did we make, how much went out, and where does the work get
 * stuck" — not "how did it land". There is no open rate and no click-through
 * rate here, and specs/006 §3.2 is the argument: a pixel-derived open rate is
 * unmeasurable for a large share of recipients, and measuring one means
 * instrumenting a named client, which is `/settings/analytics`'s decision.
 *
 * A Server Component with no runtime API, so the route prerenders and the
 * browsing UI hydrates into it.
 *
 * The <Suspense> boundary below is LOAD-BEARING, not decoration.
 * `AnalyticsBrowser` calls `useSearchParams`, and on a prerendered route that
 * client-renders the tree up to the nearest boundary. Without one, this page
 * builds fine under `next dev` — where routes render on demand — and then fails
 * `next build` with the missing-Suspense error. Verified by removing it.
 *
 * No `dynamic = "error"` guard, for specs/003 §3.4's reason: this route is
 * expected to become dynamic when authentication lands.
 */
export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 lg:px-8">
      <div>
        <h1 className="text-4xl font-light tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          What you have made, how much of it went out, and where the work is
          sitting.
        </p>
      </div>

      <Suspense fallback={<RangePickerFallback />}>
        <AnalyticsBrowser />
      </Suspense>
    </div>
  );
}
