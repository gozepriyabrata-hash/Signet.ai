import { QueryClient } from "@tanstack/react-query";

/**
 * Defined locally rather than imported.
 *
 * The TanStack docs currently show `environmentManager.isServer()`, which does
 * not exist in @tanstack/react-query@5.102.8. An `isServer` export IS reachable
 * — @tanstack/react-query re-exports all of @tanstack/query-core — so this is
 * not a case of the helper being unavailable. It is a case of the published
 * name having already moved once between minors. This is the same one-line
 * check the library performs, and it cannot move again.
 */
const isServer = typeof window === "undefined";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above zero so a hydrated or freshly-mounted query does not refetch
        // immediately. Also keeps the dashboard from re-hitting the mock's
        // artificial 300–800ms latency on every remount.
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * A new client per call on the server, one cached client in the browser.
 *
 * The server must not hold a shared client: a single reused instance across
 * Server Components makes every `dehydrate()` serialize unrelated queries, and
 * on a real backend it would leak one request's data into another's.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
