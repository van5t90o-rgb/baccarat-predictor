import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  EVENT_FORMULAS,
  FORMULA_NAMES,
  baccaratValue,
  buildAnalysis,
  calculateFormulas,
  cardValue,
  chooseBest,
  computePoints,
  currentEvents,
  eventPatternFromPredictions,
  formulaPredictions,
  isPair,
  normalizeCard,
  normalizePrediction,
  parseCards,
  resolveHitResults,
  validateCard,
  winner,
  type FormulaMap,
} from "../baccarat";
import { buildDefaultRule, customFormulaRuleSchema, evaluateCustomFormula } from "../customFormula";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(100).default(10),
  search: z.string().max(100).optional(),
});

const tableInput = z.string().trim().min(1, "請輸入桌號").max(64).transform(value => value.toUpperCase());

const recordInput = z.object({
  tableId: tableInput,
  playerWins: z.number().int().min(0).max(1_000_000),
  bankerWins: z.number().int().min(0).max(1_000_000),
  tieCount: z.number().int().min(0).max(1_000_000),
  playerCards: z.array(z.string().max(4)).max(3),
  bankerCards: z.array(z.string().max(4)).max(3),
});

const supplementInput = z.object({
  tableId: tableInput,
  playerWins: z.number().int().min(0).max(1_000_000),
  bankerWins: z.number().int().min(0).max(1_000_000),
  tieCount: z.number().int().min(0).max(1_000_000),
  winner: z.enum(["閒", "莊", "和"]),
  playerPair: z.boolean().default(false),
  bankerPair: z.boolean().default(false),
});

const customFormulaInput = z.object({ name: z.string().trim().min(1, "請輸入公式名稱").max(100), rules: customFormulaRuleSchema });

const formulaColumns = ["table_id", "round_no", "player_wins", "banker_wins", "tie_count", "player_cards", "banker_cards", "player_point", "banker_point", "winner", "formulas"] as const;
const eventColumns = ["event_name", "table_id", "round_no", "點差", "理數", "導數", "真數", "HZ", "價值"] as const;

type CsvRow = Record<string, string>;

function csvRows(source: string) {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if (char === "\n" && !quoted) {
      row.push(current);
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current);
  if (row.some(value => value !== "")) rows.push(row);
  if (!rows.length) return [] as CsvRow[];
  const [headers, ...values] = rows;
  return values.map(valuesRow => Object.fromEntries(headers.map((header, index) => [header.trim(), valuesRow[index] ?? ""])));
}

function asNonNegativeInt(value: string, field: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new TRPCError({ code: "BAD_REQUEST", message: `${field} 欄位格式不正確。` });
  return number;
}

