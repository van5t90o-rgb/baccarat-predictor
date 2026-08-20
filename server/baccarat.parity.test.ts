import { describe, expect, it } from "vitest";
import { buildAnalysis, calculateFormulas, chooseBest, computePoints, currentEvents, type CalculationInput } from "./baccarat";

const firstRound: CalculationInput = {
  tableId: "A01", roundNo: 1, playerWins: 0, bankerWins: 1, tieCount: 0,
  playerCards: [1, 2, 10], bankerCards: [8, 9, 13], playerPoint: 3, bankerPoint: 7,
  winner: "莊", playerPair: false, bankerPair: false, previous: null,
};

const previous = {
  tableId: "A01", roundNo: 1, playerWins: 0, bankerWins: 1, tieCount: 0,
  playerCards: [1, 2], bankerCards: [8, 9], playerPoint: 3, bankerPoint: 7,
  winner: "莊" as const, formulas: {},
};

const withPrevious: CalculationInput = {
  tableId: "A01", roundNo: 2, playerWins: 1, bankerWins: 1, tieCount: 0,
  playerCards: [6, 7, 11], bankerCards: [3, 4, 5], playerPoint: 3, bankerPoint: 2,
  winner: "閒", playerPair: false, bankerPair: false, previous,
};

describe("Card.py / Base.py / Formula.py 相容性", () => {
  it("依 Card.py 計算 A 至 K 的百家樂點數與結果", () => {
    expect(computePoints([1, 2, 10, 11, 12, 13])).toBe(3);
    expect(computePoints([8, 9, 13])).toBe(7);
  });

  it("第一局所有十八項公式的值與預測均與 Formula.py 基準一致", () => {
    const results = calculateFormulas(firstRound);
    expect(Object.fromEntries(Object.entries(results).map(([name, result]) => [name, [result.value, result.prediction]]))).toEqual({
      正EV: [-1, "莊"], 真數: [25, "閒"], 導數: [11, "閒"], 實數: [0.92, "閒"], 理數: [-2.9000000000000004, "閒"], HZ: [0, "和"], 點差: [15, "閒"], 價值: [2.4, "閒"], 積分: [-23.33, "莊"], EA: [-0.8, "莊"], VP: [0.05, "閒"], HD: [3.6, "閒"], TP: [0, "和"], AP: [0, "和"], 和計: [-5, "莊"], 機率: [5, "莊"], 差額: [4, "閒"], 陰陽: [10, "閒"],
    });
  });

  it("具前局資料時，TP、差額與所有公式均依 Formula.py 使用前局點數", () => {
    const results = calculateFormulas(withPrevious);
    expect(Object.fromEntries(Object.entries(results).map(([name, result]) => [name, [result.value, result.prediction]]))).toEqual({
      正EV: [-3, "莊"], 真數: [0, "和"], 導數: [0, "和"], 實數: [0.25, "閒"], 理數: [16, "莊"], HZ: [-6, "莊"], 點差: [-11, "莊"], 價值: [0, "和"], 積分: [11.42, "閒"], EA: [0, "和"], VP: [3.1, "閒"], HD: [1.35, "閒"], TP: [5, "閒"], AP: [0, "和"], 和計: [0, "和"], 機率: [3, "莊"], 差額: [1, "閒"], 陰陽: [0, "閒"],
    });
  });

  it("分析局數不足五局時，最佳公式依 Formula.py 使用差額並保留事件觸發條件", () => {
    const results = calculateFormulas(firstRound);
    const best = chooseBest(buildAnalysis([], results, 1), results);
    expect(best).toMatchObject({ bestFormula: "差額", decision: "閒", reason: "分析筆數不足5_無歷史連勝連敗_直接使用公式17" });
    expect(currentEvents({ ...firstRound, playerPair: true, bankerPair: false })).toEqual(["對子"]);
    expect(currentEvents({ ...firstRound, winner: "和", playerPair: false, bankerPair: false })).toEqual(["和局"]);
    expect(currentEvents({ ...firstRound, winner: "莊", bankerPoint: 6, playerPair: false, bankerPair: false })).toEqual(["莊6"]);
  });
});
