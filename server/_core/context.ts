import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { readAdminSession } from "../adminAuth";
import { getPublicWorkspaceUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  adminSession: { username: string; version: number } | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Render deployment is intentionally a two-page public tool. Business
  // records remain scoped to a dedicated public workspace instead of the
  // exported owner's existing account.
  const user: User = await getPublicWorkspaceUser();
  const adminSession = await readAdminSession(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
    adminSession,
  };
}
