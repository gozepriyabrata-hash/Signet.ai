import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { readSession } from "@/lib/auth/session";
import type { WorkspaceAccount } from "@/types";

/**
 * The Data Access Layer (specs/011 §2.3, §3.4): the "secure" check, as
 * opposed to `proxy.ts`'s "optimistic" cookie-shape check. `cache()` so one
 * request decrypts the cookie and (if needed) queries the account at most
 * once, no matter how many Server Actions/Components call this.
 *
 * CLAUDE.md rule 3's third bucket: session/identity is read fresh here, on
 * the server, every time — never cached in Zustand or TanStack Query.
 */
export const verifySession = cache(async (): Promise<{ accountId: string } | null> => {
  return readSession();
});

/** Never returns `passwordHash` — the DTO discipline specs/011 §4 names. */
export const getCurrentAccount = cache(async (): Promise<WorkspaceAccount | null> => {
  const session = await verifySession();
  if (!session) return null;

  const [row] = await getDb()
    .select({
      id: accounts.id,
      name: accounts.name,
      workEmail: accounts.workEmail,
      company: accounts.company,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.id, session.accountId))
    .limit(1);

  if (!row) return null;
  return { ...row, createdAt: row.createdAt.toISOString() };
});
