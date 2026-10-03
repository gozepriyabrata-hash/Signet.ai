"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Project } from "@/types";

/** A project nobody has started on: a fresh workspace to reopen. */
const isUntouched = (project: Project) =>
  project.status === "draft" && !project.report && !project.recipient;

/**
 * `/dashboard` is no longer a page of its own (by direct instruction): sign-in,
 * sign-up and the landing page's CTAs all arrive here, and this sends them
 * straight into a workspace — the newest untouched project if there is one,
 * otherwise a new one. Reusing an untouched project is what stops every visit
 * from creating another.
 */
export function WorkspaceEntry() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const started = useRef(false);

  const projects = useQuery({
    queryKey: qk.projects(),
    queryFn: () => api.listProjects(),
  });

  const create = useMutation({
    mutationFn: () => api.createProject(),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.replace(`/projects/${project.id}`);
    },
  });
  const { mutate } = create;

  useEffect(() => {
    // Once only — StrictMode runs effects twice, and two creates would be two
    // projects.
    if (!projects.data || started.current) return;
    started.current = true;
    const untouched = projects.data.find(isUntouched);
    if (untouched) router.replace(`/projects/${untouched.id}`);
    else mutate();
  }, [projects.data, router, mutate]);

  const error = projects.error ?? create.error;
  if (error) {
    return (
      <div
        role="alert"
        className="mx-auto mt-24 flex max-w-md flex-col items-center gap-4 px-6 text-center"
      >
        <p className="text-base font-normal text-foreground">
          Could not open your workspace
        </p>
        <p className="text-sm font-light text-body-foreground">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            if (projects.error) void projects.refetch();
            else mutate();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10 lg:px-8">
      <p role="status" className="sr-only">
        Opening your workspace
      </p>
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
