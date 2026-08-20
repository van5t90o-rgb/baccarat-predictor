import { describe, expect, it } from "vitest";
import {
  CARD_VALUES,
  buildAnalysis,
  calculateFormulas,
  chooseBest,
  computePoints,
  currentEvents,
  formulaPredictions,
  isPair,
  normalizeCard,
  resolveHitResults,
  validateCard,
} from "./baccarat";

const sample = {
  tableId: "A01",
  roundNo: 1,
  playerWins: 0,
  bankerWins: 0,
  tieCount: 0,
  playerCards: [1, 2],
  bankerCards: [7, 8],
  playerPoint: 3,
  bankerPoint: 5,
  winner: "莊" as const,
  playerPair: false,
  bankerPair: false,
  previous: null,
};

describe("Card.py 對應規則", () => {
  it("標準化、驗證並保留撲克牌數值映射", () => {
    expect(normalizeCard(" q ")).toBe("Q");
    expect(validateCard("A")).toBe(true);
    expect(validateCard("11")).toBe(false);
    expect(CARD_VALUES.K).toBe(13);
  });

  it("以百家樂規則計算點數與對子", () => {
    expect(computePoints([1, 10, 5])).toBe(6);
    expect(isPair([12, 12])).toBe(true);
    expect(isPair([12])).toBe(false);
  });
});

