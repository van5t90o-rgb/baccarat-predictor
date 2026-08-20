export const CARD_VALUES: Record<string, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
};

export const BACCARAT_VALUES: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
};

export const FORMULA_NAMES = [
  "正EV",
  "真數",
  "導數",
  "實數",
  "理數",
  "HZ",
  "點差",
  "價值",
  "積分",
  "EA",
  "VP",
  "HD",
  "TP",
  "AP",
  "和計",
  "機率",
  "差額",
  "陰陽",
] as const;

export const EVENT_FORMULAS = ["點差", "理數", "導數", "真數", "HZ", "價值"] as const;

export type FormulaName = (typeof FORMULA_NAMES)[number];
export type EventFormulaName = (typeof EVENT_FORMULAS)[number];
export type Prediction = "閒" | "莊" | "和" | "";

export type FormulaResult = {
  name: string;
  value: number | null;
  prediction: Prediction;
  success: boolean;
  error: string;
};

export type FormulaMap = Record<FormulaName, FormulaResult>;

export type FormulaHistory = {
  id?: number;
  tableId: string;
  roundNo: number;
  playerWins: number;
  bankerWins: number;
  tieCount: number;
  playerCards: number[];
  bankerCards: number[];
  playerPoint: number;
  bankerPoint: number;
  winner: Prediction;
  playerPair?: boolean;
  bankerPair?: boolean;
  formulas: Record<string, string>;
};

export type CalculationInput = Omit<FormulaHistory, "formulas" | "winner" | "playerPair" | "bankerPair"> & {
  winner: Prediction;
  playerPair: boolean;
  bankerPair: boolean;
  previous?: FormulaHistory | null;
};

export type AnalysisItem = {
  formula: FormulaName;
  prediction: Prediction;
  canPredict: boolean;
  status: "win" | "loss" | "unknown" | "";
  type: "win" | "loss" | "";
  streak: number;
  hit: number;
  hitCount: number;
  historyResult: boolean[];
  total: number;
  accuracy: number;
};

export type AnalysisSummary = {
  analysis: Record<FormulaName, AnalysisItem>;
  total: number;
  highestWin: number;
  highestLoss: number;
  highestWinFormulas: FormulaName[];
  highestLossFormulas: FormulaName[];
};

export type BestResult = {
  decision: Prediction;
  bestFormula: string;
  streakType: string;
  streakCount: number;
  hits: number;
  accuracy: number;
  analysisTotal: number;
  reversed: boolean;
  reason: string;
};

export function normalizeCard(card: unknown) {
  return String(card ?? "").trim().toUpperCase();
}

export function validateCard(card: unknown) {
  return Object.hasOwn(CARD_VALUES, normalizeCard(card));
}

export function cardValue(card: unknown) {
  return CARD_VALUES[normalizeCard(card)] ?? 0;
}

export function baccaratValue(card: unknown) {
  return BACCARAT_VALUES[cardValue(card)] ?? 0;
}

export function parseCards(values: string[]) {
  return values.reduce<number[]>((cards, raw) => {
    const normalized = normalizeCard(raw);
    if (!normalized) return cards;
    if (Object.hasOwn(CARD_VALUES, normalized)) {
      cards.push(CARD_VALUES[normalized]);
      return cards;
    }
    if (/^\d+$/.test(normalized)) {
      const number = Number(normalized);
      if (number >= 1 && number <= 13) cards.push(number);
    }
    return cards;
  }, []);
}

export function computePoints(cards: number[]) {
  return cards.reduce((total, card) => total + (BACCARAT_VALUES[Number(card)] ?? 0), 0) % 10;
}

export function isPair(cards: number[]) {
  return cards.length >= 2 && Number(cards[0]) === Number(cards[1]);
}

export function winner(playerCards: number[], bankerCards: number[]): Prediction {
  const player = computePoints(playerCards);
  const banker = computePoints(bankerCards);
  if (player > banker) return "閒";
  if (banker > player) return "莊";
  return "和";
}

