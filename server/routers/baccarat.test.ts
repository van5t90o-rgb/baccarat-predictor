import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  createCard: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
  listCards: vi.fn(),
  getLastFormula: vi.fn(),
  insertFormulaRecord: vi.fn(),
  listFormulaHistory: vi.fn(),
  getFormulaByRound: vi.fn(),
  listFormulaRecords: vi.fn(),
  deleteFormulaRecord: vi.fn(),
  listEvents: vi.fn(),
  deleteEvent: vi.fn(),
  getFormulaSession: vi.fn(),
  findEventsByPattern: vi.fn(),
  resetFormulaTable: vi.fn(),
  eventExists: vi.fn(),
  insertEventRecord: vi.fn(),
  listAllFormulaRecords: vi.fn(),
  listAllEvents: vi.fn(),
  listEnabledCustomFormulas: vi.fn(),
  listCustomFormulas: vi.fn(),
  createCustomFormula: vi.fn(),
  updateCustomFormulaEnabled: vi.fn(),
  deleteCustomFormula: vi.fn(),
}));

import * as db from "../db";
import { buildDefaultRule } from "../customFormula";
import { baccaratRouter } from "./baccarat";

const ctx = {
  user: { id: 7, openId: "test-user", name: "Test User", email: null, loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as never,
  res: {} as never,
};

describe("baccarat tRPC API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getLastFormula).mockResolvedValue(undefined);
    vi.mocked(db.listFormulaHistory).mockResolvedValue([]);
    vi.mocked(db.findEventsByPattern).mockResolvedValue([]);
    vi.mocked(db.eventExists).mockResolvedValue(false);
    vi.mocked(db.listEnabledCustomFormulas).mockResolvedValue([]);
  });

  it("以 Card.py 標準化的數值建立卡片", async () => {
    const caller = baccaratRouter.createCaller(ctx);
    await expect(caller.cards.create({ card: " q " })).resolves.toEqual({ success: true });
    expect(db.createCard).toHaveBeenCalledWith({ userId: 7, card: "Q", numericValue: 12, baccaratValue: 0 });
  });

  it("拒絕不符合 Card.py 的非法牌面", async () => {
    const caller = baccaratRouter.createCaller(ctx);
    await expect(caller.cards.create({ card: "14" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("計算並以原始公式資料結構存入下一局紀錄", async () => {
    const caller = baccaratRouter.createCaller(ctx);
    const response = await caller.formulas.calculateAndStore({ tableId: "a01", playerWins: 0, bankerWins: 0, tieCount: 0, playerCards: ["A", "2"], bankerCards: ["8", "9"] });
    expect(response.best.bestFormula).toBe("差額");
    expect(db.insertFormulaRecord).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, tableId: "A01", roundNo: 1, playerCards: [1, 2], bankerCards: [8, 9], winner: "莊", formulas: expect.objectContaining({ 點差: expect.any(String), 差額: expect.any(String) }) }));
  });

  it("遇到缺少前一局時，依 Formula.py 不套用較早的最後一筆資料", async () => {
    vi.mocked(db.getLastFormula).mockResolvedValue({ id: 3, tableId: "A01", roundNo: 3, playerWins: 2, bankerWins: 1, tieCount: 0, playerCards: [9, 9], bankerCards: [1, 1], playerPoint: 8, bankerPoint: 2, winner: "閒", formulas: { 差額: "莊" } });
    vi.mocked(db.getFormulaByRound).mockResolvedValue(undefined);
    const caller = baccaratRouter.createCaller(ctx);
    await caller.formulas.calculateAndStore({ tableId: "A01", playerWins: 2, bankerWins: 2, tieCount: 0, playerCards: ["A", "2"], bankerCards: ["8", "9"] });
    expect(db.getFormulaByRound).toHaveBeenCalledWith(7, "A01", 4);
    expect(db.insertFormulaRecord).toHaveBeenCalledWith(expect.objectContaining({ roundNo: 5, formulas: expect.objectContaining({ 差額: "閒" }) }));
  });

  it("匯出符合 CsvManager 欄位順序與 formulas JSON 規則的 CSV", async () => {
    vi.mocked(db.listAllFormulaRecords).mockResolvedValue([{ tableId: "A01", roundNo: 1, playerWins: 0, bankerWins: 1, tieCount: 0, playerCards: [1, 2], bankerCards: [8, 9], playerPoint: 3, bankerPoint: 7, winner: "莊", formulas: { 點差: "閒" } }]);
    vi.mocked(db.listAllEvents).mockResolvedValue([]);
    const caller = baccaratRouter.createCaller(ctx);
    const exported = await caller.csv.exportData();
    expect(exported.formulaCsv).toContain("table_id,round_no,player_wins,banker_wins,tie_count,player_cards,banker_cards,player_point,banker_point,winner,formulas");
    expect(exported.formulaCsv).toContain('"{""點差"":""閒""}"');
    expect(exported.formulaCount).toBe(1);
  });

  it("解析 CsvManager 公式 CSV 並保留來源 winner 與 formulas 欄位值", async () => {
    vi.mocked(db.getFormulaByRound).mockResolvedValue(undefined);
    const csv = [
      "table_id,round_no,player_wins,banker_wins,tie_count,player_cards,banker_cards,player_point,banker_point,winner,formulas",
      'A01,3,1,1,1,"[1,2]","[8,9]",3,7,閒,"{""點差"":""莊""}"',
    ].join("\r\n");
    const caller = baccaratRouter.createCaller(ctx);
    await expect(caller.csv.importData({ type: "formula", csv })).resolves.toEqual({ imported: 1, skipped: 0 });
    expect(db.insertFormulaRecord).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, tableId: "A01", roundNo: 3, winner: "閒", formulas: { 點差: "莊" } }));
  });

  it("依 Storage.py 介面查詢指定桌號的局數區間", async () => {
    vi.mocked(db.getFormulaSession).mockResolvedValue([]);
    const caller = baccaratRouter.createCaller(ctx);
    await expect(caller.storage.getFormulaSession({ tableId: "a01", startRound: 2, endRound: 5 })).resolves.toEqual([]);
    expect(db.getFormulaSession).toHaveBeenCalledWith(7, "A01", 2, 5);
  });

  it("依 app.py 規則補齊目前桌最早缺少的歷史局並保存對子標記", async () => {
    vi.mocked(db.listFormulaHistory).mockResolvedValue([
      { id: 1, tableId: "A01", roundNo: 1, playerWins: 1, bankerWins: 0, tieCount: 0, playerCards: [1, 2], bankerCards: [8, 9], playerPoint: 3, bankerPoint: 7, winner: "莊", formulas: {} },
      { id: 3, tableId: "A01", roundNo: 3, playerWins: 1, bankerWins: 1, tieCount: 1, playerCards: [], bankerCards: [], playerPoint: 0, bankerPoint: 0, winner: "和", formulas: {} },
    ]);
    const caller = baccaratRouter.createCaller(ctx);
    await expect(caller.formulas.supplementHistory({ tableId: "a01", playerWins: 1, bankerWins: 1, tieCount: 1, winner: "閒", playerPair: true, bankerPair: false })).resolves.toEqual({ success: true, roundNo: 2 });
    expect(db.insertFormulaRecord).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, tableId: "A01", roundNo: 2, playerCards: [], bankerCards: [], winner: "閒", playerPair: true, bankerPair: false, formulas: {} }));
  });

  it("在 app.py 定義的局數皆已有資料時拒絕補登", async () => {
    vi.mocked(db.listFormulaHistory).mockResolvedValue([{ id: 1, tableId: "A01", roundNo: 1, playerWins: 1, bankerWins: 0, tieCount: 0, playerCards: [], bankerCards: [], playerPoint: 0, bankerPoint: 0, winner: "閒", formulas: {} }]);
    const caller = baccaratRouter.createCaller(ctx);
    await expect(caller.formulas.supplementHistory({ tableId: "a01", playerWins: 1, bankerWins: 0, tieCount: 0, winner: "莊", playerPair: false, bankerPair: false })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("依 app.py 規則建立下一局預測與命中狀態的歷程摘要", async () => {
    vi.mocked(db.listFormulaHistory).mockResolvedValue([
      { id: 1, tableId: "A01", roundNo: 1, playerWins: 1, bankerWins: 0, tieCount: 0, playerCards: [1, 2], bankerCards: [8, 9], playerPoint: 3, bankerPoint: 7, winner: "莊", formulas: { 差額: "莊" } },
      { id: 2, tableId: "A01", roundNo: 2, playerWins: 1, bankerWins: 1, tieCount: 0, playerCards: [8, 9], bankerCards: [1, 2], playerPoint: 7, bankerPoint: 3, winner: "閒", formulas: { 差額: "莊" } },
    ]);
    const caller = baccaratRouter.createCaller(ctx);
    const response = await caller.formulas.historySummary({ tableId: "a01" });
    expect(response.total).toBe(2);
    expect(response.items).toHaveLength(2);
    expect(response.items[0]).toMatchObject({ roundNo: 2, nextRoundNo: 3, formula: "差額", prediction: "莊", hits: expect.any(Number), status: "pending" });
    expect(response.items[1]).toMatchObject({ roundNo: 1, nextRoundNo: 2, formula: "差額", prediction: "莊", actualWinner: "閒", status: "miss" });
  });

  it("完整提供超過十二筆的歷程資料，供前端固定列數視窗自動捲動", async () => {
    vi.mocked(db.listFormulaHistory).mockResolvedValue(Array.from({ length: 13 }, (_, index) => ({
      id: index + 1, tableId: "A01", roundNo: index + 1, playerWins: index + 1, bankerWins: index, tieCount: 0,
      playerCards: [1, 2], bankerCards: [8, 9], playerPoint: 3, bankerPoint: 7, winner: index % 2 === 0 ? "閒" : "莊",
      formulas: { 差額: index % 2 === 0 ? "莊" : "閒" },
    })));
    const caller = baccaratRouter.createCaller(ctx);
    const response = await caller.formulas.historySummary({ tableId: "A01" });
    expect(response.total).toBe(13);
    expect(response.items).toHaveLength(13);
    expect(response.items[0]).toMatchObject({ roundNo: 13, status: "pending" });
    expect(response.items.slice(1).every(item => item.status === "hit")).toBe(true);
  });

  it("返回桌局設定時僅清除指定桌號的公式紀錄，不刪除事件紀錄", async () => {
    const caller = baccaratRouter.createCaller(ctx);
    await expect(caller.storage.resetFormulaTable({ tableId: "a01" })).resolves.toEqual({ success: true });
    expect(db.resetFormulaTable).toHaveBeenCalledWith(7, "A01");
    expect(db.deleteEvent).not.toHaveBeenCalled();
  });

  it("建立自訂公式時以使用者識別保存白名單規則資料", async () => {
    const caller = baccaratRouter.createCaller(ctx);
    const rule = await caller.customFormulas.defaults();
    await expect(caller.customFormulas.create({ name: "前局差額", rules: rule })).resolves.toEqual({ success: true });
    expect(db.createCustomFormula).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, name: "前局差額", isEnabled: true, rules: expect.objectContaining({ version: 1 }) }));
  });

  it("提供自訂公式啟用切換與刪除操作", async () => {
    const caller = baccaratRouter.createCaller(ctx);
    await caller.customFormulas.setEnabled({ id: 4, isEnabled: false });
    await caller.customFormulas.remove({ id: 4 });
    expect(db.updateCustomFormulaEnabled).toHaveBeenCalledWith(7, 4, false);
    expect(db.deleteCustomFormula).toHaveBeenCalledWith(7, 4);
  });

  it("預覽自訂公式時正確處理乘除鏈與白名單的本局牌面來源", async () => {
    const caller = baccaratRouter.createCaller(ctx);
    const rule = await caller.customFormulas.defaults();
    rule.playerCard.enabled = false;
    rule.bankerCard.enabled = false;
    rule.playerPoint.enabled = true;
    rule.playerPoint.operation = "*";
    rule.playerPoint.weights = { ...rule.playerPoint.weights, "3": 4 };
    rule.bankerPoint.enabled = true;
    rule.bankerPoint.operation = "/";
    rule.bankerPoint.weights = { ...rule.bankerPoint.weights, "7": 2 };
    await expect(caller.customFormulas.preview({ rules: rule, playerCards: [1, 2], bankerCards: [3, 4], playerWins: 0, bankerWins: 0, tieCount: 0, roundNo: 1, previous: null })).resolves.toMatchObject({ value: 2, prediction: "閒" });
  });

  it("完成本局分析時一併計算所有啟用中的自訂公式", async () => {
    const rule = buildDefaultRule();
    rule.playerCard.enabled = false;
    rule.bankerCard.enabled = false;
    rule.playerPoint.enabled = true;
    rule.playerPoint.weights = { ...rule.playerPoint.weights, "3": 6 };
    vi.mocked(db.listEnabledCustomFormulas).mockResolvedValue([{ id: 18, userId: 7, name: "閒點加權", rules: rule, isEnabled: true, createdAt: new Date(), updatedAt: new Date() }] as never);
    const caller = baccaratRouter.createCaller(ctx);
    const response = await caller.formulas.calculateAndStore({ tableId: "a01", playerWins: 0, bankerWins: 0, tieCount: 0, playerCards: ["A", "2"], bankerCards: ["8", "9"] });
    expect(response.customFormulas).toEqual([expect.objectContaining({ id: 18, name: "閒點加權", value: 6, prediction: "閒" })]);
  });
});
