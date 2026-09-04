/**
 * A promise whose settlement the test controls.
 *
 * Used instead of `new Promise(() => {})` to hold a query in its pending state.
 * A promise that never settles leaves React's act queue undrained, and RTL's
 * automatic cleanup then hangs until the hook timeout — which surfaces as a
 * confusing "Hook timed out" against `beforeEach` rather than against the test
 * that actually leaked it. Resolve the deferred before the test ends.
 */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}
