"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { StepShell } from "@/components/workflow/StepShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/hooks/use-project";
import { api } from "@/lib/api";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { PersonalisationLevel, Project } from "@/types";

/**
 * Step 2 — the personalisation context. The input that makes the whole product
 * worth using.
 *
 * ── This is the screen that collects client PII ─────────────────────────────
 * CLAUDE.md rule 11 is at its sharpest here, because this is where the data
 * enters the product. Three consequences, all structural rather than advisory:
 *
 *  - **Nothing on this screen touches the URL.** No draft autosave to a query
 *    string, no `?name=`, no shareable "prefilled" link. The step's address is
 *    `/projects/[id]/recipient` and it stays that way.
 *  - **Nothing here is logged.** No console.log of form state, not even in a
 *    catch — an error report carrying a client's email is the leak rule 11
 *    names first, so the error handler below keeps the message and drops the
 *    payload.
 *  - The draft lives in the workflow store, which is browser-local, and is
 *    committed by `analyzeReport`. It is never sent anywhere else.
 *
 * ── Six fields, and the form says which matter ──────────────────────────────
 * Name, role and company are required. Industry and priorities are not, and the
 * form says why rather than silently accepting a worse result: they are what
 * the analysis personalises against, and a package built without them is
 * generic. Segments, tags, CRM sync and bulk import are Settings' business
 * (rule 1).
 *
 * ── The form is a child, seeded from props ──────────────────────────────────
 * `RecipientStep` waits for the project, then mounts `RecipientForm` with the
 * initial values already known. The alternative — one component that mounts
 * empty and `reset()`s in an effect when the data lands — is exactly the shape
 * that produces "avoid calling setState directly within an effect", and the
 * linter is right about it. Seeding from props needs no effect at all.
 */

