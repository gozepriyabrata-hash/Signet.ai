/**
 * A minimal stand-in for `next/headers`'s `cookies()` store, for tests that
 * exercise `lib/auth/session.ts` or the Server Actions built on it.
 *
 * Real `cookies()` throws outside a request scope
 * (https://nextjs.org/docs/messages/next-dynamic-api-wrong-context), so any
 * test importing those modules must `vi.mock("next/headers", ...)` with one
 * of these instead of the real implementation.
 */
export function createCookieJar() {
  const store = new Map<string, string>();

  const jar = {
    get(name: string) {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string) {
      store.set(name, value);
    },
    delete(name: string) {
      store.delete(name);
    },
  };

  return { jar, cookies: async () => jar };
}
