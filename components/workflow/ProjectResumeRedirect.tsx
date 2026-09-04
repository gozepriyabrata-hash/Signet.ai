"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { isNotFoundError } from "@/lib/api/errors";
import { qk } from "@/lib/query-keys";
import { resumeHref } from "@/lib/workflow";

/**
 * Resolves `/projects/[id]` to the step the project is actually on.
 *
 * ── Why this resolves in the browser and not on the server ──────────────────
 * specs/001 describes this route as "redirect only", which reads like a Server
 * Component calling `redirect()`. It cannot be: the mock adapter's store lives
 * in `sessionStorage`, so the server sees the seed fixtures and nothing else
 * (specs/003 §3.3). A server redirect would send every project created in this
 * browser session — every project reached from NewProjectButton — to a 404,
 * because the server has never heard of it.
 *
 * So the resolve happens where the data is. `redirect()` is still Next's own,
 * called during render rather than from an effect: Next documents that use in
 * Client Components, and calling it in render keeps "this route never renders
 * the workflow" a structural property instead of a convention an effect could
 * quietly break. Outside Server Actions it defaults to `replace`, so Back
 * returns to wherever the user came from rather than bouncing through here
 * again.
 *
 * Revisit when `lib/api/real/` becomes real: with a backend the whole component
 * collapses into a Server Component that awaits `getProject` and redirects.
 */
export function ProjectResumeRedirect({ projectId }: { projectId: string }) {
  const {
    data: project,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: qk.project(projectId),
    queryFn: () => api.getProject(projectId),
    // A missing project stays missing; retrying it just delays the empty state
    // by one round of the mock's latency.
    retry: (failureCount, cause) =>
      !isNotFoundError(cause) && failureCount < 1,
  });

  if (project) redirect(resumeHref(project));

  if (error) {
    return isNotFoundError(error) ? (
      <ResolveShell>
        <EmptyState
          title="That project no longer exists"
          description="It may have been removed, or the link may be out of date. Everything still in flight is on the projects list."
          action={
            <Button asChild variant="outline">
              <Link href="/projects">Back to projects</Link>
            </Button>
          }
        />
      </ResolveShell>
    ) : (
      <ResolveShell>
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xs border border-border bg-surface px-6 py-16 text-center"
        >
          <p className="text-base font-normal text-foreground">
            Could not open this project
          </p>
          <p className="max-w-[48ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {error instanceof Error
              ? error.message
              : "Something went wrong while looking it up."}
          </p>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </ResolveShell>
    );
  }

  return (
    <ResolveShell>
      {/* Announced, because for a slow lookup this is the only thing on screen
          and a sighted user has the skeleton to look at (CLAUDE.md rule 10). */}
      <p role="status" className="sr-only">
        Opening project
      </p>
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    </ResolveShell>
  );
}

/** The focus group has no chrome of its own yet, so the resolver centres its
 *  own content rather than inheriting a container that does not exist. */
function ResolveShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">{children}</main>;
}
