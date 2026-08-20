import { describe, expect, it } from "vitest";
import { buildDefaultRule, evaluateCustomFormula } from "./customFormula";
import type { CalculationInput } from "./baccarat";

const current: CalculationInput = {
  tableId: "A01", roundNo: 6, playerWins: 3, bankerWins: 2, tieCount: 0,
  playerCards: [1, 2, 11], bankerCards: [13, 8], playerPoint: 3, bankerPoint: 8,
  winner: "閒", playerPair: false, bankerPair: false,
  previous: { tableId: "A01", roundNo: 5, playerWins: 2, bankerWins: 2, tieCount: 0, playerCards: [4, 12, 9], bankerCards: [7, 1, 3], playerPoint: 2, bankerPoint: 8, winner: "莊", formulas: {} },
};

describe("自訂公式安全運算器", () => {
  it("依閒、莊各自牌面權重與加減運算產生三態預測", () => {
    const rule = buildDefaultRule();
    rule.playerCardWeights = { ...rule.playerCardWeights, "1": 3, "2": 2, "11": 1 };
    rule.bankerCardWeights = { ...rule.bankerCardWeights, "13": 4, "8": 2 };
    const result = evaluateCustomFormula(rule, current);
    expect(result.value).toBe(0);
    expect(result.prediction).toBe("和");
    expect(result.breakdown).toEqual(expect.arrayContaining([{ label: "閒方牌面加權", value: 6 }, { label: "莊方牌面加權", value: 6 }]));
  });

  it("支援共用牌面權重與指定牌位，不混用閒莊獨立權重", () => {
    const rule = buildDefaultRule();
    rule.cardWeightMode = "shared";
    rule.sharedCardWeights = { ...rule.sharedCardWeights, "1": 5, "13": 1 };
    rule.playerCard.position = 1;
    rule.bankerCard.position = 1;
    const result = evaluateCustomFormula(rule, current);
    expect(result.value).toBe(4);
    expect(result.prediction).toBe("閒");
  });

  it("以兩個前局來源相減後取絕對差額並加入總值", () => {
    const rule = buildDefaultRule();
    rule.playerCard.enabled = false;
    rule.bankerCard.enabled = false;
    rule.previousExpressions = [{ enabled: true, left: { side: "player", kind: "point" }, operator: "-", right: { side: "banker", kind: "point" }, absolute: true, operation: "+", coefficient: 0.5 }];
    const result = evaluateCustomFormula(rule, current);
    expect(result.value).toBe(3);
    expect(result.prediction).toBe("閒");
  });

  it("將第一個啟用來源視為起始值，後續可正確串接乘法與除法", () => {
    const rule = buildDefaultRule();
    rule.playerCard.enabled = false;
    rule.bankerCard.enabled = false;
    rule.playerPoint.enabled = true;
    rule.playerPoint.operation = "*";
    rule.playerPoint.weights = { ...rule.playerPoint.weights, "3": 4 };
    rule.bankerPoint.enabled = true;
    rule.bankerPoint.operation = "/";
    rule.bankerPoint.weights = { ...rule.bankerPoint.weights, "8": 2 };
    const result = evaluateCustomFormula(rule, current);
    expect(result.value).toBe(2);
    expect(result.prediction).toBe("閒");
  });

  it("前局來源相除時以安全除法處理零除數，不執行任意程式碼", () => {
    const rule = buildDefaultRule();
    rule.playerCard.enabled = false;
    rule.bankerCard.enabled = false;
    rule.previousExpressions = [{ enabled: true, left: { side: "player", kind: "card1" }, operator: "/", right: { side: "banker", kind: "card3" }, absolute: false, operation: "+", coefficient: 1 }];
    const noThirdBanker = { ...current, previous: { ...current.previous!, bankerCards: [7, 1], formulas: {} } };
    const result = evaluateCustomFormula(rule, noThirdBanker);
    expect(result.value).toBe(0);
    expect(result.prediction).toBe("和");
  });
});
