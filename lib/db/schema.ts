import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * The two real tables in this repo (specs/011, specs/014). Everything else
 * stays mock-backed per CLAUDE.md — see specs/011 §2.1 for why this is the
 * deliberately narrow exception.
 *
 * No `sessions` table: sessions are stateless, carried entirely in a signed
 * cookie (`lib/auth/session.ts`), per specs/011 §3.2.
 */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  workEmail: text("work_email").notNull().unique(),
  company: text("company").notNull(),
  /** Never returned from any Server Action or DAL call — see lib/auth/dal.ts. */
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Password-reset tokens (specs/014 §3.2). The primary key is a SHA-256 hash
 * of the token, never the token itself — a DB read alone must not be enough
 * to reset an account's password, the same reasoning `accounts.passwordHash`
 * already applies to login credentials. Single-use: a row is deleted the
 * moment it is consumed (`lib/auth/actions.ts`'s `resetPasswordAction`).
 */
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
