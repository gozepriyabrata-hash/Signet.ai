import type { Metadata } from "next";
import { Suspense } from "react";

import { ProjectsBrowser } from "@/components/projects/ProjectsBrowser";
import { ProjectsToolbarFallback } from "@/components/projects/ProjectsToolbar";
import { NewProjectButton } from "@/components/shared/NewProjectButton";

export const metadata: Metadata = { title: "Projects" };

/**
 * The projects list.
 *
 * A Server Component with no runtime API, so the route prerenders; the header
 * ships in the initial HTML and the browsing UI hydrates into it. As on the
 * dashboard there is no `dynamic = "error"` guard — this route is expected to
 * become dynamic when authentication lands, and a guard removed one spec later
 * teaches the wrong lesson (specs/003 §3.4).
 *
 * The <Suspense> boundary below is LOAD-BEARING, not decoration.
 * `ProjectsBrowser` calls `useSearchParams`, and on a prerendered route that
 * client-renders the tree up to the nearest boundary. Without one, this page
 * builds fine under `next dev` — where routes render on demand — and then fails
 * `next build` with the missing-Suspense error. Verified by removing it.
 */
export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Projects
          </h1>
          <p className="mt-3 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            Every communication package, and where each one has got to.
          </p>
        </div>

        <NewProjectButton />
      </div>

      <Suspense fallback={<ProjectsToolbarFallback />}>
        <ProjectsBrowser />
      </Suspense>
    </div>
  );
}
