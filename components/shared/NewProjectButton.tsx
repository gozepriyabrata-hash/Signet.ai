"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/**
 * Creates a project and goes to it.
 *
 * There is no `/projects/new` route, and deliberately so. A page whose only job
 * is to run a side effect and redirect is a URL that means "do something" — it
 * misbehaves on refresh, on Back, and from a bookmark. Two links to such a page
 * shipped with specs/003 and both 404ed; this component replaces them.
 *
 * It creates a project ONLY from a click. Nothing here runs on mount.
 */
export function NewProjectButton({
  label = "+ Create New",
  variant = "default",
}: {
  label?: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending, isError, error, reset } = useMutation({
    mutationFn: () => api.createProject(),
    onSuccess: (project) => {
      // The new project belongs in the lists that are already on screen.
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: qk.stats() });

      // The resume route, not a step. `/projects/{id}` resolves the project's
      // status to the step it belongs on and replaces itself with it, so this
      // stays correct whatever a new project's first step turns out to be
      // (lib/workflow.ts). Hard-coding `/report` here would be a second copy of
      // that rule, in the one place that could not see it change.
      router.push(`/projects/${project.id}`);
    },
  });

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p className="text-sm font-light text-body-foreground">
          {error instanceof Error
            ? error.message
            : "Could not create the project."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            reset();
            mutate();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <Button variant={variant} onClick={() => mutate()} disabled={isPending}>
      {isPending ? "Creating…" : label}
    </Button>
  );
}