export function normalizePrediction(prediction: unknown): Prediction {
  const value = String(prediction ?? "").trim().toUpperCase();
  const mapping: Record<string, Prediction> = {
    P: "閒",
    PLAYER: "閒",
    閒: "閒",
    B: "莊",
    BANKER: "莊",
    莊: "莊",
    T: "和",
    TIE: "和",
    和: "和",
  };
  return mapping[value] ?? "";
}

export function reversePrediction(prediction: unknown): Prediction {
  const normalized = normalizePrediction(prediction);
  if (normalized === "閒") return "莊";
  if (normalized === "莊") return "閒";
  return normalized;
}

function pythonRound(value: number, digits = 0) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  const scaled = Math.abs(value) * factor;
  const base = Math.floor(scaled);
  const fraction = scaled - base;
  const epsilon = Number.EPSILON * Math.max(1, scaled) * 8;
  const rounded = fraction > 0.5 + epsilon ? base + 1 : fraction < 0.5 - epsilon ? base : base % 2 === 0 ? base : base + 1;
  return (value < 0 ? -1 : 1) * (rounded / factor);
}

function safeDivide(dividend: number, divisor: number) {
  if (divisor === 0) throw new Error("division by zero");
  return pythonRound(dividend / divisor, 2);
}

function highest(values: number[]) {
  return values.length ? Math.max(...values) : 0;
}

function lowest(values: number[]) {
  return values.length ? Math.min(...values) : 0;
}

function absoluteDiff(first: number, second: number) {
  return Math.abs(first - second);
}

function sumMapped(cards: number[], mapping: Record<number, number>) {
  return cards.reduce((total, card) => total + (mapping[card] ?? 0), 0);
}

function digitValue(point: number, mapping: Record<number, number>) {
  return mapping[point] ?? 1;
}

function predictionByValue(value: number): Prediction {
  if (value > 0) return "閒";
  if (value < 0) return "莊";
  return "和";
}

function createResult(name: string, value: number | null, prediction: Prediction = "", success = true, error = ""): FormulaResult {
  return { name, value, prediction: normalizePrediction(prediction), success, error };
}

function comparisonPrediction(first: number, second: number): Prediction {
  if (first > second) return "閒";
  if (first < second) return "莊";
  return "和";
}

