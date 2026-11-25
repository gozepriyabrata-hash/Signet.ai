"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, Download, Folder, LogOut, Palette, User } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";

import { useDismissibleMenu } from "@/hooks/use-dismissible-menu";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { api } from "@/lib/api";
import { logoutAction } from "@/lib/auth/actions";
import { qk } from "@/lib/query-keys";
import { useWorkflowStore } from "@/stores/workflow-store";

function useOptionalNavigation() {
  try {
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    return { router, params, pathname };
  } catch {
    return { router: null, params: null, pathname: null };
  }
}

function useOptionalQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return null;
  }
}

/**
 * The three theme swatches' own colours — deliberately literal, not tokens
 * (the one narrow exception to CLAUDE.md rule 6's "use a semantic token"):
 * a swatch's whole job is to show what a theme that is *not* necessarily the
 * active one looks like, and `--background`/`--accent` only ever resolve to
 * the currently active theme. Kept in sync by hand with the same values
 * `app/globals.css` defines for `:root`, `.light` and `.greeny-dark`.
 */
const THEME_SWATCHES = [
  {
    value: "light",
    label: "Light",
    fill: "oklch(0.977 0.005 118)",
    ring: "oklch(0.544 0.108 253)",
    check: "oklch(0.196 0.000 90)",
  },
  {
    value: "dark",
    label: "Dark",
    fill: "oklch(0.196 0.000 90)",
    ring: "oklch(0.634 0.122 253)",
    check: "oklch(0.935 0.016 114)",
  },
  {
    value: "greeny-dark",
    label: "Greeny Dark",
    fill: "oklch(0.180 0.014 145)",
    ring: "oklch(0.760 0.150 150)",
    check: "oklch(0.760 0.150 150)",
  },
] as const;

/** Up to two initials, e.g. "Priyabrata Goze" → "PG", "Priyabrata" → "P". */
function initials(name: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground cursor-pointer";

/**
 * The navbar's account control, top right — provides user identity display
 * and rapid access to Save Draft, Past Projects, Theme options, and Sign Out.
 */
export function ProfileMenu({
  name,
  onSaveDraft,
  isSavingDraft,
}: {
  name?: string | null;
  onSaveDraft?: () => void | Promise<void>;
  isSavingDraft?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useHasMounted();
  const { theme, setTheme } = useTheme();

  const { router, params, pathname } = useOptionalNavigation();
  const queryClient = useOptionalQueryClient();

  const closeAll = () => {
    setOpen(false);
    setThemeOpen(false);
  };

  useDismissibleMenu(open, closeAll, triggerRef, menuRef);

  const displayName =
    name === null ? "Account" : name?.trim() || "PRIYABRATA GOZE";
  const shortName = displayName === "Account" ? "" : initials(displayName);
  const saving = Boolean(isSavingDraft || localSaving);

  const handleSaveDraftClick = async () => {
    if (onSaveDraft) {
      setLocalSaving(true);
      try {
        await onSaveDraft();
      } finally {
        setLocalSaving(false);
        closeAll();
      }
      return;
    }

    const projectId =
      (params?.id as string | undefined) ||
      (pathname?.startsWith("/projects/") ? pathname.split("/")[2] : undefined);

    if (projectId) {
      setLocalSaving(true);
      try {
        const draft = useWorkflowStore.getState().drafts[projectId];
        await api.saveDraft(projectId, {
          avatarId: draft?.avatarId,
          voiceId: draft?.voiceId,
          videoFormat: draft?.format,
          recipient: draft?.recipient
            ? {
                name: draft.recipient.name,
                role: draft.recipient.role,
                company: draft.recipient.company,
                email: draft.recipient.email,
                industry: draft.recipient.industry,
                businessPriorities: draft.recipient.businessPriorities,
                personalisation: draft.recipient.personalisation,
              }
            : undefined,
          script: draft?.script,
          email:
            draft?.subject || draft?.body || draft?.greeting
              ? {
                  subject: draft.subject,
                  greeting: draft.greeting,
                  body: draft.body,
                  ctaId: draft.ctaId,
                  signatureId: draft.signatureId,
                }
              : undefined,
        });
        queryClient?.invalidateQueries({ queryKey: ["projects"] });
        queryClient?.invalidateQueries({ queryKey: qk.project(projectId) });
        setTimeout(() => {
          closeAll();
          router?.push("/drafts");
        }, 500);
      } catch (err) {
        closeAll();
        router?.push("/drafts");
      } finally {
        setLocalSaving(false);
      }
      return;
    }

    closeAll();
    router?.push("/drafts");
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? closeAll() : setOpen(true))}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 px-2.5 text-left text-xs font-medium tracking-[0.01em] text-slate-300 transition-all duration-150 ease-out hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground cursor-pointer"
      >
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-400 select-none"
        >
          {shortName || <User aria-hidden="true" className="size-3" />}
        </span>
        <span className="max-w-44 truncate uppercase tracking-wider font-semibold text-slate-200">
          {displayName}
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0c1222]/95 backdrop-blur-xl py-1 shadow-2xl"
        >
          {/* Button 1: Save Draft */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSaveDraftClick}
            disabled={saving}
            className={ITEM_CLASS}
          >
            <Download aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <span>{saving ? "Saving Draft…" : "Save Draft"}</span>
          </button>

          {/* Button 2: Past Projects */}
          <Link
            href="/drafts"
            role="menuitem"
            onClick={closeAll}
            className={ITEM_CLASS}
          >
            <Folder aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <span>Past Projects</span>
          </Link>

          {/* Theme Switcher */}
          <button
            type="button"
            role="menuitem"
            aria-expanded={themeOpen}
            onClick={() => setThemeOpen((value) => !value)}
            className={ITEM_CLASS}
          >
            <Palette aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <span>Theme</span>
          </button>

          {themeOpen ? (
            <div
              role="group"
              aria-label="Theme"
              className="flex items-center justify-center gap-4 border-y border-border px-3 py-3"
            >
              {THEME_SWATCHES.map(({ value, label, fill, ring, check }) => {
                const active = mounted && theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    aria-label={label}
                    title={label}
                    onClick={() => {
                      setTheme(value);
                      closeAll();
                    }}
                    style={
                      active
                        ? { borderColor: ring }
                        : { backgroundColor: fill, borderColor: ring }
                    }
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-transform duration-150 ease-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    {active ? (
                      <Check
                        aria-hidden="true"
                        className="size-4"
                        style={{ color: check }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Button 3: Sign Out */}
          <form action={logoutAction} className="border-t border-white/5 pt-0.5">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-light text-rose-300 transition-colors duration-150 ease-out hover:bg-rose-500/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground cursor-pointer"
            >
              <LogOut aria-hidden="true" className="size-4 shrink-0 text-rose-400" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
