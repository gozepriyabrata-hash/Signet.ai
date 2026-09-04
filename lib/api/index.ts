import { mockClient } from "./mock";
import { realClient } from "./real";
import type { ApiClient } from "./types";

/**
 * The only file that changes when a real backend arrives.
 *
 * Mocks are the default, so a fresh clone runs with no configuration.
 * Components import `api` from `@/lib/api` — never a mock module directly.
 */
export const api: ApiClient =
  process.env.NEXT_PUBLIC_USE_MOCKS === "false" ? realClient : mockClient;

export type { ApiClient } from "./types";
