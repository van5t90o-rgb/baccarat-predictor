import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, adminCookieOptions, authenticateAdmin, changeAdminPassword, issueAdminSession } from "./adminAuth";
import { deleteAdminEvent, deleteAdminFormulaRecord, getPublicWorkspaceUser, listAdminEvents, listAdminFormulaRecords } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { baccaratRouter, exportCsvData, importCsvData } from "./routers/baccarat";

const storageListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(64).optional(),
  tableId: z.string().trim().max(64).optional(),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  admin: router({
    status: publicProcedure.query(({ ctx }) => ({ authenticated: Boolean(ctx.adminSession), username: ctx.adminSession?.username ?? null })),
    login: publicProcedure.input(z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(256) })).mutation(async ({ ctx, input }) => {
      const session = await authenticateAdmin(input.username, input.password);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼錯誤。" });
      ctx.res.cookie(ADMIN_SESSION_COOKIE, await issueAdminSession(session), adminCookieOptions());
      return { success: true, username: session.username } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...adminCookieOptions(), maxAge: -1 });
      return { success: true } as const;
    }),
    changePassword: adminProcedure.input(z.object({ currentPassword: z.string().min(1).max(256), nextPassword: z.string().min(6).max(256) })).mutation(async ({ ctx, input }) => {
      const changed = await changeAdminPassword(ctx.adminSession.username, input.currentPassword, input.nextPassword);
      if (!changed) throw new TRPCError({ code: "UNAUTHORIZED", message: "目前密碼不正確。" });
      const nextSession = { username: ctx.adminSession.username, version: ctx.adminSession.version + 1 };
      ctx.res.cookie(ADMIN_SESSION_COOKIE, await issueAdminSession(nextSession), adminCookieOptions());
      return { success: true } as const;
    }),
    storage: router({
      formulaList: adminProcedure.input(storageListInput).query(({ input }) => listAdminFormulaRecords(input)),
      eventList: adminProcedure.input(storageListInput).query(({ input }) => listAdminEvents(input)),
      removeFormula: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await deleteAdminFormulaRecord(input.id); return { success: true } as const; }),
      removeEvent: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await deleteAdminEvent(input.id); return { success: true } as const; }),
      exportData: adminProcedure.query(async () => exportCsvData((await getPublicWorkspaceUser()).id)),
      importData: adminProcedure.input(z.object({ type: z.enum(["formula", "event"]), csv: z.string().min(1).max(2_000_000) })).mutation(async ({ input }) => importCsvData((await getPublicWorkspaceUser()).id, input)),
    }),
  }),
  baccarat: baccaratRouter,
});

export type AppRouter = typeof appRouter;