describe("Formula.py 對應規則", () => {
  it("計算全部十八項公式，並回傳與原始結構一致的結果", () => {
    const results = calculateFormulas(sample);
    expect(Object.keys(results)).toHaveLength(18);
    expect(results.點差).toMatchObject({ name: "點差", value: 14, prediction: "閒", success: true });
    expect(results.導數.success).toBe(true);
    expect(results.陰陽.success).toBe(true);
  });

  it("將和局的命中判定延續上一筆命中狀態", () => {
    expect(resolveHitResults([["閒", "閒"], ["莊", "和"], ["莊", "莊"]])).toEqual([true, true, true]);
  });

  it("只依原始事件規則產生對子、和局與莊六事件", () => {
    expect(currentEvents({ ...sample, playerPair: true, bankerPoint: 6, winner: "莊" })).toEqual(["對子", "莊6"]);
  });

  it("與 Formula.py 六局參考向量逐項一致，包含十八項公式與最佳公式決策", () => {
    const vectors = [
      { roundNo: 1, playerWins: 1, bankerWins: 0, cards: [[1, 2], [7, 8]], points: [3, 5], winner: "莊", signature: "正EV:0:和:true:|真數:50:閒:true:|導數:3:閒:true:|實數:-0.08:莊:true:|理數:-6.9:閒:true:|HZ:-1:莊:true:|點差:14:閒:true:|價值:0.8:閒:true:|積分:-5.14:莊:true:|EA:-1.6:莊:true:|VP:-1:莊:true:|HD:2.1:閒:true:|TP:-1.5:莊:true:|AP:-0.2:莊:true:|和計:3:閒:true:|機率:5:莊:true:|差額:2:閒:true:|陰陽:9:閒:true:", best: { decision: "閒", bestFormula: "差額", streakType: "", streakCount: 0, hits: 0, accuracy: 0, analysisTotal: 0, reversed: false, reason: "分析筆數不足5_無歷史連勝連敗_直接使用公式17" } },
      { roundNo: 2, playerWins: 1, bankerWins: 1, cards: [[8, 9], [1, 2]], points: [7, 3], winner: "閒", signature: "正EV:0:和:true:|真數:0:和:true:|導數:5.5:閒:true:|實數:0.93:閒:true:|理數:-12.9:閒:true:|HZ:0:和:true:|點差:-7:莊:true:|價值:-2.4:莊:true:|積分:13.81:閒:true:|EA:0.8:閒:true:|VP:1.17:閒:true:|HD:-1.8:莊:true:|TP:-0.4:莊:true:|AP:0:和:true:|和計:-5:莊:true:|機率:5:莊:true:|差額:4:閒:true:|陰陽:8:閒:true:", best: { decision: "閒", bestFormula: "差額", streakType: "", streakCount: 0, hits: 1, accuracy: 100, analysisTotal: 1, reversed: false, reason: "分析筆數不足5_無歷史連勝連敗_直接使用公式17" } },
      { roundNo: 3, playerWins: 2, bankerWins: 1, cards: [[6, 6], [4, 5]], points: [2, 9], winner: "莊", signature: "正EV:-2:莊:true:|真數:50:閒:true:|導數:-1:莊:true:|實數:-0.43:莊:true:|理數:17:莊:true:|HZ:-8:莊:true:|點差:-7:莊:true:|價值:-0.8:莊:true:|積分:-5.24:莊:true:|EA:-4.8:莊:true:|VP:2.15:閒:true:|HD:5.95:閒:true:|TP:-2.67:莊:true:|AP:0.6:閒:true:|和計:-4:莊:true:|機率:2:莊:true:|差額:7:閒:true:|陰陽:1:莊:true:", best: { decision: "閒", bestFormula: "差額", streakType: "single_jump", streakCount: 2, hits: 1, accuracy: 50, analysisTotal: 2, reversed: false, reason: "分析筆數不足5_無歷史連勝連敗_直接使用公式17" } },
      { roundNo: 4, playerWins: 3, bankerWins: 1, cards: [[1, 9], [2, 3]], points: [0, 5], winner: "莊", signature: "正EV:-1:莊:true:|真數:25:閒:true:|導數:4:閒:true:|實數:1.98:閒:true:|理數:-12.7:閒:true:|HZ:-13:莊:true:|點差:11:閒:true:|價值:0.5:閒:true:|積分:20:閒:true:|EA:-3.6:莊:true:|VP:0.81:閒:true:|HD:-5.75:莊:true:|TP:6.6:閒:true:|AP:-2.1:莊:true:|和計:0:和:true:|機率:1:莊:true:|差額:5:莊:true:|陰陽:4:莊:true:", best: { decision: "閒", bestFormula: "差額", streakType: "loss", streakCount: 2, hits: 1, accuracy: 33.33, analysisTotal: 3, reversed: true, reason: "分析筆數不足5_公式17目前連敗反打" } },
      { roundNo: 5, playerWins: 3, bankerWins: 2, cards: [[7, 7], [9, 9]], points: [4, 8], winner: "莊", signature: "正EV:-2:莊:true:|真數:-33.33:莊:true:|導數:0.8:閒:true:|實數:1.39:閒:true:|理數:5.2:莊:true:|HZ:-2:莊:true:|點差:1:閒:true:|價值:4:閒:true:|積分:-17.5:莊:true:|EA:-1.6:莊:true:|VP:0.51:閒:true:|HD:-0.3:莊:true:|TP:-2:莊:true:|AP:-6.4:莊:true:|和計:-3:莊:true:|機率:1:莊:true:|差額:4:閒:true:|陰陽:4:莊:true:", best: { decision: "閒", bestFormula: "差額", streakType: "one_win_two_loss", streakCount: 3, hits: 2, accuracy: 50, analysisTotal: 4, reversed: false, reason: "分析筆數不足5_無歷史連勝連敗_直接使用公式17" } },
      { roundNo: 6, playerWins: 3, bankerWins: 3, cards: [[4, 5], [1, 8]], points: [9, 9], winner: "和", signature: "正EV:2:閒:true:|真數:25:閒:true:|導數:1:閒:true:|實數:-0.18:莊:true:|理數:7.2:莊:true:|HZ:13:閒:true:|點差:-3:莊:true:|價值:0:和:true:|積分:-26.66:莊:true:|EA:0:和:true:|VP:-0.51:莊:true:|HD:0:和:true:|TP:-4.6:莊:true:|AP:0:和:true:|和計:3:閒:true:|機率:3:莊:true:|差額:0:閒:true:|陰陽:6:閒:true:", best: { decision: "閒", bestFormula: "VP", streakType: "loss", streakCount: 5, hits: 0, accuracy: 0, analysisTotal: 5, reversed: true, reason: "唯一最高連續" } },
    ] as const;
    const history: Parameters<typeof buildAnalysis>[0] = [];
    for (const vector of vectors) {
      const [playerCards, bankerCards] = vector.cards;
      const [playerPoint, bankerPoint] = vector.points;
      const current = { tableId: "A01", roundNo: vector.roundNo, playerWins: vector.playerWins, bankerWins: vector.bankerWins, tieCount: 0, playerCards, bankerCards, playerPoint, bankerPoint, winner: vector.winner, playerPair: false, bankerPair: false, previous: history.at(-1) ?? null };
      const results = calculateFormulas(current);
      const signature = Object.entries(results).map(([name, result]) => `${name}:${result.value}:${result.prediction}:${result.success}:${result.error}`).join("|");
      expect(signature).toBe(vector.signature);
      history.push({ id: vector.roundNo, tableId: "A01", roundNo: vector.roundNo, playerWins: vector.playerWins, bankerWins: vector.bankerWins, tieCount: 0, playerCards, bankerCards, playerPoint, bankerPoint, winner: vector.winner, formulas: formulaPredictions(results) });
      expect(chooseBest(buildAnalysis(history, results, vector.roundNo), results)).toEqual(vector.best);
    }
  });
});
