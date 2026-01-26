import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Posts table - stores generated social media posts
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),

  // Wizard config
  topic: text("topic").notNull(),
  platform: mysqlEnum("platform", ["instagram", "facebook", "twitter", "linkedin"]).notNull(),
  aspectRatio: varchar("aspectRatio", { length: 32 }),
  style: varchar("style", { length: 32 }),
  tone: varchar("tone", { length: 32 }),
  goal: varchar("goal", { length: 32 }),

  // Generated content
  caption: text("caption").notNull(),
  imagePrompt: text("imagePrompt"),
  imageUrl: text("imageUrl"),
  productImageUrl: text("productImageUrl"),

  // Batch grouping
  batchId: varchar("batchId", { length: 36 }),
  batchIndex: int("batchIndex"),

  // Status
  status: mysqlEnum("status", ["draft", "ready", "published", "failed"]).default("draft").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Templates table - stores reusable wizard configurations
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),

  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),

  // Saved config
  platform: mysqlEnum("platform", ["instagram", "facebook", "twitter", "linkedin"]).notNull(),
  aspectRatio: varchar("aspectRatio", { length: 32 }),
  style: varchar("style", { length: 32 }),
  tone: varchar("tone", { length: 32 }),
  goal: varchar("goal", { length: 32 }),

  // Batch defaults
  defaultBatchQuantity: int("defaultBatchQuantity").default(1),
  useSameModel: boolean("useSameModel").default(false),
  modelDescription: text("modelDescription"),

  useCount: int("useCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;