// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  resetMutate: vi.fn(),
  calculateMutate: vi.fn(),
  supplementMutate: vi.fn(),
  mutationOptions: undefined as undefined | { onSuccess?: () => void },
}));

vi.mock("wouter", () => ({ useLocation: () => [window.location.pathname, mocks.navigate] }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ baccarat: { formulas: { history: { invalidate: vi.fn() }, historySummary: { invalidate: vi.fn() }, historyDetails: { invalidate: vi.fn() }, list: { invalidate: vi.fn() } }, storage: { formulaList: { invalidate: vi.fn() }, eventList: { invalidate: vi.fn() } } } }),
    baccarat: {
      formulas: {
        history: { useQuery: () => ({ data: [], isLoading: false }) },
        historySummary: { useQuery: () => ({ data: { items: [] }, isLoading: false }) },
        historyDetails: { useQuery: () => ({ data: { items: [{ id: 1, tableId: "A01", roundNo: 6, playerWins: 3, bankerWins: 3, tieCount: 0, playerCards: [4, 5], bankerCards: [1, 8], playerPoint: 9, bankerPoint: 9, winner: "和", playerPair: false, bankerPair: false, formulas: [{ name: "VP", value: 0.25, nextPrediction: "閒", success: true, error: "", previousPrediction: "莊", status: "miss" }] }] }, isLoading: false }) },
        calculateAndStore: {
          useMutation: (options: { onSuccess?: (data: unknown) => void }) => ({
            mutate: (input: unknown) => {
              mocks.calculateMutate(input);
              options.onSuccess?.({
                record: { tableId: "A01", roundNo: 6, playerWins: 3, bankerWins: 3, tieCount: 0, playerCards: [4, 5], bankerCards: [1, 8], playerPoint: 9, bankerPoint: 9, winner: "和", formulas: {} },
                results: {},
                analysis: {},
                best: { decision: "閒", bestFormula: "VP", streakType: "loss", streakCount: 5, hits: 0, accuracy: 0, analysisTotal: 5, reversed: true, reason: "唯一最高連續" },
                customFormulas: [{ id: 18, name: "閒點加權", prediction: "閒", value: 6, expression: "閒點數權重=6", breakdown: [] }],
                event: { matched: true, events: ["莊6"], rows: [] },
              });
            },
            isPending: false,
          }),
        },
        supplementHistory: {
          useMutation: (options: { onSuccess?: (data: unknown) => void }) => ({
            mutate: (input: unknown) => {
              mocks.supplementMutate(input);
              options.onSuccess?.({ success: true, roundNo: 1 });
            },
            isPending: false,
          }),
        },
      },
      storage: {
        resetFormulaTable: {
          useMutation: (options: { onSuccess?: () => void }) => {
            mocks.mutationOptions = options;
            return { isPending: false, mutate: (input: unknown) => { mocks.resetMutate(input); options.onSuccess?.(); } };
          },
        },
      },
    },
  },
}));

import AnalysisPage from "./AnalysisPage";
import Home from "./Home";

describe("桌局設定與分析頁流程", () => {
  beforeEach(() => { mocks.navigate.mockReset(); mocks.resetMutate.mockReset(); mocks.calculateMutate.mockReset(); mocks.supplementMutate.mockReset(); window.history.pushState({}, "", "/"); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("確認桌局設定後導向分析頁並帶入桌號、閒勝、莊勝與和局數", () => {
    render(<Home />);
    fireEvent.change(screen.getByPlaceholderText("例如 A01"), { target: { value: "a01" } });
    const counters = screen.getAllByRole("spinbutton");
    fireEvent.change(counters[0], { target: { value: "3" } });
    fireEvent.change(counters[1], { target: { value: "2" } });
    fireEvent.change(counters[2], { target: { value: "1" } });
    fireEvent.click(screen.getByText("確認並進入分析"));
    expect(mocks.navigate).toHaveBeenCalledWith("/analysis?table=A01&playerWins=3&bankerWins=2&tieCount=1");
  });

  it("返回時只呼叫指定桌號的公式紀錄清除並導回設定頁", () => {
    window.history.pushState({}, "", "/analysis?table=A01&playerWins=3&bankerWins=2&tieCount=1");
    render(<AnalysisPage />);
    fireEvent.click(screen.getByText("返回並清除公式紀錄"));
    expect(mocks.resetMutate).toHaveBeenCalledWith({ tableId: "A01" });
    expect(mocks.navigate).toHaveBeenCalledWith("/");
  });

  it("確認本局後只顯示下一局預測與符合的事件預警，並隱藏補齊和冗餘分析文字", () => {
    window.history.pushState({}, "", "/analysis?table=A01&playerWins=3&bankerWins=2&tieCount=0");
    render(<AnalysisPage />);
    const cards = screen.getAllByPlaceholderText(/牌 [1-3]/);
    ["4", "5", "", "A", "8", ""].forEach((value, index) => fireEvent.change(cards[index], { target: { value } }));
    fireEvent.click(screen.getByText("確認並儲存"));
    expect(mocks.calculateMutate).toHaveBeenCalledWith(expect.objectContaining({ tableId: "A01", playerWins: 3, bankerWins: 2, tieCount: 0, playerCards: ["4", "5", ""], bankerCards: ["A", "8", ""] }));
    expect(screen.getAllByText("閒").length).toBeGreaterThan(0);
    expect(screen.queryByText(/依 app\.py 流程輸入閒、莊牌面/)).toBeNull();
    expect(screen.queryByText("補齊歷史資料")).toBeNull();
    expect(screen.queryByText("最佳公式：VP（反打）")).toBeNull();
    expect(screen.queryByText("唯一最高連續")).toBeNull();
    expect(screen.queryByText("分析局數 5")).toBeNull();
    expect(screen.queryByText("目前沒有符合的歷史事件模式。")).toBeNull();
    expect(screen.getByText("偵測到事件：莊6")).toBeTruthy();
    expect(screen.getByText("本局自訂公式預測")).toBeTruthy();
    expect(screen.getByText("閒點加權")).toBeTruthy();
    expect(screen.getByText("歷史資料")).toBeTruthy();
    expect(screen.getAllByText("公式1").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("歷史資料公式預測表")).toBeTruthy();
    expect(screen.getByText(/下一局 · 第 7 局預測/)).toBeTruthy();
    expect(screen.getByText("已完成局數命中")).toBeTruthy();
    expect(screen.queryByText("歷史資料表格")).toBeNull();
  });
});
