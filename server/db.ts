import { and, asc, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import {
  adminCredentials,
  cards,
  customFormulas,
  eventRecords,
  formulaRecords,
  users,
  type AdminCredential,
  type Card,
  type CustomFormula,
  type EventRecord,
  type FormulaRecord,
  type InsertCard,
  type InsertCustomFormula,
  type InsertEventRecord,
  type InsertFormulaRecord,
  type InsertUser,
  type User,
} from "../drizzle/schema";
import type { EventFormulaName, FormulaHistory, Prediction } from "./baccarat";
import { EVENT_FORMULAS } from "./baccarat";
import { ENV } from "./_core/env";

function getDatabaseSsl() {
  const encodedCertificate = process.env.DATABASE_SSL_CA_BASE64;
  const certificate = encodedCertificate
    ? Buffer.from(encodedCertificate, "base64").toString("utf8")
    : process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n");
  return certificate ? { ca: certificate, rejectUnauthorized: true } : undefined;
}

function createDatabaseClient(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const pool = createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: getDatabaseSsl(),
  });
  return drizzle({ client: pool });
}

let database: ReturnType<typeof createDatabaseClient> | null = null;

/**
 * Public deployments deliberately use a workspace that is separate from the
 * exported owner account. This keeps pre-existing owner records private while
 * still allowing the two-page prediction flow to operate without OAuth.
 */
export const PUBLIC_WORKSPACE_OPEN_ID = "public-render-workspace";

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = createDatabaseClient(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      database = null;
    }
  }
  return database;
}

function requireDatabase(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("資料庫目前無法使用，請稍後再試。");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getPublicWorkspaceUser(): Promise<User> {
  const existing = await getUserByOpenId(PUBLIC_WORKSPACE_OPEN_ID);
  if (existing) return existing;

  await upsertUser({
    openId: PUBLIC_WORKSPACE_OPEN_ID,
    name: "公開預測工作區",
    loginMethod: "public",
    role: "admin",
    lastSignedIn: new Date(),
  });

  const created = await getUserByOpenId(PUBLIC_WORKSPACE_OPEN_ID);
  if (!created) throw new Error("無法建立公開預測工作區。");
  return created;
}

export async function ensureAdminCredentialsTable() {
  const db = requireDatabase(await getDb());
  await db.execute(sql`CREATE TABLE IF NOT EXISTS adminCredentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    passwordHash VARCHAR(256) NOT NULL,
    passwordSalt VARCHAR(128) NOT NULL,
    sessionVersion INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY admin_credentials_username_unique (username)
  )`);
}

export async function getAdminCredential(username: string): Promise<AdminCredential | undefined> {
  await ensureAdminCredentialsTable();
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(adminCredentials).where(eq(adminCredentials.username, username)).limit(1);
  return rows[0];
}

export async function createAdminCredential(values: Pick<AdminCredential, "username" | "passwordHash" | "passwordSalt">) {
  await ensureAdminCredentialsTable();
  const db = requireDatabase(await getDb());
  await db.insert(adminCredentials).values({ ...values, sessionVersion: 0 });
}

export async function updateAdminCredentialPassword(username: string, passwordHash: string, passwordSalt: string) {
  await ensureAdminCredentialsTable();
  const db = requireDatabase(await getDb());
  await db.update(adminCredentials).set({ passwordHash, passwordSalt, sessionVersion: sql`${adminCredentials.sessionVersion} + 1` }).where(eq(adminCredentials.username, username));
}

export type PaginationInput = {
  page: number;
  pageSize: number;
  search?: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function paged<T>(items: T[], total: number, { page, pageSize }: PaginationInput): PageResult<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listCards(userId: number, input: PaginationInput) {
  const db = requireDatabase(await getDb());
  const query = input.search?.trim();
  const where = query ? and(eq(cards.userId, userId), like(cards.card, `%${query.toUpperCase()}%`)) : eq(cards.userId, userId);
  const [items, counted] = await Promise.all([
    db.select().from(cards).where(where).orderBy(asc(cards.card)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(cards).where(where),
  ]);
  return paged(items, Number(counted[0]?.total ?? 0), input);
}

export async function getCard(userId: number, id: number) {
  const db = requireDatabase(await getDb());
  const result = await db.select().from(cards).where(and(eq(cards.id, id), eq(cards.userId, userId))).limit(1);
  return result[0];
}

export async function createCard(values: InsertCard) {
  const db = requireDatabase(await getDb());
  await db.insert(cards).values(values);
}

export async function updateCard(userId: number, id: number, values: Pick<InsertCard, "card" | "numericValue" | "baccaratValue">) {
  const db = requireDatabase(await getDb());
  await db.update(cards).set(values).where(and(eq(cards.id, id), eq(cards.userId, userId)));
}

export async function deleteCard(userId: number, id: number) {
  const db = requireDatabase(await getDb());
  await db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, userId)));
}

