"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
  REPORT_INPUT_ACCEPT,
  rejectionForReportFile,
} from "@/lib/report-validation";
import { useWorkflowStore } from "@/stores/workflow-store";

type Period = "morning" | "afternoon" | "evening";

function periodFromHour(hour: number): Period {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** No subscription target — this only exists to give useSyncExternalStore a
*  server/client snapshot split, never to react to external change events. */
function subscribe() {
  return () => {};
}

function getSnapshot(): Period {
  return periodFromHour(new Date().getHours());
}

/** `null` on the server: the server's clock/timezone is not the visitor's,
 *  so guessing a period there would be actively wrong for some visitors,
 *  not just momentarily stale. */
function getServerSnapshot(): null {
  return null;
}

/**
 * Greeting + hero create action — specs/015-dashboard-redesign.md §3.1, §10,
 * §11.
 *
 * `useSyncExternalStore` — not `useEffect` + `setState` — resolves the
 * time-of-day half of the greeting: it is the API React ships specifically
 * for a value that legitimately differs between the server's render and the
 * browser's, and it swaps to the client's real snapshot right after
 * hydration without a mismatch warning, because that swap is what the API
 * contract promises rather than something reconciliation has to paper over.
 * The account name is unaffected — it arrives as a server-rendered prop
 * (`getCurrentAccount()`, called once in `dashboard/page.tsx`; never here,
 * since `lib/auth/dal.ts` is `import "server-only"`).
 *
 * The card is a real, typable field and a real file attach control — not the
 * static placeholder text §3.1/§10 shipped. §11 is the record of why: a
 * reviewer asked for both, explicitly, twice. What it is NOT is a freeform
 * AI chat surface — typed text becomes `Project.name` (extending
 * `createProject`'s existing signature by one optional argument), and an
 * attached file is uploaded as the report through the exact mutation
 * (`api.uploadReport`) `ReportStep` already calls, once the project exists to
 * upload it to. There is no interpretation step, no `Conversation` type and
 * no new AI call — see §11 for the boundary this stops short of, and why.
 */
export function DashboardHeader({
  accountName,
}: {
  accountName: string | null;
}) {
  const period = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const namePart = accountName ? `, ${accountName}` : "";
  const greeting = period ? `Good ${period}${namePart}` : `Hello${namePart}`;

  const start = useMutation({
    mutationFn: async () => {
      const project = await api.createProject(name.trim() || undefined);
      if (file) {
        const job = await api.uploadReport(project.id, file);
        useWorkflowStore.getState().setActiveJob(project.id, "parse", job.id);
      }
      return project;
    },
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: qk.stats() });
      router.push(`/projects/${project.id}`);
    },
  });

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const problem = rejectionForReportFile(candidate);
    setRejection(problem);
    if (problem) return;
    setFile(candidate);
  };

  const disabled = start.isPending;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4 text-center">
      <h1 className="text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        {greeting}
      </h1>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pickFile(event.dataTransfer.files[0]);
        }}
        className={`w-full max-w-2xl rounded-2xl border p-6 text-left transition-colors duration-150 ease-out sm:p-8 ${
          dragging ? "border-foreground bg-surface-raised" : "border-border bg-surface"
        }`}
      >
        <label htmlFor="dashboard-hero-prompt" className="sr-only">
          Project name
        </label>
        <input
          id="dashboard-hero-prompt"
          type="text"
          value={name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !disabled) {
              event.preventDefault();
              start.mutate();
            }
          }}
          placeholder="Start a new project — upload a report to begin."
          className="w-full bg-transparent text-base font-light leading-relaxed text-foreground placeholder:text-body-foreground focus:outline-none disabled:opacity-50"
        />

        {file ? (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5 text-sm font-light text-body-foreground">
            <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={disabled}
              className="shrink-0 rounded-full p-0.5 text-body-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ) : null}

        {rejection ? (
          <p role="alert" className="mt-3 text-sm font-light text-danger">
            {rejection}
          </p>
        ) : null}

        {start.isError ? (
          <p role="alert" className="mt-3 text-sm font-light text-danger">
            {start.error instanceof Error
              ? start.error.message
              : "Could not start the project."}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-4">
          <label
            className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-foreground transition-colors duration-150 ease-out hover:bg-border focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground ${
              disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
            }`}
          >
            <span className="sr-only">Attach a report</span>
            <Plus aria-hidden="true" className="size-4" />
            <input
              ref={inputRef}
              type="file"
              accept={REPORT_INPUT_ACCEPT}
              disabled={disabled}
              className="sr-only"
              onChange={(event) => pickFile(event.target.files?.[0])}
            />
          </label>

          <Button onClick={() => start.mutate()} disabled={disabled}>
            {start.isPending ? "Starting…" : "Start a new project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
