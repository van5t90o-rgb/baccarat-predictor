import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Local administrator credentials for the Render-hosted management backend. */
export const adminCredentials = mysqlTable(
  "adminCredentials",
  {
    id: int("id").autoincrement().primaryKey(),
    username: varchar("username", { length: 64 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
    passwordSalt: varchar("passwordSalt", { length: 128 }).notNull(),
    sessionVersion: int("sessionVersion").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("admin_credentials_username_unique").on(table.username)],
);

/**
 * Card.py card catalogue. Values are deliberately limited to the Card.VALID_CARDS
 * domain, while numeric and baccarat values are materialized for browsing.
 */
export const cards = mysqlTable(
  "cards",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    card: varchar("card", { length: 2 }).notNull(),
    numericValue: int("numericValue").notNull(),
    baccaratValue: int("baccaratValue").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("cards_user_card_unique").on(table.userId, table.card),
    index("cards_user_card_idx").on(table.userId, table.card),
  ],
);

/** CsvManager.FORMULA_FIELDS, with `formulas` persisted as structured JSON. */
export const formulaRecords = mysqlTable(
  "formulaRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tableId: varchar("tableId", { length: 64 }).notNull(),
    roundNo: int("roundNo").notNull(),
    playerWins: int("playerWins").notNull(),
    bankerWins: int("bankerWins").notNull(),
    tieCount: int("tieCount").notNull(),
    playerCards: json("playerCards").$type<number[]>().notNull(),
    bankerCards: json("bankerCards").$type<number[]>().notNull(),
    playerPoint: int("playerPoint").notNull(),
    bankerPoint: int("bankerPoint").notNull(),
    winner: varchar("winner", { length: 1 }).notNull(),
    playerPair: boolean("playerPair").default(false).notNull(),
    bankerPair: boolean("bankerPair").default(false).notNull(),
    formulas: json("formulas").$type<Record<string, string>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("formula_user_table_round_unique").on(table.userId, table.tableId, table.roundNo),
    index("formula_user_table_round_idx").on(table.userId, table.tableId, table.roundNo),
    index("formula_user_winner_idx").on(table.userId, table.winner),
  ],
);

/** CsvManager.EVENT_FIELDS. Chinese field names are retained to match the source contract. */
export const eventRecords = mysqlTable(
  "eventRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    eventName: varchar("eventName", { length: 32 }).notNull(),
    tableId: varchar("tableId", { length: 64 }).notNull(),
    roundNo: int("roundNo").notNull(),
    點差: varchar("點差", { length: 1 }).notNull(),
    理數: varchar("理數", { length: 1 }).notNull(),
    導數: varchar("導數", { length: 1 }).notNull(),
    真數: varchar("真數", { length: 1 }).notNull(),
    HZ: varchar("HZ", { length: 1 }).notNull(),
    價值: varchar("價值", { length: 1 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("event_user_name_idx").on(table.userId, table.eventName),
    index("event_user_table_idx").on(table.userId, table.tableId, table.roundNo),
  ],
);

/** Source-driven user rules. Formula.py's built-ins remain immutable and separate. */
export const customFormulas = mysqlTable(
  "customFormulas",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    rules: json("rules").$type<Record<string, unknown>>().notNull(),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("custom_formula_user_enabled_idx").on(table.userId, table.isEnabled),
    index("custom_formula_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AdminCredential = typeof adminCredentials.$inferSelect;
export type InsertAdminCredential = typeof adminCredentials.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;
export type FormulaRecord = typeof formulaRecords.$inferSelect;
export type InsertFormulaRecord = typeof formulaRecords.$inferInsert;
export type EventRecord = typeof eventRecords.$inferSelect;
export type InsertEventRecord = typeof eventRecords.$inferInsert;
export type CustomFormula = typeof customFormulas.$inferSelect;
export type InsertCustomFormula = typeof customFormulas.$inferInsert;
