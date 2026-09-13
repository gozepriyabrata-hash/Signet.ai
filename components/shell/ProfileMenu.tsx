"use client";

import { Check, LogOut, Palette, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";

import { useDismissibleMenu } from "@/hooks/use-dismissible-menu";
import { logoutAction } from "@/lib/auth/actions";
import { useHasMounted } from "@/hooks/use-has-mounted";

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
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-light text-foreground transition-colors duration-150 ease-out hover:bg-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground";

/**
 * The sidebar footer's account control (specs/015-dashboard-redesign.md
 * §15) — replaces the standalone Settings link (§13) and sign-out icon with
 * one avatar + name trigger, so the footer needs only this and the collapse
 * toggle. Opening it reveals the three-way theme picker and sign-out.
 *
 * The menu opens *above* the trigger (`bottom-full`) — the mirror image of
 * `DashboardHeader`'s "+" menu, which opens below (§14). Both are correct
 * for where they sit: this trigger is pinned to the bottom of the viewport,
 * so opening upward is the direction with room; the dashboard card's "+"
 * sits near the top of its card, so opening downward is.
 *
 * The three theme swatches are not shown until "Theme" itself is tapped
 * (§16) — the first pass showed all three the moment the account menu
 * opened, which read as cluttered next to "Sign out." "Theme" is its own
 * `menuitem` with a `Palette` icon; tapping it reveals the swatch row in
 * place, closing again when a swatch is chosen or the whole menu closes.
 */
export function ProfileMenu({ name }: { name: string | null }) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useHasMounted();
  const { theme, setTheme } = useTheme();

  const closeAll = () => {
    setOpen(false);
    setThemeOpen(false);
  };

  useDismissibleMenu(open, closeAll, triggerRef, menuRef);

  const displayName = name?.trim() || "Account";
  const shortName = initials(name);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? closeAll() : setOpen(true))}
        className="flex w-full items-center gap-2.5 rounded-md p-2 text-left text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground group-data-[sidebar=collapsed]/shell:justify-center"
      >
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-normal text-foreground"
        >
          {shortName || <User aria-hidden="true" className="size-3.5" />}
        </span>
        <span className="truncate group-data-[sidebar=collapsed]/shell:sr-only">
          {displayName}
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className="absolute bottom-full left-0 z-10 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            aria-expanded={themeOpen}
            onClick={() => setThemeOpen((value) => !value)}
            className={ITEM_CLASS}
          >
            <Palette aria-hidden="true" className="size-4 shrink-0" />
            Theme
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

          <form action={logoutAction}>
            <button type="submit" role="menuitem" className={ITEM_CLASS}>
              <LogOut aria-hidden="true" className="size-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
