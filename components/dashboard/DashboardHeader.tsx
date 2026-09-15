"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Paperclip, Plus, Settings, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useDismissibleMenu } from "@/hooks/use-dismissible-menu";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
  REPORT_INPUT_ACCEPT,
  rejectionForReportFile,
} from "@/lib/report-validation";
import { useWorkflowStore } from "@/stores/workflow-store";

type Period = "morning" | "afternoon" | "evening";

/**
 * Rotates through the hero input's placeholder copy — specs/015 §3.1's static
 * line was the whole placeholder before this; now it is just the first frame.
 * Every line stays true to what the field actually does (name a project /
 * attach a report) rather than reaching for generic "ask me anything" chat
 * copy, because the card is deliberately not a freeform AI chat surface (see
 * this file's own top comment).
 */
const HERO_PLACEHOLDERS = [
  "Start a new project — upload a report to begin.",
  "Turn a report into a video worth watching.",
  "Give it a name, or just drop a report in.",
  "One report in — a video, an email and a send come out.",
  "What are we turning into a message today?",
] as const;

const HERO_PLACEHOLDER_INTERVAL_MS = 3200;

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
 *
 * The "+" opens a small menu rather than acting as the file input itself
 * (§12): "Add files or photos" and "Start a new project" — the card's only
 * two actions — live behind one control instead of two competing for the
 * same row. Selecting either item closes the menu; the file item opens the
 * native picker, the project item calls the same `start` mutation Enter
 * already triggered.
 *
 * §13 added "Settings" as the menu's third item, navigating to `/settings`,
 * once the same-named link was removed from `Sidebar`'s footer — this menu
 * is now Settings' only entry point from inside the workspace shell.
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
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const namePart = accountName ? `, ${accountName}` : "";
  const greeting = period ? `Good ${period}${namePart}` : `Hello${namePart}`;

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % HERO_PLACEHOLDERS.length);
    }, HERO_PLACEHOLDER_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

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

  useDismissibleMenu(menuOpen, () => setMenuOpen(false), triggerRef, menuRef);

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
        <div className="relative">
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
            className="relative z-10 w-full bg-transparent text-base font-light leading-relaxed text-foreground focus:outline-none disabled:opacity-50"
          />
          {name ? null : (
            <span
              key={placeholderIndex}
              aria-hidden="true"
              className="placeholder-fade pointer-events-none absolute inset-0 flex items-center truncate text-base font-light leading-relaxed text-body-foreground"
            >
              {HERO_PLACEHOLDERS[placeholderIndex]}
            </span>
          )}
        </div>

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

        <div className="relative mt-6">
          <label htmlFor="dashboard-hero-file" className="sr-only">
            Attach a report
          </label>
          <input
            id="dashboard-hero-file"
            ref={inputRef}
            type="file"
            accept={REPORT_INPUT_ACCEPT}
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              pickFile(event.target.files?.[0]);
              setMenuOpen(false);
            }}
          />

          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={disabled}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-foreground transition-colors duration-150 ease-out hover:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="sr-only">More options</span>
            <Plus aria-hidden="true" className="size-4" />
          </button>

          {menuOpen ? (
            <div
              ref={menuRef}
              role="menu"
              aria-label="More options"
              className="absolute top-full left-0 z-10 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  inputRef.current?.click();
                }}
                disabled={disabled}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-light text-foreground hover:bg-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
              >
                <Paperclip aria-hidden="true" className="size-4 shrink-0" />
                Add files or photos
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  start.mutate();
                }}
                disabled={disabled}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-light text-foreground hover:bg-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground disabled:opacity-50"
              >
                <FolderPlus aria-hidden="true" className="size-4 shrink-0" />
                {start.isPending ? "Starting…" : "Start a new project"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-light text-foreground hover:bg-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
              >
                <Settings aria-hidden="true" className="size-4 shrink-0" />
                Settings
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