function formulaHistory(row: FormulaRecord): FormulaHistory {
  return {
    id: row.id,
    tableId: row.tableId,
    roundNo: row.roundNo,
    playerWins: row.playerWins,
    bankerWins: row.bankerWins,
    tieCount: row.tieCount,
    playerCards: Array.isArray(row.playerCards) ? row.playerCards.map(Number) : [],
    bankerCards: Array.isArray(row.bankerCards) ? row.bankerCards.map(Number) : [],
    playerPoint: row.playerPoint,
    bankerPoint: row.bankerPoint,
    winner: row.winner as Prediction,
    playerPair: Boolean(row.playerPair),
    bankerPair: Boolean(row.bankerPair),
    formulas: typeof row.formulas === "object" && row.formulas !== null ? row.formulas : {},
  };
}

export async function listFormulaHistory(userId: number, tableId: string) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(formulaRecords).where(and(eq(formulaRecords.userId, userId), eq(formulaRecords.tableId, tableId))).orderBy(asc(formulaRecords.roundNo));
  return rows.map(formulaHistory);
}

export async function getLastFormula(userId: number, tableId: string) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(formulaRecords).where(and(eq(formulaRecords.userId, userId), eq(formulaRecords.tableId, tableId))).orderBy(desc(formulaRecords.roundNo)).limit(1);
  return rows[0] ? formulaHistory(rows[0]) : undefined;
}

export async function getFormulaByRound(userId: number, tableId: string, roundNo: number) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(formulaRecords).where(and(eq(formulaRecords.userId, userId), eq(formulaRecords.tableId, tableId), eq(formulaRecords.roundNo, roundNo))).limit(1);
  return rows[0] ? formulaHistory(rows[0]) : undefined;
}

export async function getFormulaSession(userId: number, tableId: string, startRound: number, endRound: number) {
  const history = await listFormulaHistory(userId, tableId);
  return history.filter(row => row.roundNo >= startRound && row.roundNo <= endRound);
}

export async function listFormulaRecords(userId: number, input: PaginationInput & { tableId?: string }) {
  const db = requireDatabase(await getDb());
  const search = input.search?.trim();
  const conditions = [eq(formulaRecords.userId, userId)];
  if (input.tableId?.trim()) conditions.push(eq(formulaRecords.tableId, input.tableId.trim().toUpperCase()));
  if (search) conditions.push(or(like(formulaRecords.tableId, `%${search.toUpperCase()}%`), like(formulaRecords.winner, `%${search}%`))!);
  const where = and(...conditions);
  const [items, counted] = await Promise.all([
    db.select().from(formulaRecords).where(where).orderBy(desc(formulaRecords.createdAt), desc(formulaRecords.roundNo)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(formulaRecords).where(where),
  ]);
  return paged(items.map(formulaHistory), Number(counted[0]?.total ?? 0), input);
}

export async function listAdminFormulaRecords(input: PaginationInput & { tableId?: string }) {
  const db = requireDatabase(await getDb());
  const search = input.search?.trim();
  const conditions: SQL[] = [];
  if (input.tableId?.trim()) conditions.push(eq(formulaRecords.tableId, input.tableId.trim().toUpperCase()));
  if (search) conditions.push(or(like(formulaRecords.tableId, `%${search.toUpperCase()}%`), like(formulaRecords.winner, `%${search}%`))!);
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, counted] = await Promise.all([
    db.select().from(formulaRecords).where(where).orderBy(desc(formulaRecords.createdAt), desc(formulaRecords.roundNo)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(formulaRecords).where(where),
  ]);
  return paged(items.map(formulaHistory), Number(counted[0]?.total ?? 0), input);
}

export async function insertFormulaRecord(values: InsertFormulaRecord) {
  const db = requireDatabase(await getDb());
  await db.insert(formulaRecords).values(values);
}

export async function deleteFormulaRecord(userId: number, id: number) {
  const db = requireDatabase(await getDb());
  await db.delete(formulaRecords).where(and(eq(formulaRecords.id, id), eq(formulaRecords.userId, userId)));
}

export async function deleteAdminFormulaRecord(id: number) {
  const db = requireDatabase(await getDb());
  await db.delete(formulaRecords).where(eq(formulaRecords.id, id));
}

export async function resetFormulaTable(userId: number, tableId: string) {
  const db = requireDatabase(await getDb());
  await db.delete(formulaRecords).where(and(eq(formulaRecords.userId, userId), eq(formulaRecords.tableId, tableId)));
}

export async function listAllFormulaRecords(userId: number) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(formulaRecords).where(eq(formulaRecords.userId, userId)).orderBy(asc(formulaRecords.tableId), asc(formulaRecords.roundNo));
  return rows.map(formulaHistory);
}

