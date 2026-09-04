"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { SETTINGS_SECTIONS } from "@/components/settings/sections";

/**
 * The Settings sub-nav.
 *
 * ── `aria-current="page"`, not `"step"` ─────────────────────────────────────
 * Spec 007's WorkflowStepper uses `step` because it marks a position in a
 * process. This does not: these nine sections have no order and no
 * dependencies, and a user can be in any of them at any time. MDN defines
 * `page` as "the current page within a set of pages", which is exactly what
 * this is.
 *
 * A client component only because `useSelectedLayoutSegment` is one — it reads
 * the active segment one level below the layout it is called from, which keeps
 * the layout itself a Server Component.
 */


export function SettingsNav() {
  const active = useSelectedLayoutSegment();

  return (
    <nav aria-label="Settings sections">
      <ul className="space-y-1">
        {SETTINGS_SECTIONS.map((section) => {
          const current = section.segment === active;
          return (
            <li key={section.segment}>
              <Link
                href={`/settings/${section.segment}`}
                aria-current={current ? "page" : undefined}
                className={`block rounded-xs px-3 py-2 text-sm font-light tracking-[0.01em] transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                  current
                    // A neutral filled background marks the active route, never
                    // accent — that token means "AI is acting"
                    // (docs/design-system.md §1).
                    ? "bg-surface-raised text-foreground"
                    : "text-body-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
