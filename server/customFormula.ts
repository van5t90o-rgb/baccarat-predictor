import { z } from "zod";
import type { CalculationInput, Prediction } from "./baccarat";

export const arithmeticOperators = ["+", "-", "*", "/"] as const;
export const sourceKinds = ["point", "card1", "card2", "card3"] as const;
export const predictionValues = ["閒", "莊", "和"] as const;

export type ArithmeticOperator = (typeof arithmeticOperators)[number];
export type SourceKind = (typeof sourceKinds)[number];
export type SourceSide = "player" | "banker";

const numericWeight = z.number().finite().min(-1000).max(1000);
const cardWeightSchema = z.record(z.string().regex(/^(?:[1-9]|1[0-3])$/), numericWeight);
const pointWeightSchema = z.record(z.string().regex(/^[0-9]$/), numericWeight);

const termSchema = z.object({ enabled: z.boolean(), operation: z.enum(arithmeticOperators), coefficient: numericWeight });
const previousExpressionSchema = z.object({
  enabled: z.boolean(),
  left: z.object({ side: z.enum(["player", "banker"]), kind: z.enum(sourceKinds) }),
  operator: z.enum(arithmeticOperators),
  right: z.object({ side: z.enum(["player", "banker"]), kind: z.enum(sourceKinds) }),
  absolute: z.boolean(),
  operation: z.enum(arithmeticOperators),
  coefficient: numericWeight,
});

export const customFormulaRuleSchema = z.object({
  version: z.literal(1),
  cardWeightMode: z.enum(["shared", "independent"]),
  sharedCardWeights: cardWeightSchema,
  playerCardWeights: cardWeightSchema,
  bankerCardWeights: cardWeightSchema,
  playerCard: termSchema.extend({ position: z.union([z.literal("all"), z.literal(1), z.literal(2), z.literal(3)]) }),
  bankerCard: termSchema.extend({ position: z.union([z.literal("all"), z.literal(1), z.literal(2), z.literal(3)]) }),
  playerPoint: termSchema.extend({ weights: pointWeightSchema }),
  bankerPoint: termSchema.extend({ weights: pointWeightSchema }),
  round: termSchema,
  previousExpressions: z.array(previousExpressionSchema).max(8),
  positivePrediction: z.enum(predictionValues),
  negativePrediction: z.enum(predictionValues),
  zeroPrediction: z.enum(predictionValues),
});

export type CustomFormulaRule = z.infer<typeof customFormulaRuleSchema>;

export type CustomFormulaPreview = {
  value: number;
  prediction: Prediction;
  expression: string;
  breakdown: Array<{ label: string; value: number }>;
};

const CARD_KEYS = Array.from({ length: 13 }, (_, index) => String(index + 1));
const POINT_KEYS = Array.from({ length: 10 }, (_, index) => String(index));

export function buildDefaultRule(): CustomFormulaRule {
  const cardWeights = Object.fromEntries(CARD_KEYS.map(key => [key, 1]));
  const pointWeights = Object.fromEntries(POINT_KEYS.map(key => [key, 1]));
  return {
    version: 1,
    cardWeightMode: "independent",
    sharedCardWeights: cardWeights,
    playerCardWeights: { ...cardWeights },
    bankerCardWeights: { ...cardWeights },
    playerCard: { enabled: true, position: "all", operation: "+", coefficient: 1 },
    bankerCard: { enabled: true, position: "all", operation: "-", coefficient: 1 },
    playerPoint: { enabled: false, operation: "+", coefficient: 1, weights: { ...pointWeights } },
    bankerPoint: { enabled: false, operation: "-", coefficient: 1, weights: { ...pointWeights } },
    round: { enabled: false, operation: "+", coefficient: 1 },
    previousExpressions: [],
    positivePrediction: "閒",
    negativePrediction: "莊",
    zeroPrediction: "和",
  };
}

function safeDivide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function applyOperation(total: number, operation: ArithmeticOperator, operand: number) {
  if (operation === "+") return total + operand;
  if (operation === "-") return total - operand;
  if (operation === "*") return total * operand;
  return safeDivide(total, operand);
}

