import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Render a client component inside a fresh QueryClient.
 *
 * A new client per test: a shared one leaks cached data between tests and makes
 * the loading state impossible to observe in the second test that uses a key.
 * Retries are off so an error state arrives on the first rejection instead of
 * after the app's `retry: 1`.
 */
export function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
  };
}
