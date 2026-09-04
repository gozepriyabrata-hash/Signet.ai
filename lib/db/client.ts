import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import * as schema from "@/lib/db/schema";

/**
 * The account/session database (specs/011). Lazily constructed, the same
 * discipline `lib/api/mock/store.ts` uses for `sessionStorage`: a module-scope
 * connection would open the SQLite file the moment anything imports this
 * module, including a build step that never touches the database.
 */
let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!instance) {
    const path = process.env.DATABASE_FILE_PATH ?? "./data/app.db";
    // better-sqlite3 does not create the parent directory itself.
    mkdirSync(dirname(path), { recursive: true });
    const sqlite = new Database(path);
    sqlite.pragma("journal_mode = WAL");
    instance = drizzle(sqlite, { schema });
  }
  return instance;
}
