import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";

/**
 * Signs out of the real account/session subsystem (specs/011). A plain
 * `<form action={logoutAction}>` — no client state needed for a
 * fire-and-redirect Server Action, so this stays a Server Component leaf
 * (CLAUDE.md rule 8: push "use client" only to what needs it, and this
 * needs none).
 *
 * Icon-only, with a visible `aria-label` — the design system's anti-pattern
 * list bans unlabelled icon buttons.
 */
export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        className="flex items-center justify-center rounded-xs p-2 text-body-foreground transition-colors duration-150 ease-out hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
      </button>
    </form>
  );
}
