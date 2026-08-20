import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { parse } from "cookie";
import { createAdminCredential, getAdminCredential, updateAdminCredentialPassword } from "./db";

const scrypt = promisify(scryptCallback);
export const ADMIN_SESSION_COOKIE = "baccarat_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

type AdminSession = { username: string; version: number };

function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("後台工作階段尚未設定 JWT_SECRET。");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string, salt = randomBytes(32).toString("base64url")) {
  const derived = await scrypt(password, salt, 64) as Buffer;
  return { salt, hash: derived.toString("base64url") };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = await hashPassword(password, salt);
  const expected = Buffer.from(expectedHash, "base64url");
  const actual = Buffer.from(hash, "base64url");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function bootstrapInitialAdmin() {
  const username = (process.env.ADMIN_INITIAL_USERNAME ?? "").trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "";
  if (!username || !password) return undefined;
  const existing = await getAdminCredential(username);
  if (existing) return existing;
  const { hash, salt } = await hashPassword(password);
  await createAdminCredential({ username, passwordHash: hash, passwordSalt: salt });
  return getAdminCredential(username);
}

export async function issueAdminSession(session: AdminSession) {
  return new SignJWT({ username: session.username, version: session.version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(signingKey());
}

export async function readAdminSession(req: Request): Promise<AdminSession | null> {
  const token = parse(req.headers?.cookie ?? "")[ADMIN_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey());
    const username = typeof payload.username === "string" ? payload.username : "";
    const version = typeof payload.version === "number" ? payload.version : -1;
    if (!username || version < 0) return null;
    const credential = await getAdminCredential(username);
    if (!credential || credential.sessionVersion !== version) return null;
    return { username, version };
  } catch {
    return null;
  }
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS * 1000,
  };
}

export async function authenticateAdmin(username: string, password: string) {
  await bootstrapInitialAdmin();
  const credential = await getAdminCredential(username);
  if (!credential || !(await verifyPassword(password, credential.passwordSalt, credential.passwordHash))) return null;
  return { username: credential.username, version: credential.sessionVersion };
}

export async function changeAdminPassword(username: string, currentPassword: string, nextPassword: string) {
  const credential = await getAdminCredential(username);
  if (!credential || !(await verifyPassword(currentPassword, credential.passwordSalt, credential.passwordHash))) return false;
  const { hash, salt } = await hashPassword(nextPassword);
  await updateAdminCredentialPassword(username, hash, salt);
  return true;
}

export function passwordFingerprint(password: string) {
  return createHash("sha256").update(password).digest("hex");
}
