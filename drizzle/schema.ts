import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Identity-generated numeric value managed by PostgreSQL.
   * Use this for relations between tables.
   */
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  /** Legacy user identifier (openId) preserved for database schema compatibility. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const interestRegistrations = pgTable("interestRegistrations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  consentedAt: timestamp("consentedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmationSentAt: timestamp("confirmationSentAt"),
  adminNotifiedAt: timestamp("adminNotifiedAt"),
  lastEmailError: text("lastEmailError"),
});
export type InterestRegistration = typeof interestRegistrations.$inferSelect;
export type InsertInterestRegistration = typeof interestRegistrations.$inferInsert;