const formulaFunctions: Record<FormulaName, (data: CalculationInput) => FormulaResult> = {
  正EV: data => {
    const value = sumMapped(data.playerCards, { 1: -1, 2: 1, 3: 1, 4: 1, 5: 1, 6: -1, 7: -1, 10: -1, 11: -1, 12: -1, 13: -1 });
    return createResult("正EV", value, predictionByValue(value));
  },
  真數: data => {
    const total = sumMapped(data.playerCards, { 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 9: 5, 7: -5, 8: -5 });
    const value = safeDivide(total, (data.bankerWins + 1) / 10);
    return createResult("真數", value, predictionByValue(value));
  },
  導數: data => {
    const mapping = { 2: 3, 3: 3, 5: 3, 1: 5, 9: 5, 6: -3, 7: -3, 8: -2 };
    const value = safeDivide(sumMapped(data.playerCards, mapping) + sumMapped(data.bankerCards, mapping), data.roundNo);
    return createResult("導數", value, predictionByValue(value));
  },
  實數: data => {
    const mapping = { 1: 5, 4: 5, 3: 10, 9: 10, 2: -2, 7: -2, 8: -2, 5: -10 };
    const value = safeDivide(sumMapped(data.playerCards, mapping) + sumMapped(data.bankerCards, mapping), 12 - data.roundNo / 10);
    return createResult("實數", value, predictionByValue(value));
  },
  理數: data => {
    const mapping = { 2: -3, 3: -3, 8: -3, 1: -5, 9: -5, 4: 3, 5: 3, 6: 3, 7: 3 };
    const total1 = sumMapped(data.playerCards, mapping) + sumMapped(data.bankerCards, mapping);
    const total2 = [2, 7, 8, 9].includes(data.bankerPoint) ? 5 : [3, 4, 5, 6].includes(data.bankerPoint) ? -5 : -6;
    const included = [...data.playerCards, ...data.bankerCards].filter(card => [1, 2, 3, 8, 9].includes(card)).length * 24;
    const total3 = pythonRound(included / pythonRound(12 - data.roundNo / 10, 1), 1);
    const value = total1 + total2 + total3;
    const prediction: Prediction = value > 0 ? "莊" : value < 0 ? "閒" : "和";
    return createResult("理數", value, prediction);
  },
  HZ: data => {
    const playerMapping: Record<number, number> = { 7: 2, 8: 2, 9: 2, 0: 1, 1: 1, 3: 1, 4: 1, 2: -5, 5: -5, 6: -5 };
    const bankerMapping: Record<number, number> = { 7: 3, 8: 3, 9: 3, 0: 2, 1: 2, 3: 2, 4: 2, 6: 2, 2: -5, 5: -5 };
    const cardMapping = { 1: 2, 4: 2, 5: 2, 7: 2, 8: 2, 2: -3, 3: -3, 6: -5, 9: -5 };
    const value = (playerMapping[data.playerPoint] ?? 0) + (bankerMapping[data.bankerPoint] ?? 0) + sumMapped([...data.playerCards, ...data.bankerCards], cardMapping);
    return createResult("HZ", value, predictionByValue(value));
  },
  點差: data => {
    const pointMapping: Record<number, number> = { 0: 6, 1: 6, 2: 6, 3: 6, 9: 6, 5: -6, 6: -6, 8: -6, 4: -5, 7: -5 };
    const cardMapping = { 1: 1, 2: 1, 8: 1, 9: 1, 5: -1, 6: -1, 7: -1, 3: -4, 4: -4 };
    const value = (pointMapping[data.playerPoint] ?? 0) - (pointMapping[data.bankerPoint] ?? 0) + sumMapped([...data.playerCards, ...data.bankerCards], cardMapping);
    return createResult("點差", value, predictionByValue(value));
  },
  價值: data => {
    const cards = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 7: -5, 8: -5, 9: -5 };
    const rates: Record<number, number> = { 1: 0.1, 2: 0.4, 3: 0.4, 4: 0.4, 5: 0.5, 6: 0.6, 7: 0.7, 8: 0.6, 9: 0.5 };
    const total = sumMapped([...data.playerCards, ...data.bankerCards], cards);
    const player = total * (rates[data.playerPoint] ?? 0);
    const banker = total * (rates[data.bankerPoint] ?? 0);
    return createResult("價值", pythonRound(player - banker, 2), comparisonPrediction(player, banker));
  },
  積分: data => {
    const rank: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 6, 12: 7, 13: 8 };
    const points: Record<number, number> = { 0: 0.5, 1: 0.9, 2: 0.7, 3: 0.7, 4: 0.8, 5: 0.5, 6: 0.4, 7: 0.3, 8: 0.2, 9: 0.3 };
    const player = safeDivide(absoluteDiff(highest(data.playerCards), lowest(data.playerCards)) + (rank[highest(data.playerCards)] ?? 0), points[data.playerPoint] ?? 1);
    const banker = safeDivide(absoluteDiff(highest(data.bankerCards), lowest(data.bankerCards)) + (rank[highest(data.bankerCards)] ?? 0), points[data.bankerPoint] ?? 1);
    return createResult("積分", pythonRound(player - banker, 2), comparisonPrediction(player, banker));
  },
  EA: data => {
    const mapping = { 1: 5, 2: 5, 3: -3, 4: -3, 5: -3, 6: -3, 7: -1, 8: -1, 9: -1 };
    const digits = { 0: 0.1, 9: 0.1, 1: 0.9, 2: 0.5, 3: 0.5, 4: 0.6, 7: 0.6, 5: 0.7, 6: 0.3, 8: 0.2 };
    const total = sumMapped(data.playerCards, mapping) + sumMapped(data.bankerCards, mapping);
    const player = total * digitValue(data.playerPoint, digits);
    const banker = total * digitValue(data.bankerPoint, digits);
    return createResult("EA", pythonRound(player - banker, 2), comparisonPrediction(player, banker));
  },
  VP: data => {
    const calculate = (cards: number[]) => cards.reduce((total, card) => total + (card <= 5 ? 1 : card <= 9 ? 2 : 3), 0);
    const playerMapping = { 9: 1.6, 8: 1.6, 7: 1.6, 0: 1.4, 1: 1.4, 4: 1.4, 2: 1.2, 3: 1.2, 5: 1.2, 6: 1.2 };
    const bankerMapping = { 9: 1.7, 8: 1.7, 7: 1.7, 0: 1.5, 1: 1.5, 3: 1.5, 4: 1.5, 5: 1.5, 6: 1.5, 2: 1.1 };
    const player = safeDivide(calculate(data.playerCards), digitValue(data.playerPoint, playerMapping));
    const banker = safeDivide(calculate(data.bankerCards), digitValue(data.bankerPoint, bankerMapping));
    return createResult("VP", pythonRound(player - banker, 2), comparisonPrediction(player, banker));
  },
  HD: data => {
    const mapping = { 1: 1, 12: 1, 13: 1, 2: 3, 6: 3, 3: 2, 5: 2, 10: 2, 4: 0.5, 11: 0.5, 7: 1.5, 8: 1.5, 9: 1.5 };
    const digits = { 0: 1.1, 1: 1.1, 2: 1.7, 3: 1.8, 4: 1.7, 5: 1.7, 6: 1.2, 7: 1.8, 8: 1.8, 9: 1.7 };
    const player = sumMapped(data.playerCards, mapping) * digitValue(data.playerPoint, digits);
    const banker = sumMapped(data.bankerCards, mapping) * digitValue(data.bankerPoint, digits);
    return createResult("HD", pythonRound(player - banker, 2), comparisonPrediction(player, banker));
  },
  TP: data => {
    const mapping: Record<number, number> = { 1: 9, 2: 8, 3: 7, 4: 6, 5: 5, 6: 1, 7: 3, 8: 2, 9: 2 };
    const differences: Record<number, number> = { 0: -4, 1: -5, 2: -5, 3: -2, 4: -1, 5: -1, 6: 3, 7: 4, 8: 5, 9: 6 };
    const previousPlayer = data.previous?.playerPoint ?? 0;
    const previousBanker = data.previous?.bankerPoint ?? 0;
    const playerDiff = data.previous ? absoluteDiff(data.playerPoint, previousPlayer) : 0;
    const bankerDiff = data.previous ? absoluteDiff(data.bankerPoint, previousBanker) : 0;
    const player = safeDivide(mapping[highest(data.playerCards)] ?? 0, differences[playerDiff] ?? 1);
    const banker = safeDivide(mapping[highest(data.bankerCards)] ?? 0, differences[bankerDiff] ?? 1);
    return createResult("TP", pythonRound(player - banker, 2), comparisonPrediction(player, banker));
  },
  AP: data => {
    const mapping = { 1: -5, 2: -4, 3: -3, 4: -2, 5: 1, 6: 2, 7: 3, 8: 4, 9: 5 };
    const digits = { 0: 0.5, 8: 0.5, 1: 0.4, 2: 0.3, 3: 0.3, 6: 0.3, 7: 0.3, 4: 0.1, 9: 0.1, 5: 0.2 };
    const total = sumMapped([...data.playerCards, ...data.bankerCards], mapping);
    const player = total * digitValue(data.playerPoint, digits);
    const banker = total * digitValue(data.bankerPoint, digits);
    return createResult("AP", pythonRound(player - banker, 2), comparisonPrediction(player, banker));
  },
  和計: data => {
    const value = (data.playerPoint + data.bankerPoint) % 10 - 5;
    return createResult("和計", value, predictionByValue(value));
  },
  機率: data => {
    const playerFirst = data.playerCards[0] ?? 0;
    const bankerFirst = data.bankerCards[0] ?? 0;
    const playerValue = playerFirst + ([1, 2, 3, 4, 5, 6].includes(playerFirst) ? 1 : [8, 9].includes(playerFirst) ? -1 : 0);
    const bankerValue = bankerFirst + ([1, 2, 3, 4, 5, 6].includes(bankerFirst) ? 1 : [8, 9].includes(bankerFirst) ? -1 : 0);
    const value = absoluteDiff(playerValue, bankerValue);
    return createResult("機率", value, value >= 1 && value <= 5 ? "莊" : "閒");
  },
  差額: data => {
    const value = absoluteDiff(data.playerPoint, data.bankerPoint);
    let prediction: Prediction = "閒";
    if (data.previous) {
      const lastPlayer = data.previous.playerPoint;
      const lastBanker = data.previous.bankerPoint;
      const lastWinner: Prediction = lastPlayer > lastBanker ? "閒" : lastBanker > lastPlayer ? "莊" : "和";
      const lastLoser: Prediction = lastPlayer > lastBanker ? "莊" : lastBanker > lastPlayer ? "閒" : "和";
      prediction = value <= 4 ? lastLoser : lastWinner;
    }
    return createResult("差額", value, prediction);
  },
  陰陽: data => {
    let player = data.playerCards[0] ?? 0;
    let banker = data.bankerCards[1] ?? 0;
    if ([8, 9].includes(player)) {
      player += 1;
      banker -= 1;
    } else {
      player -= 1;
      banker += 1;
    }
    const value = absoluteDiff(player, banker);
    return createResult("陰陽", value, value >= 1 && value <= 5 ? "莊" : "閒");
  },
};