function selectedCards(cards: number[], position: "all" | 1 | 2 | 3) {
  return position === "all" ? cards : cards[position - 1] === undefined ? [] : [cards[position - 1]];
}

function weightedCards(cards: number[], weights: Record<string, number>, position: "all" | 1 | 2 | 3) {
  return selectedCards(cards, position).reduce((total, card) => total + (weights[String(card)] ?? 0), 0);
}

function previousValue(previous: CalculationInput["previous"], side: SourceSide, kind: SourceKind) {
  if (!previous) return 0;
  const point = side === "player" ? previous.playerPoint : previous.bankerPoint;
  const cards = side === "player" ? previous.playerCards : previous.bankerCards;
  if (kind === "point") return point;
  const index = Number(kind.replace("card", "")) - 1;
  return cards[index] ?? 0;
}

function sourceLabel(side: SourceSide, kind: SourceKind) {
  const prefix = side === "player" ? "前局閒" : "前局莊";
  if (kind === "point") return `${prefix}點數`;
  return `${prefix}第${kind.replace("card", "")}張牌`;
}

export function evaluateCustomFormula(rawRule: unknown, input: CalculationInput): CustomFormulaPreview {
  const rule = customFormulaRuleSchema.parse(rawRule);
  const playerWeights = rule.cardWeightMode === "shared" ? rule.sharedCardWeights : rule.playerCardWeights;
  const bankerWeights = rule.cardWeightMode === "shared" ? rule.sharedCardWeights : rule.bankerCardWeights;
  const breakdown: Array<{ label: string; value: number }> = [];
  let value = 0;
  let hasEnabledTerm = false;
  const addTerm = (label: string, enabled: boolean, operation: ArithmeticOperator, operand: number) => {
    if (!enabled) return;
    value = hasEnabledTerm ? applyOperation(value, operation, operand) : operand;
    hasEnabledTerm = true;
    breakdown.push({ label, value: operand });
  };
  addTerm("閒方牌面加權", rule.playerCard.enabled, rule.playerCard.operation, weightedCards(input.playerCards, playerWeights, rule.playerCard.position) * rule.playerCard.coefficient);
  addTerm("莊方牌面加權", rule.bankerCard.enabled, rule.bankerCard.operation, weightedCards(input.bankerCards, bankerWeights, rule.bankerCard.position) * rule.bankerCard.coefficient);
  addTerm("閒點數權重", rule.playerPoint.enabled, rule.playerPoint.operation, (rule.playerPoint.weights[String(input.playerPoint)] ?? 0) * rule.playerPoint.coefficient);
  addTerm("莊點數權重", rule.bankerPoint.enabled, rule.bankerPoint.operation, (rule.bankerPoint.weights[String(input.bankerPoint)] ?? 0) * rule.bankerPoint.coefficient);
  addTerm("局數", rule.round.enabled, rule.round.operation, input.roundNo * rule.round.coefficient);
  rule.previousExpressions.forEach(expression => {
    if (!expression.enabled) return;
    const left = previousValue(input.previous, expression.left.side, expression.left.kind);
    const right = previousValue(input.previous, expression.right.side, expression.right.kind);
    let result = applyOperation(left, expression.operator, right);
    if (expression.absolute) result = Math.abs(result);
    addTerm(`${sourceLabel(expression.left.side, expression.left.kind)} ${expression.operator} ${sourceLabel(expression.right.side, expression.right.kind)}`, true, expression.operation, result * expression.coefficient);
  });
  const rounded = Math.round(value * 100) / 100;
  const prediction = rounded > 0 ? rule.positivePrediction : rounded < 0 ? rule.negativePrediction : rule.zeroPrediction;
  return {
    value: rounded,
    prediction,
    expression: breakdown.map(item => `${item.label}=${item.value}`).filter(Boolean).join("；") || "尚未啟用任何資料來源",
    breakdown: breakdown.filter(item => item.label),
  };
}