function parseNumberCards(value: string, field: string) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(card => !Number.isInteger(Number(card)) || Number(card) < 1 || Number(card) > 13)) throw new Error();
    return parsed.map(Number);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${field} 欄位格式不正確。` });
  }
}

function parseFormulas(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return Object.fromEntries(Object.entries(parsed).map(([key, result]) => [key, String(result ?? "")]));
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "formulas 欄位格式不正確。" });
  }
}

function requireColumns(row: CsvRow, columns: readonly string[]) {
  for (const column of columns) {
    if (!(column in row)) throw new TRPCError({ code: "BAD_REQUEST", message: `CSV 缺少必要欄位：${column}` });
  }
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvContent(headers: readonly string[], rows: CsvRow[]) {
  return [headers.join(","), ...rows.map(row => headers.map(header => csvCell(row[header])).join(","))].join("\r\n");
}

function calculateNextRecord(input: z.infer<typeof recordInput>, previous: Awaited<ReturnType<typeof db.getLastFormula>>) {
  const playerCards = parseCards(input.playerCards);
  const bankerCards = parseCards(input.bankerCards);
  if (playerCards.length < 2 || bankerCards.length < 2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "請輸入完整的閒家與莊家牌面；雙方至少需要兩張牌。" });
  }
  const currentWinner = winner(playerCards, bankerCards);
  let playerWins = input.playerWins;
  let bankerWins = input.bankerWins;
  let tieCount = input.tieCount;
  if (currentWinner === "閒") playerWins += 1;
  if (currentWinner === "莊") bankerWins += 1;
  if (currentWinner === "和") tieCount += 1;
  const roundNo = Math.max((previous?.roundNo ?? 0) + 1, playerWins + bankerWins + tieCount);
  return {
    tableId: input.tableId,
    roundNo,
    playerWins,
    bankerWins,
    tieCount,
    playerCards,
    bankerCards,
    playerPoint: computePoints(playerCards),
    bankerPoint: computePoints(bankerCards),
    winner: currentWinner,
    playerPair: isPair(playerCards),
    bankerPair: isPair(bankerCards),
    previous: previous ?? null,
  };
}

function formulaMapFromPredictions(formulas: Record<string, string>): FormulaMap {
  return Object.fromEntries(FORMULA_NAMES.map(name => {
    const prediction = normalizePrediction(formulas[name]);
    return [name, { name, value: null, prediction, success: Boolean(prediction), error: prediction ? "" : "無有效預測" }];
  })) as FormulaMap;
}

function resolveNextHit(previousResults: boolean[], prediction: string, nextWinner: string) {
  const normalizedPrediction = normalizePrediction(prediction);
  const normalizedWinner = normalizePrediction(nextWinner);
  if (!normalizedPrediction || !normalizedWinner) return null;
  if (normalizedWinner === "和") return previousResults.at(-1) ?? true;
  return normalizedPrediction === normalizedWinner;
}

function buildHistorySummary(history: Awaited<ReturnType<typeof db.listFormulaHistory>>) {
  return history.map((row, index) => {
    const current = formulaMapFromPredictions(row.formulas);
    const analysis = buildAnalysis(history.slice(0, index + 1), current, row.roundNo);
    const best = chooseBest(analysis, current);
    const nextWinner = normalizePrediction(history[index + 1]?.winner);
    const selected = Object.values(analysis.analysis).find(item => item.formula === best.bestFormula);
    const hit = resolveNextHit(selected?.historyResult ?? [], best.decision, nextWinner);
    return {
      id: row.id,
      roundNo: row.roundNo,
      nextRoundNo: row.roundNo + 1,
      formula: best.bestFormula || "—",
      prediction: best.decision,
      hits: best.hits,
      accuracy: best.accuracy,
      streak: best.streakCount,
      reversed: best.reversed,
      actualWinner: nextWinner,
      status: hit === null ? "pending" as const : hit ? "hit" as const : "miss" as const,
    };
  }).reverse();
}

/**
 * app.py 的歷史表會同時呈現本局輸入／結果、前一局對本局的預測命中，
 * 以及本局計算出的全部公式（供下一局使用）。過去資料只保存預測文字，
 * 因此值欄位以相同 Formula.py 相容計算器依序重算，不更動既有資料表。
 */
export function buildDetailedHistory(history: Awaited<ReturnType<typeof db.listFormulaHistory>>) {
  const statusByRound = history.map(() => new Map<string, "hit" | "miss" | "pending">());
  for (const name of FORMULA_NAMES) {
    const pairs: Array<[unknown, unknown]> = [];
    for (let index = 0; index < history.length - 1; index += 1) {
      pairs.push([history[index]?.formulas[name], history[index + 1]?.winner]);
    }
    const resolved = resolveHitResults(pairs);
    statusByRound[0]?.set(name, "pending");
    for (let index = 1; index < history.length; index += 1) {
      const hit = resolved[index - 1];
      statusByRound[index]?.set(name, hit === undefined ? "pending" : hit ? "hit" : "miss");
    }
  }
  return history.map((row, index) => {
    const previous = history[index - 1] ?? null;
    const results = calculateFormulas({
      ...row,
      playerPair: Boolean(row.playerPair),
      bankerPair: Boolean(row.bankerPair),
      previous,
    });
    const actualWinner = normalizePrediction(row.winner);
    const formulas = FORMULA_NAMES.map(name => {
      const previousPrediction = normalizePrediction(previous?.formulas?.[name]);
      const current = results[name];
      return {
        name,
        value: current.value,
        nextPrediction: current.prediction,
        success: current.success,
        error: current.error,
        previousPrediction,
        status: statusByRound[index]?.get(name) ?? "pending" as const,
      };
    });
    return {
      id: row.id,
      tableId: row.tableId,
      roundNo: row.roundNo,
      playerWins: row.playerWins,
      bankerWins: row.bankerWins,
      tieCount: row.tieCount,
      playerCards: row.playerCards,
      bankerCards: row.bankerCards,
      playerPoint: row.playerPoint,
      bankerPoint: row.bankerPoint,
      winner: actualWinner,
      playerPair: Boolean(row.playerPair),
      bankerPair: Boolean(row.bankerPair),
      formulas,
    };
  }).reverse();
}

export const baccaratRouter = router({
  cards: router({
    list: protectedProcedure.input(paginationInput).query(({ ctx, input }) => db.listCards(ctx.user.id, input)),
    create: protectedProcedure.input(z.object({ card: z.string().trim().min(1).max(2) })).mutation(async ({ ctx, input }) => {
      const card = normalizeCard(input.card);
      if (!validateCard(card)) throw new TRPCError({ code: "BAD_REQUEST", message: "非法牌；請輸入 A、2 至 10、J、Q 或 K。" });
      try {
        await db.createCard({ userId: ctx.user.id, card, numericValue: cardValue(card), baccaratValue: baccaratValue(card) });
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "此卡片已存在。" });
      }
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), card: z.string().trim().min(1).max(2) })).mutation(async ({ ctx, input }) => {
      const card = normalizeCard(input.card);
      if (!validateCard(card)) throw new TRPCError({ code: "BAD_REQUEST", message: "非法牌；請輸入 A、2 至 10、J、Q 或 K。" });
      try {
        await db.updateCard(ctx.user.id, input.id, { card, numericValue: cardValue(card), baccaratValue: baccaratValue(card) });
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "此卡片已存在。" });
      }
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteCard(ctx.user.id, input.id);
      return { success: true };
    }),
  }),
  formulas: router({
    calculateAndStore: protectedProcedure.input(recordInput).mutation(async ({ ctx, input }) => {
      const lastRecord = await db.getLastFormula(ctx.user.id, input.tableId);
      const current = calculateNextRecord(input, lastRecord);
      const previous = await db.getFormulaByRound(ctx.user.id, input.tableId, current.roundNo - 1);
      current.previous = previous ?? null;
      const results = calculateFormulas(current);
      const formulas = formulaPredictions(results);
      await db.insertFormulaRecord({ ...current, userId: ctx.user.id, formulas });

      const events = currentEvents(current);
      if (previous && events.length) {
        const pattern = eventPatternFromPredictions(previous.formulas);
        if (EVENT_FORMULAS.every(name => pattern[name] !== "")) {
          for (const eventName of events) {
            if (!(await db.eventExists(ctx.user.id, eventName, pattern))) {
              await db.insertEventRecord({ userId: ctx.user.id, eventName, tableId: previous.tableId, roundNo: previous.roundNo, ...pattern });
            }
          }
        }
      }

      const history = await db.listFormulaHistory(ctx.user.id, input.tableId);
      const analysis = buildAnalysis(history, results, current.roundNo);
      const best = chooseBest(analysis, results);
      const enabledCustom = await db.listEnabledCustomFormulas(ctx.user.id);
      const customFormulas = enabledCustom.map(formula => ({ id: formula.id, name: formula.name, ...evaluateCustomFormula(formula.rules, current) }));
      const previousPattern = previous ? eventPatternFromPredictions(previous.formulas) : null;
      const matchingRows = previousPattern && EVENT_FORMULAS.every(name => previousPattern[name] !== "") ? await db.findEventsByPattern(ctx.user.id, previousPattern) : [];
      const eventNames = Array.from(new Set(matchingRows.map(row => row.eventName)));
      return { record: history.at(-1), results, analysis, best, customFormulas, event: { matched: eventNames.length > 0, events: eventNames, rows: matchingRows } };
    }),
    supplementHistory: protectedProcedure.input(supplementInput).mutation(async ({ ctx, input }) => {
      const currentRound = input.playerWins + input.bankerWins + input.tieCount;
      if (currentRound <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "目前局數為 0，無需補齊歷史資料。" });
      const history = await db.listFormulaHistory(ctx.user.id, input.tableId);
      const existingRounds = new Set(history.map(row => row.roundNo));
      const roundNo = Array.from({ length: currentRound }, (_, index) => index + 1).find(round => !existingRounds.has(round));
      if (!roundNo) throw new TRPCError({ code: "CONFLICT", message: "此桌歷史資料已完整，無需補登。" });
      await db.insertFormulaRecord({
        userId: ctx.user.id,
        tableId: input.tableId,
        roundNo,
        playerWins: 0,
        bankerWins: 0,
        tieCount: 0,
        playerCards: [],
        bankerCards: [],
        playerPoint: 0,
        bankerPoint: 0,
        winner: input.winner,
        playerPair: input.playerPair,
        bankerPair: input.bankerPair,
        formulas: {},
      });
      return { success: true, roundNo };
    }),
    list: protectedProcedure.input(paginationInput.extend({ tableId: z.string().trim().max(64).optional() })).query(({ ctx, input }) => db.listFormulaRecords(ctx.user.id, input)),
    history: protectedProcedure.input(z.object({ tableId: tableInput })).query(({ ctx, input }) => db.listFormulaHistory(ctx.user.id, input.tableId)),
    historySummary: protectedProcedure.input(z.object({ tableId: tableInput })).query(async ({ ctx, input }) => {
      const history = await db.listFormulaHistory(ctx.user.id, input.tableId);
      return { items: buildHistorySummary(history), total: history.length };
    }),
    historyDetails: protectedProcedure.input(z.object({ tableId: tableInput })).query(async ({ ctx, input }) => {
      const history = await db.listFormulaHistory(ctx.user.id, input.tableId);
      return { items: buildDetailedHistory(history), total: history.length };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteFormulaRecord(ctx.user.id, input.id);
      return { success: true };
    }),
  }),
  customFormulas: router({
    list: protectedProcedure.query(({ ctx }) => db.listCustomFormulas(ctx.user.id)),
    create: protectedProcedure.input(customFormulaInput).mutation(async ({ ctx, input }) => {
      await db.createCustomFormula({ userId: ctx.user.id, name: input.name, rules: input.rules, isEnabled: true });
      return { success: true };
    }),
    setEnabled: protectedProcedure.input(z.object({ id: z.number().int().positive(), isEnabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      await db.updateCustomFormulaEnabled(ctx.user.id, input.id, input.isEnabled);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteCustomFormula(ctx.user.id, input.id);
      return { success: true };
    }),
    preview: protectedProcedure.input(z.object({
      rules: customFormulaRuleSchema,
      playerCards: z.array(z.number().int().min(1).max(13)).min(2).max(3),
      bankerCards: z.array(z.number().int().min(1).max(13)).min(2).max(3),
      playerWins: z.number().int().min(0), bankerWins: z.number().int().min(0), tieCount: z.number().int().min(0), roundNo: z.number().int().min(1),
      previous: z.object({ playerCards: z.array(z.number().int().min(1).max(13)), bankerCards: z.array(z.number().int().min(1).max(13)), playerPoint: z.number().int().min(0).max(9), bankerPoint: z.number().int().min(0).max(9) }).nullable(),
    })).query(({ input }) => {
      const current = {
        tableId: "PREVIEW", roundNo: input.roundNo, playerWins: input.playerWins, bankerWins: input.bankerWins, tieCount: input.tieCount,
        playerCards: input.playerCards, bankerCards: input.bankerCards, playerPoint: computePoints(input.playerCards), bankerPoint: computePoints(input.bankerCards),
        winner: winner(input.playerCards, input.bankerCards), playerPair: isPair(input.playerCards), bankerPair: isPair(input.bankerCards),
        previous: input.previous ? { tableId: "PREVIEW", roundNo: input.roundNo - 1, playerWins: input.playerWins, bankerWins: input.bankerWins, tieCount: input.tieCount, playerCards: input.previous.playerCards, bankerCards: input.previous.bankerCards, playerPoint: input.previous.playerPoint, bankerPoint: input.previous.bankerPoint, winner: "" as const, formulas: {} } : null,
      };
      return evaluateCustomFormula(input.rules, current);
    }),
    defaults: protectedProcedure.query(() => buildDefaultRule()),
  }),
  storage: router({
    formulaList: protectedProcedure.input(paginationInput.extend({ tableId: z.string().trim().max(64).optional() })).query(({ ctx, input }) => db.listFormulaRecords(ctx.user.id, input)),
    eventList: protectedProcedure.input(paginationInput.extend({ tableId: z.string().trim().max(64).optional() })).query(({ ctx, input }) => db.listEvents(ctx.user.id, input)),
    getFormulaByRound: protectedProcedure.input(z.object({ tableId: tableInput, roundNo: z.number().int().min(1) })).query(({ ctx, input }) => db.getFormulaByRound(ctx.user.id, input.tableId, input.roundNo)),
    getFormulaSession: protectedProcedure.input(z.object({ tableId: tableInput, startRound: z.number().int().min(1), endRound: z.number().int().min(1) }).refine(input => input.startRound <= input.endRound, { message: "起始局數不得大於結束局數。" })).query(({ ctx, input }) => db.getFormulaSession(ctx.user.id, input.tableId, input.startRound, input.endRound)),
    getLastFormula: protectedProcedure.input(z.object({ tableId: tableInput })).query(({ ctx, input }) => db.getLastFormula(ctx.user.id, input.tableId)),
    findEventBySixFormulas: protectedProcedure.input(z.object({
      點差: z.enum(["閒", "莊", "和"]),
      理數: z.enum(["閒", "莊", "和"]),
      導數: z.enum(["閒", "莊", "和"]),
      真數: z.enum(["閒", "莊", "和"]),
      HZ: z.enum(["閒", "莊", "和"]),
      價值: z.enum(["閒", "莊", "和"]),
    })).query(({ ctx, input }) => db.findEventsByPattern(ctx.user.id, input)),
    resetFormulaTable: protectedProcedure.input(z.object({ tableId: tableInput })).mutation(async ({ ctx, input }) => {
      await db.resetFormulaTable(ctx.user.id, input.tableId);
      return { success: true };
    }),
    removeEvent: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteEvent(ctx.user.id, input.id);
      return { success: true };
    }),
  }),
  csv: router({
    exportData: protectedProcedure.query(async ({ ctx }) => {
      const [formulas, events] = await Promise.all([db.listAllFormulaRecords(ctx.user.id), db.listAllEvents(ctx.user.id)]);
      const formulaRows = formulas.map(row => ({
        table_id: row.tableId,
        round_no: String(row.roundNo),
        player_wins: String(row.playerWins),
        banker_wins: String(row.bankerWins),
        tie_count: String(row.tieCount),
        player_cards: JSON.stringify(row.playerCards),
        banker_cards: JSON.stringify(row.bankerCards),
        player_point: String(row.playerPoint),
        banker_point: String(row.bankerPoint),
        winner: row.winner,
        formulas: JSON.stringify(row.formulas),
      }));
      const eventRows = events.map(row => ({
        event_name: row.eventName,
        table_id: row.tableId,
        round_no: String(row.roundNo),
        點差: row.點差,
        理數: row.理數,
        導數: row.導數,
        真數: row.真數,
        HZ: row.HZ,
        價值: row.價值,
      }));
      return { formulaCsv: `\uFEFF${csvContent(formulaColumns, formulaRows)}`, eventCsv: `\uFEFF${csvContent(eventColumns, eventRows)}`, formulaCount: formulaRows.length, eventCount: eventRows.length };
    }),
    importData: protectedProcedure.input(z.object({ type: z.enum(["formula", "event"]), csv: z.string().min(1).max(2_000_000) })).mutation(async ({ ctx, input }) => {
      const rows = csvRows(input.csv);
      let imported = 0;
      let skipped = 0;
      if (input.type === "formula") {
        for (const row of rows) {
          requireColumns(row, formulaColumns);
          const tableId = row.table_id.trim().toUpperCase();
          const roundNo = asNonNegativeInt(row.round_no, "round_no");
          if (!tableId || roundNo < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "table_id 與 round_no 必須為有效值。" });
          if (await db.getFormulaByRound(ctx.user.id, tableId, roundNo)) {
            skipped += 1;
            continue;
          }
          const playerCards = parseNumberCards(row.player_cards, "player_cards");
          const bankerCards = parseNumberCards(row.banker_cards, "banker_cards");
          await db.insertFormulaRecord({
            userId: ctx.user.id,
            tableId,
            roundNo,
            playerWins: asNonNegativeInt(row.player_wins, "player_wins"),
            bankerWins: asNonNegativeInt(row.banker_wins, "banker_wins"),
            tieCount: asNonNegativeInt(row.tie_count, "tie_count"),
            playerCards,
            bankerCards,
            playerPoint: asNonNegativeInt(row.player_point, "player_point"),
            bankerPoint: asNonNegativeInt(row.banker_point, "banker_point"),
            winner: normalizePrediction(row.winner),
            playerPair: isPair(playerCards),
            bankerPair: isPair(bankerCards),
            formulas: parseFormulas(row.formulas),
          });
          imported += 1;
        }
      } else {
        for (const row of rows) {
          requireColumns(row, eventColumns);
          const tableId = row.table_id.trim().toUpperCase();
          const eventName = row.event_name.trim();
          const pattern = Object.fromEntries(EVENT_FORMULAS.map(name => [name, row[name].trim()])) as Record<(typeof EVENT_FORMULAS)[number], "閒" | "莊" | "和" | "">;
          if (!tableId || !eventName || EVENT_FORMULAS.some(name => !pattern[name])) throw new TRPCError({ code: "BAD_REQUEST", message: "事件 CSV 的桌號、事件名稱與六項公式皆不得為空白。" });
          if (await db.eventExists(ctx.user.id, eventName, pattern)) {
            skipped += 1;
            continue;
          }
          await db.insertEventRecord({ userId: ctx.user.id, eventName, tableId, roundNo: asNonNegativeInt(row.round_no, "round_no"), ...pattern });
          imported += 1;
        }
      }
      return { imported, skipped };
    }),
  }),
});