export function calculateFormulas(data: CalculationInput): FormulaMap {
  return FORMULA_NAMES.reduce<FormulaMap>((results, name) => {
    try {
      results[name] = formulaFunctions[name](data);
    } catch (error) {
      results[name] = createResult(name, null, "", false, error instanceof Error ? error.message : "Formula Error");
    }
    return results;
  }, {} as FormulaMap);
}

export function formulaPredictions(results: FormulaMap): Record<string, string> {
  return FORMULA_NAMES.reduce<Record<string, string>>((predictions, name) => {
    const result = results[name];
    predictions[name] = result.success ? result.prediction : "";
    return predictions;
  }, {});
}

export function resolveHitResults(pairs: Array<[unknown, unknown]>) {
  const resolved: boolean[] = [];
  for (const [rawPrediction, rawWinner] of pairs) {
    const prediction = normalizePrediction(rawPrediction);
    const result = normalizePrediction(rawWinner);
    if (!prediction || !result) continue;
    const hit = result === "和" ? (resolved.length ? Boolean(resolved.at(-1)) : true) : prediction === result;
    resolved.push(hit);
  }
  return resolved;
}

function analyzeFormula(history: FormulaHistory[], current: FormulaMap, formula: FormulaName, analysisCount: number): AnalysisItem {
  const pairs: Array<[unknown, unknown]> = [];
  const pairCount = Math.max(0, Math.min(analysisCount, Math.max(0, history.length - 1)));
  for (let index = 0; index < pairCount; index += 1) {
    const prediction = normalizePrediction(history[index]?.formulas[formula]);
    const result = normalizePrediction(history[index + 1]?.winner);
    if (prediction && result) pairs.push([prediction, result]);
  }
  const historyResult = resolveHitResults(pairs);
  const hit = historyResult.filter(Boolean).length;
  let streak = 0;
  let type: AnalysisItem["type"] = "";
  if (historyResult.length) {
    const currentResult = historyResult.at(-1);
    streak = 1;
    for (let index = historyResult.length - 2; index >= 0; index -= 1) {
      if (historyResult[index] !== currentResult) break;
      streak += 1;
    }
    type = currentResult ? "win" : "loss";
  }
  const currentResult = current[formula];
  const prediction = normalizePrediction(currentResult.prediction);
  const canPredict = currentResult.success && prediction !== "";
  if (!canPredict) {
    return { formula, prediction, canPredict: false, status: "unknown", type: "", streak: 0, hit: 0, hitCount: 0, historyResult, total: historyResult.length, accuracy: 0 };
  }
  return {
    formula,
    prediction,
    canPredict: true,
    status: type,
    type,
    streak,
    hit,
    hitCount: hit,
    historyResult,
    total: historyResult.length,
    accuracy: historyResult.length ? pythonRound((hit * 100) / historyResult.length, 2) : 0,
  };
}

