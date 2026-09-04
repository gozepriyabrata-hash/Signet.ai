"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A modal built on the native `<dialog>` element, not on @radix-ui/react-dialog.
 *
 * `showModal()` gives focus trapping, Escape-to-close and an inert backdrop
 * from the browser — MDN records the element as Baseline "widely available"
 * since March 2022, and states that with `showModal()` "everything other than
 * the <dialog> and its contents should be rendered inert… this behavior is
 * provided by the browser".
 *
 * That is the whole reason the Radix package exists, so importing it would be
 * shipping a polyfill for something the platform now does. It is the same call
 * this repo already made twice for native `<select>` (ProjectsToolbar,
 * RangePicker) on the same grounds: correct for free.
 *
 * ── This component is rule 2's last mile ────────────────────────────────────
 * The send confirmation is the only dialog in this product that guards an
 * irreversible, outward-facing action. Two consequences are deliberate:
 *
 *  - The dialog never closes itself on confirm. The caller closes it after the
 *    mutation is dispatched, so a mis-timed re-render cannot dismiss the modal
 *    and leave the user unsure whether they sent anything.
 *  - `autofocus` goes on the CANCEL control, not the confirm. MDN recommends
 *    autofocusing "the element the user is expected to interact with
 *    immediately"; for a destructive or irreversible action that is the way
 *    out, so an Enter keypress landing on an open dialog does not send.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Fires for Escape and for a form[method=dialog] submit, so the caller's
      // state cannot drift out of sync with what the browser did.
      onClose={onClose}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xs border border-border bg-surface p-6 text-foreground",
        "backdrop:bg-background/70",
        className,
      )}
    >
      <h2 id="dialog-title" className="text-base font-normal text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </dialog>
  );
}
