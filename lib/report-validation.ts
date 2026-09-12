/**
 * Client-side report upload validation — CLAUDE.md rule 12.
 *
 * Shared by `ReportStep` (the workflow's own upload dropzone) and the
 * dashboard's hero "+" attach control, so the two places a user can pick a
 * report file enforce exactly the same rule rather than two copies that can
 * drift.
 *
 * Not a security boundary. MDN is explicit that `accept` "doesn't validate
 * the types of the selected files", that a user can override it in the file
 * chooser, and that it "should be backed up by appropriate server-side
 * validation" — and some operating systems report non-standard MIME types
 * for common extensions, which is why the extension is checked as a
 * fallback rather than trusted alone. When `lib/api/real/` becomes real, the
 * same checks must exist on the far side.
 */

export const MAX_REPORT_BYTES = 25 * 1024 * 1024;

/** The IANA-registered types. `application/pdf` and the OOXML wordprocessing
 *  type; anything else is refused before the seam is called. */
export const ACCEPTED_REPORT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
export const ACCEPTED_REPORT_EXTENSIONS = [".pdf", ".docx"];

/** Passed straight to an `<input accept>` — a hint to the file picker only. */
export const REPORT_INPUT_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function rejectionForReportFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const extensionOk = ACCEPTED_REPORT_EXTENSIONS.some((ext) =>
    name.endsWith(ext),
  );

  // Either signal is enough to accept, because neither is reliable alone: the
  // browser's `type` can be empty or non-standard, and an extension is just a
  // string. Both wrong is a confident enough refusal.
  if (!ACCEPTED_REPORT_TYPES.has(file.type) && !extensionOk) {
    return "That file is not a PDF or a Word document. Upload a .pdf or .docx.";
  }
  if (file.size > MAX_REPORT_BYTES) {
    const mb = Math.round(file.size / 1_000_000);
    return `That file is ${mb}MB. The limit is 25MB.`;
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  return null;
}