export function buildAnalysis(history: FormulaHistory[], current: FormulaMap, roundNo: number): AnalysisSummary {
  const total = Math.max(0, Math.min(history.length, Math.max(0, roundNo - 1)));
  const analysis = FORMULA_NAMES.reduce<Record<FormulaName, AnalysisItem>>((items, name) => {
    items[name] = analyzeFormula(history, current, name, total);
    return items;
  }, {} as Record<FormulaName, AnalysisItem>);
  let highestWin = 0;
  let highestLoss = 0;
  let highestWinFormulas: FormulaName[] = [];
  let highestLossFormulas: FormulaName[] = [];
  for (const name of FORMULA_NAMES) {
    const item = analysis[name];
    if (item.type === "win" && item.streak > 0) {
      if (item.streak > highestWin) {
        highestWin = item.streak;
        highestWinFormulas = [name];
      } else if (item.streak === highestWin) {
        highestWinFormulas.push(name);
      }
    }
    if (item.type === "loss" && item.streak > 0) {
      if (item.streak > highestLoss) {
        highestLoss = item.streak;
        highestLossFormulas = [name];
      } else if (item.streak === highestLoss) {
        highestLossFormulas.push(name);
      }
    }
  }
  return { analysis, total, highestWin, highestLoss, highestWinFormulas, highestLossFormulas };
}