const schema = z.object({
  name: z.string().trim().min(1, "Who is this going to?"),
  role: z.string().trim().min(1, "Their role shapes how the script is written."),
  company: z.string().trim().min(1, "The company this report is about."),
  industry: z.string().trim().optional(),
  businessPriorities: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Personalisation is deliberately NOT in the schema; it is local state.
 *
 * It is a closed three-value enum with a default, so it cannot be invalid and
 * there is nothing for zod to check. Keeping it in the form would mean reading
 * it back with `watch()` to render the selected card — a reactive subscription
 * inside a component, which the React Compiler flags as unmemoizable.
 */
const LEVELS: ReadonlyArray<{
  value: PersonalisationLevel;
  label: string;
  detail: string;
}> = [
  { value: "low", label: "Low", detail: "Name and company only." },
  { value: "medium", label: "Medium", detail: "Adds their role and industry." },
  {
    value: "high",
    label: "High",
    detail: "Adds their stated priorities throughout.",
  },
];

export function RecipientStep({ projectId }: { projectId: string }) {
  const { data: project, isPending, isError, error, refetch } =
    useProject(projectId);

  if (isPending) {
    return (
      <StepShell title="Who is this for?">
        <div
          aria-busy="true"
          aria-label="Loading recipient"
          className="h-64 rounded-xs border border-border bg-surface"
        />
      </StepShell>
    );
  }

  if (isError) {
    return (
      <StepShell title="Who is this for?">
        <div
          role="alert"
          className="rounded-xs border border-danger bg-surface p-6"
        >
          <p className="text-base font-normal text-foreground">
            Could not load this project.
          </p>
          <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      </StepShell>
    );
  }

  return <RecipientForm project={project} />;
}

function RecipientForm({ project }: { project: Project }) {
  const router = useRouter();
  const projectId = project.id;
  const patchDraft = useWorkflowStore((state) => state.patchDraft);
  const setActiveJob = useWorkflowStore((state) => state.setActiveJob);
  const draft = useWorkflowStore((state) => state.drafts[projectId]?.recipient);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const committed = project.recipient;

  // The draft wins over the committed value: someone who edited and walked away
  // should find their edit, not the saved version. Read once, at mount.
  const [level, setLevel] = useState<PersonalisationLevel>(
    () => draft?.personalisation ?? committed?.personalisation ?? "medium",
  );

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: draft?.name ?? committed?.name ?? "",
      role: draft?.role ?? committed?.role ?? "",
      company: draft?.company ?? committed?.company ?? "",
      industry: draft?.industry ?? committed?.industry ?? "",
      businessPriorities:
        draft?.businessPriorities?.join(", ") ??
        committed?.businessPriorities.join(", ") ??
        "",
    },
  });

  const priorities = (value: string | undefined) =>
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const analyse = useMutation({
    mutationFn: (values: FormValues) =>
      api.analyzeReport(projectId, {
        id: committed?.id ?? `rcp_${projectId.slice(4)}`,
        name: values.name,
        role: values.role,
        company: values.company,
        email: committed?.email ?? "",
        industry: values.industry || undefined,
        businessPriorities: priorities(values.businessPriorities),
        personalisation: level,
      }),
    onSuccess: (started) => {
      // Hand the job to the Analysis step through the store. Without this the
      // id dies with this component, nothing polls the job, and the user
      // watches a bar that never moves.
      setActiveJob(projectId, "analysis", started.id);
      router.push(`/projects/${projectId}/analysis`);
    },
    onError: (cause) =>
      setSubmitError(
        cause instanceof Error ? cause.message : "Could not start the analysis.",
      ),
  });

  const persist = () => {
    // `getValues`, not `watch`: a one-shot read inside an event handler.
    const values = getValues();
    patchDraft(projectId, {
      recipient: {
        name: values.name,
        role: values.role,
        company: values.company,
        industry: values.industry,
        businessPriorities: priorities(values.businessPriorities),
        personalisation: level,
      },
    });
  };

  const field = (
    key: "name" | "role" | "company" | "industry",
    label: string,
    optional = false,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={key}>
        {label}
        {optional ? (
          <span className="text-muted-foreground"> · optional</span>
        ) : null}
      </Label>
      <Input
        id={key}
        {...register(key, { onBlur: persist })}
        aria-invalid={Boolean(errors[key])}
      />
      {errors[key] ? (
        <p className="text-sm font-light text-danger">{errors[key]?.message}</p>
      ) : null}
    </div>
  );

  return (
    <StepShell
      title="Who is this for?"
      description="This is what the analysis and the script are personalised against. It stays in this workspace."
      onBack={() => router.push(`/projects/${projectId}/report`)}
      onNext={handleSubmit((values) => analyse.mutate(values))}
      nextDisabled={!isValid}
      nextLabel="Analyse the report"
      isSubmitting={analyse.isPending}
    >
      <form
        className="space-y-8"
        onSubmit={handleSubmit((values) => analyse.mutate(values))}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {field("name", "Name")}
          {field("role", "Role")}
          {field("company", "Company")}
          {field("industry", "Industry", true)}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessPriorities">
            Business priorities
            <span className="text-muted-foreground"> · optional</span>
          </Label>
          <p
            id="priorities-hint"
            className="text-sm font-light leading-relaxed tracking-[0.01em] text-muted-foreground"
          >
            Comma separated. These are what the talking points are written
            against — without them the analysis is accurate but generic.
          </p>
          <Input
            id="businessPriorities"
            placeholder="Cost control, retention"
            aria-describedby="priorities-hint"
            {...register("businessPriorities", { onBlur: persist })}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-light tracking-[0.01em] text-body-foreground">
            How personal should it be?
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {LEVELS.map((option) => {
              const selected = level === option.value;
              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xs border p-4 transition-colors duration-150 ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground ${
                    selected
                      ? "border-foreground bg-surface-raised"
                      : "border-border bg-surface hover:bg-surface-raised"
                  }`}
                >
                  <input
                    type="radio"
                    name="personalisation"
                    value={option.value}
                    className="sr-only"
                    checked={selected}
                    onChange={() => setLevel(option.value)}
                  />
                  <span className="block text-sm font-normal text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                    {option.detail}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {submitError ? (
          <div
            role="alert"
            className="rounded-xs border border-danger bg-surface p-6"
          >
            <p className="text-base font-normal text-foreground">
              Could not start the analysis.
            </p>
            <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              {submitError}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => {
                setSubmitError(null);
                analyse.reset();
              }}
            >
              Try again
            </Button>
          </div>
        ) : null}
      </form>
    </StepShell>
  );
}
