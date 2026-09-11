import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for the account/session store (specs/011).
 *
 * Deliberately the only database in this repo: everything else stays
 * mock-backed per CLAUDE.md. `turso` dialect so migrations run the same way
 * against a local file (dev, `DATABASE_FILE_PATH`) or a hosted Turso
 * database (prod, `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`) — a serverless
 * deployment has no writable, persistent filesystem for a plain SQLite file.
 */
export default defineConfig({
  dialect: "turso",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.TURSO_DATABASE_URL ??
      `file:${process.env.DATABASE_FILE_PATH ?? "./data/app.db"}`,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