function recentPattern(values: boolean[]): [string, number] {
  if (!values.length) return ["", 0];
  if (values.length >= 2) {
    if (values.at(-1) === values.at(-2)) {
      const result = values.at(-1);
      let count = 2;
      for (let index = values.length - 3; index >= 0; index -= 1) {
        if (values[index] !== result) break;
        count += 1;
      }
      return [result ? "win" : "loss", count];
    }
    if (values.length === 2) return ["single_jump", 2];
    const recent = values.slice(-3);
    if ((recent[0] && !recent[1] && !recent[2]) || (!recent[0] && !recent[1] && recent[2])) return ["one_win_two_loss", 3];
    return ["single_jump", 2];
  }
  return ["", 0];
}

export function chooseBest(analysisSummary: AnalysisSummary, current: FormulaMap): BestResult {
  const result: BestResult = { decision: "", bestFormula: "", streakType: "", streakCount: 0, hits: 0, accuracy: 0, analysisTotal: analysisSummary.total, reversed: false, reason: "" };
  if (analysisSummary.total < 5) {
    const formula = current.差額;
    const prediction = normalizePrediction(formula.prediction);
    result.bestFormula = "差額";
    if (!formula.success || !prediction) {
      result.reason = "分析筆數不足5_公式17無法正常計算";
      return result;
    }
    const item = analysisSummary.analysis.差額;
    const [pattern, count] = recentPattern(item.historyResult);
    result.streakType = pattern;
    result.streakCount = count;
    result.hits = item.hit;
    result.accuracy = item.accuracy;
    if (pattern === "win") {
      result.decision = prediction;
      result.reason = "分析筆數不足5_公式17目前連勝";
      return result;
    }
    if (pattern === "loss") {
      result.decision = reversePrediction(prediction);
      result.reversed = true;
      result.reason = "分析筆數不足5_公式17目前連敗反打";
      return result;
    }
    result.decision = prediction;
    result.reason = "分析筆數不足5_無歷史連勝連敗_直接使用公式17";
    return result;
  }
  const wins = Object.values(analysisSummary.analysis).filter(item => item.canPredict && item.type === "win" && item.streak === analysisSummary.highestWin && item.streak > 0);
  const losses = Object.values(analysisSummary.analysis).filter(item => item.canPredict && item.type === "loss" && item.streak === analysisSummary.highestLoss && item.streak > 0);
  let candidates: Array<[AnalysisItem, boolean]> = [];
  let dominant = "";
  if (analysisSummary.highestWin > analysisSummary.highestLoss) {
    candidates = wins.map(item => [item, false]);
    dominant = "win";
  } else if (analysisSummary.highestLoss > analysisSummary.highestWin) {
    candidates = losses.map(item => [item, true]);
    dominant = "loss";
  } else if (analysisSummary.highestWin > 0 && analysisSummary.highestLoss > 0) {
    candidates = [...wins.map(item => [item, false] as [AnalysisItem, boolean]), ...losses.map(item => [item, true] as [AnalysisItem, boolean])];
    dominant = "mixed";
  } else {
    result.reason = "沒有符合連續命中或連續不命中";
    return result;
  }
  const assign = (item: AnalysisItem, reversed: boolean, reason: string, streakType = item.type) => ({
    ...result,
    decision: reversed ? reversePrediction(item.prediction) : item.prediction,
    bestFormula: item.formula,
    streakType,
    streakCount: item.streak,
    hits: item.hit,
    accuracy: item.accuracy,
    reversed,
    reason,
  });
  if (candidates.length === 1) {
    const [item, reversed] = candidates[0];
    if (!item.prediction) return { ...result, reason: "最高公式沒有下一局預測" };
    return assign(item, reversed, dominant === "mixed" ? "命中與不命中最高_唯一公式" : "唯一最高連續");
  }
  const decisions = new Map<Prediction, Array<[AnalysisItem, boolean]>>();
  for (const [item, reversed] of candidates) {
    const decision = reversed ? reversePrediction(item.prediction) : item.prediction;
    if (!decision) continue;
    decisions.set(decision, [...(decisions.get(decision) ?? []), [item, reversed]]);
  }
  if (decisions.size === 1) {
    const [decision, choices] = Array.from(decisions.entries())[0];
    const [item, reversed] = choices[0];
    return { ...assign(item, reversed, "最高連續_多公式下一局一致"), decision };
  }
  const winCandidates = candidates.filter(([item]) => item.type === "win").map(([item]) => item);
  const lossCandidates = candidates.filter(([item]) => item.type === "loss").map(([item]) => item);
  const maximumHit = winCandidates.length ? Math.max(...winCandidates.map(item => item.hit)) : -1;
  const maximumMiss = lossCandidates.length ? Math.max(...lossCandidates.map(item => item.total - item.hit)) : -1;
  if (maximumHit > maximumMiss && winCandidates.length) {
    const selected = winCandidates.filter(item => item.hit === maximumHit);
    const predictions = new Set(selected.map(item => item.prediction).filter(Boolean));
    if (predictions.size !== 1) return { ...result, reason: "藍色決策_最高命中較高_仍無法唯一決定" };
    return assign(selected[0], false, "藍色決策_歷史命中較高", "win");
  }
  if (maximumMiss > maximumHit && lossCandidates.length) {
    const selected = lossCandidates.filter(item => item.total - item.hit === maximumMiss);
    const predictions = new Set(selected.map(item => reversePrediction(item.prediction)).filter(Boolean));
    if (predictions.size !== 1) return { ...result, reason: "藍色決策_最高不命中較高_仍無法唯一決定" };
    return assign(selected[0], true, "藍色決策_歷史不命中較高_反打", "loss");
  }
  return { ...result, reason: "藍色決策_最高命中與最高不命中相同_無法決定" };
}

export function currentEvents(data: CalculationInput) {
  const events: string[] = [];
  if (data.playerPair || data.bankerPair) events.push("對子");
  if (data.winner === "和") events.push("和局");
  if (data.winner === "莊" && data.bankerPoint === 6) events.push("莊6");
  return events;
}

export function buildEventPattern(results: FormulaMap) {
  return EVENT_FORMULAS.reduce<Record<EventFormulaName, Prediction>>((pattern, formula) => {
    pattern[formula] = normalizePrediction(results[formula].prediction);
    return pattern;
  }, {} as Record<EventFormulaName, Prediction>);
}

export function eventPatternFromPredictions(predictions: Record<string, string>) {
  return EVENT_FORMULAS.reduce<Record<EventFormulaName, Prediction>>((pattern, formula) => {
    pattern[formula] = normalizePrediction(predictions[formula]);
    return pattern;
  }, {} as Record<EventFormulaName, Prediction>);
}
