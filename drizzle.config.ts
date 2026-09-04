import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for the account/session store (specs/011).
 *
 * Deliberately the only database in this repo: everything else stays
 * mock-backed per CLAUDE.md. `DATABASE_FILE_PATH` lets a deployment move the
 * SQLite file off the default `./data/app.db` without touching this file.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_FILE_PATH ?? "./data/app.db",
  },
});
