"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * The upload control Avatar and Voice share.
 *
 * ── Validation here is a UX affordance, not a security control ──────────────
 * Rule 12 names PDF and DOCX because it was written for the report step, and it
 * plainly intends "validate uploads" — so an avatar image and a voice sample
 * are validated too. specs/008 §3.10 records that reading rather than assuming
 * it.
 *
 * What it buys is a user learning in 50ms instead of after a 25MB upload. It
 * buys nothing else: MDN states that `accept` "doesn't validate the types of
 * the selected files", that a user can override it in the file chooser, and
 * that it "should be backed up by appropriate server-side validation". When
 * `lib/api/real/` becomes real, the same checks must exist on the far side.
 *
 * Extracted rather than copied. `ReportStep` has its own `rejectionFor` and
 * deliberately keeps it — that one is inside a workflow step with different
 * copy and a different failure surface — but two settings sections doing the
 * same job should not diverge on the third.
 */

export interface AcceptedFiles {
  types: readonly string[];
  extensions: readonly string[];
  /** Used in the rejection message: "That file is not …". */
  label: string;
  maxBytes: number;
  maxLabel: string;
}

export function rejectionFor(
  file: File,
  accepted: AcceptedFiles,
): string | null {
  const name = file.name.toLowerCase();
  const extensionOk = accepted.extensions.some((ext) => name.endsWith(ext));

  // Either signal is enough to accept, because neither is reliable alone: the
  // browser's `type` can be empty or non-standard — MDN notes some operating
  // systems report non-standard types for common extensions — and an extension
  // is just a string. Both wrong is a confident enough refusal.
  if (!accepted.types.includes(file.type) && !extensionOk) {
    return `That file is not ${accepted.label}.`;
  }
  if (file.size > accepted.maxBytes) {
    return `That file is ${Math.round(file.size / 1_000_000)}MB. The limit is ${accepted.maxLabel}.`;
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

export function UploadPanel({
  title,
  blurb,
  buttonLabel,
  accepted,
  onAccepted,
  note,
}: {
  title: string;
  blurb: string;
  buttonLabel: string;
  accepted: AcceptedFiles;
  onAccepted: (file: File) => void;
  /** Shown after a file passes, when the section has nothing further to say. */
  note?: (fileName: string) => string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [passed, setPassed] = useState<string | null>(null);

  const handle = (file: File | undefined) => {
    if (!file) return;
    const problem = rejectionFor(file, accepted);
    setRejection(problem);
    setPassed(problem ? null : file.name);
    if (!problem) onAccepted(file);
  };

  return (
    <div className="rounded-xs border border-border bg-surface p-6">
      <p className="text-base font-normal text-foreground">{title}</p>
      <p className="mt-2 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
        {blurb}
      </p>

      <input
        ref={inputRef}
        type="file"
        // A hint to the file picker, nothing more — see the header comment.
        accept={[...accepted.extensions, ...accepted.types].join(",")}
        className="sr-only"
        onChange={(event) => handle(event.target.files?.[0])}
      />

      <Button
        variant="outline"
        size="sm"
        className="mt-5"
        onClick={() => inputRef.current?.click()}
      >
        {buttonLabel}
      </Button>

      {/* Inline, beside the control. Never a toast — a message about a file
          belongs where the file is. */}
      {rejection ? (
        <p role="alert" className="mt-3 text-sm font-light text-danger">
          {rejection}
        </p>
      ) : null}

      {passed && note ? (
        <p className="mt-3 text-sm font-light text-body-foreground">
          {note(passed)}
        </p>
      ) : null}
    </div>
  );
}