export async function listEvents(userId: number, input: PaginationInput & { tableId?: string }) {
  const db = requireDatabase(await getDb());
  const search = input.search?.trim();
  const conditions = [eq(eventRecords.userId, userId)];
  if (input.tableId?.trim()) conditions.push(eq(eventRecords.tableId, input.tableId.trim().toUpperCase()));
  if (search) conditions.push(or(like(eventRecords.eventName, `%${search}%`), like(eventRecords.tableId, `%${search.toUpperCase()}%`))!);
  const where = and(...conditions);
  const [items, counted] = await Promise.all([
    db.select().from(eventRecords).where(where).orderBy(desc(eventRecords.createdAt), desc(eventRecords.roundNo)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(eventRecords).where(where),
  ]);
  return paged(items, Number(counted[0]?.total ?? 0), input);
}

export async function listAdminEvents(input: PaginationInput & { tableId?: string }) {
  const db = requireDatabase(await getDb());
  const search = input.search?.trim();
  const conditions: SQL[] = [];
  if (input.tableId?.trim()) conditions.push(eq(eventRecords.tableId, input.tableId.trim().toUpperCase()));
  if (search) conditions.push(or(like(eventRecords.eventName, `%${search}%`), like(eventRecords.tableId, `%${search.toUpperCase()}%`))!);
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, counted] = await Promise.all([
    db.select().from(eventRecords).where(where).orderBy(desc(eventRecords.createdAt), desc(eventRecords.roundNo)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ total: count() }).from(eventRecords).where(where),
  ]);
  return paged(items, Number(counted[0]?.total ?? 0), input);
}

export async function eventExists(userId: number, eventName: string, pattern: Record<EventFormulaName, Prediction>) {
  const db = requireDatabase(await getDb());
  const conditions = [eq(eventRecords.userId, userId), eq(eventRecords.eventName, eventName)];
  EVENT_FORMULAS.forEach(name => conditions.push(eq(eventRecords[name], pattern[name])));
  const rows = await db.select({ id: eventRecords.id }).from(eventRecords).where(and(...conditions)).limit(1);
  return rows.length > 0;
}

export async function insertEventRecord(values: InsertEventRecord) {
  const db = requireDatabase(await getDb());
  await db.insert(eventRecords).values(values);
}

export async function findEventsByPattern(userId: number, pattern: Record<EventFormulaName, Prediction>) {
  const db = requireDatabase(await getDb());
  const conditions = [eq(eventRecords.userId, userId)];
  EVENT_FORMULAS.forEach(name => conditions.push(eq(eventRecords[name], pattern[name])));
  return db.select().from(eventRecords).where(and(...conditions)).orderBy(desc(eventRecords.createdAt));
}

export async function listAllEvents(userId: number) {
  const db = requireDatabase(await getDb());
  return db.select().from(eventRecords).where(eq(eventRecords.userId, userId)).orderBy(asc(eventRecords.tableId), asc(eventRecords.roundNo));
}

export async function deleteEvent(userId: number, id: number) {
  const db = requireDatabase(await getDb());
  await db.delete(eventRecords).where(and(eq(eventRecords.id, id), eq(eventRecords.userId, userId)));
}

export async function deleteAdminEvent(id: number) {
  const db = requireDatabase(await getDb());
  await db.delete(eventRecords).where(eq(eventRecords.id, id));
}

export async function listCustomFormulas(userId: number) {
  const db = requireDatabase(await getDb());
  return db.select().from(customFormulas).where(eq(customFormulas.userId, userId)).orderBy(desc(customFormulas.createdAt));
}

export async function listEnabledCustomFormulas(userId: number) {
  const db = requireDatabase(await getDb());
  return db.select().from(customFormulas).where(and(eq(customFormulas.userId, userId), eq(customFormulas.isEnabled, true))).orderBy(asc(customFormulas.createdAt));
}

export async function createCustomFormula(values: InsertCustomFormula) {
  const db = requireDatabase(await getDb());
  await db.insert(customFormulas).values(values);
}

export async function updateCustomFormulaEnabled(userId: number, id: number, isEnabled: boolean) {
  const db = requireDatabase(await getDb());
  await db.update(customFormulas).set({ isEnabled }).where(and(eq(customFormulas.id, id), eq(customFormulas.userId, userId)));
}

export async function deleteCustomFormula(userId: number, id: number) {
  const db = requireDatabase(await getDb());
  await db.delete(customFormulas).where(and(eq(customFormulas.id, id), eq(customFormulas.userId, userId)));
}

export type StoredEvent = EventRecord;
export type StoredCard = Card;
export type StoredCustomFormula = CustomFormula;
