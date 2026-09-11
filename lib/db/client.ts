import "server-only";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import * as schema from "@/lib/db/schema";

/**
 * The account/session database (specs/011). Lazily constructed, the same
 * discipline `lib/api/mock/store.ts` uses for `sessionStorage`: a module-scope
 * connection would open the database the moment anything imports this
 * module, including a build step that never touches the database.
 *
 * libsql (not better-sqlite3) so the same client works against a local file
 * in dev and a hosted Turso database in production — a serverless deployment
 * has no writable, persistent filesystem for a plain SQLite file.
 */
let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!instance) {
    const url =
      process.env.TURSO_DATABASE_URL ??
      `file:${process.env.DATABASE_FILE_PATH ?? "./data/app.db"}`;
    if (url.startsWith("file:")) {
      mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
    }
    const client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    instance = drizzle(client, { schema });
  }
  return instance;
}
