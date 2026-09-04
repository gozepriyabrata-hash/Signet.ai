/**
 * The one error shape both adapters agree on.
 *
 * `getProject` has two failure modes that are different screens, not different
 * copy: "no project with this id" is a dead end that needs a way back, and
 * "the call failed" is recoverable and needs a Retry (CLAUDE.md rules 5 and 9).
 * Without a way to tell them apart, `/projects/[id]` would have to offer a
 * Retry that can never succeed, or a 404 for a transient blip.
 *
 * The mock adapter already raises `{ code, retryable }`; this is that contract
 * written down and made checkable. `lib/api/real/` must raise the same `code`
 * when a backend answers 404.
 */
export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "NOT_FOUND"
  );
}
