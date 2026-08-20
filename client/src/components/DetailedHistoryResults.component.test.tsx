// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { DetailedHistoryResults, type DetailedFormula, type DetailedHistoryRow } from "./DetailedHistoryResults";

const formulaNames = ["正EV", "真數", "導數", "實數", "理數", "HZ", "點差", "價值", "積分", "EA", "VP", "HD", "TP", "AP", "和計", "機率", "差額", "陰陽"];
const makeFormula = (name: string, prediction: "閒" | "莊" | "和", status: DetailedFormula["status"]): DetailedFormula => ({ name, value: 1.5, nextPrediction: prediction, previousPrediction: prediction, success: true, error: "", status });
const makeRow = (roundNo: number, winner: "閒" | "莊" | "和"): DetailedHistoryRow => ({ id: roundNo, tableId: "A01", roundNo, playerWins: 3, bankerWins: 2, tieCount: 1, playerCards: [1, 11, 6], bankerCards: [7, 2, 13], playerPoint: 7, bankerPoint: 9, winner, playerPair: false, bankerPair: false, formulas: formulaNames.map((name, index) => makeFormula(name, index % 3 === 0 ? "莊" : index % 3 === 1 ? "閒" : "和", index === 0 ? "hit" : "miss")) });

describe("示意圖相容的歷史資料表格", () => {
  it("以固定欄位順序呈現開牌、十八項公式、下一局預測與命中數", () => {
    render(<DetailedHistoryResults items={[makeRow(6, "莊"), makeRow(5, "閒")]} loading={false} />);
    const table = screen.getByLabelText("歷史資料公式預測表");
    expect(within(table).getByText("局數")).toBeTruthy();
    expect(within(table).getByText("閒1")).toBeTruthy();
    expect(within(table).getByText("莊3")).toBeTruthy();
    formulaNames.forEach(name => expect(within(table).getAllByText(name).length).toBeGreaterThan(0));
    expect(within(table).getByText(/下一局 · 第 7 局預測/)).toBeTruthy();
    expect(screen.getByTestId("next-prediction-row").textContent).toContain("僅預測，不計入命中");
    expect(within(table).getByText("已完成局數命中")).toBeTruthy();
    const nextCell = screen.getAllByTestId("next-prediction-cell")[0];
    expect(nextCell?.className).toContain("bg-[#F9FBFD]");
    expect(nextCell?.className).not.toContain("bg-[#F10B0B]");
    expect(within(table).getAllByText("A").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("J").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("莊")[1]?.className).toContain("bg-[#F10B0B]");
  });
});
