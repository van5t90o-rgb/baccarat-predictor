import { Badge } from "@/components/ui/badge";

type Prediction = "閒" | "莊" | "和" | "";

export type DetailedFormula = {
  name: string;
  value: number | null;
  nextPrediction: Prediction;
  success: boolean;
  error: string;
  previousPrediction: Prediction;
  status: "hit" | "miss" | "pending";
};

export type DetailedHistoryRow = {
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
  playerPair: boolean;
  bankerPair: boolean;
  formulas: DetailedFormula[];
};

export type CustomFormulaPreview = {
  id: number;
  name: string;
  prediction: Prediction;
  value: number;
  expression: string;
};

const HISTORY_VISIBLE_ROWS = 12;
const FORMULA_ORDER = ["正EV", "真數", "導數", "實數", "理數", "HZ", "點差", "價值", "積分", "EA", "VP", "HD", "TP", "AP", "和計", "機率", "差額", "陰陽"] as const;
const formulaLabel = (index: number) => `公式${index + 1}`;

function cardLabel(value?: number) {
  if (value === undefined) return "";
  return ({ 1: "A", 11: "J", 12: "Q", 13: "K" } as Record<number, string>)[value] ?? String(value);
}

function predictionTextClass(value: Prediction) {
  if (value === "閒") return "text-[#0057FF]";
  if (value === "莊") return "text-[#E00000]";
  return "text-[#203044]";
}

function historicalPredictionCellClass(formula?: DetailedFormula) {
  if (formula?.status === "hit") return "bg-[#fff1f0] text-[#b42318] font-extrabold";
  if (formula?.status === "miss") return "bg-[#eff8ff] text-[#175cd3] font-extrabold";
  if (formula?.previousPrediction === "和") return "bg-[#f8fafc] text-[#475467]";
  return "bg-white text-[#475467]";
}

function nextPredictionCellClass(value: Prediction) {
  if (value === "閒") return "bg-[#F9FBFD] text-[#0057FF]";
  if (value === "莊") return "bg-[#F9FBFD] text-[#E00000]";
  if (value === "和") return "bg-[#F9FBFD] text-[#203044]";
  return "bg-[#F9FBFD] text-slate-300";
}

function CustomFormulaSection({ formulas }: { formulas: CustomFormulaPreview[] }) {
  if (!formulas.length) return null;
  return <section className="mt-4 rounded-xl border border-[#E7D9B8] bg-[#FFFCF5] px-4 py-3" data-testid="custom-formula-history-section"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-semibold tracking-[0.13em] text-[#A27C2E]">CUSTOM RULES</p><p className="mt-0.5 text-sm font-bold text-[#15243B]">本局自訂公式預測</p></div><Badge variant="outline" className="border-[#E3D1A9] bg-white text-[#8C6825]">{formulas.length} 項</Badge></div><div className="mt-3 flex flex-wrap gap-2">{formulas.map(formula => <article key={formula.id} className="min-w-40 rounded-lg border border-[#E9E0CF] bg-white px-3 py-2" title={formula.expression}><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-bold text-[#45546A]">{formula.name}</p><span className={`font-serif text-lg font-semibold ${predictionTextClass(formula.prediction)}`}>{formula.prediction || "—"}</span></div><p className="mt-1 text-[11px] text-slate-400">運算值 {formula.value}</p></article>)}</div></section>;
}

function FormulaCell({ formula, kind, label }: { formula?: DetailedFormula; kind: "history" | "next"; label: string }) {
  const prediction = kind === "history" ? formula?.previousPrediction ?? "" : formula?.nextPrediction ?? "";
  const value = formula?.value ?? "—";
  const title = kind === "history" ? `${label}：${prediction || "—"}；運算值 ${value}` : `${label}：下一局預測 ${prediction || "—"}；運算值 ${value}`;
  const className = kind === "history" ? historicalPredictionCellClass(formula) : nextPredictionCellClass(prediction);
  return <td data-testid={kind === "next" ? "next-prediction-cell" : undefined} className={`min-w-11 border-b border-[#eaecf0] px-2 py-2 text-center text-xs font-semibold leading-4 transition-colors ${className}`} title={title}>{prediction || "—"}</td>;
}

export function DetailedHistoryResults({ items, loading, customFormulas = [] }: { items: DetailedHistoryRow[]; loading: boolean; customFormulas?: CustomFormulaPreview[] }) {
  if (loading) return <p className="mt-5 rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm text-slate-400">正在載入歷史資料…</p>;
  if (!items.length) return <div className="mt-5" data-testid="detailed-history-results"><p className="rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm leading-6 text-slate-500">尚無本桌公式紀錄；確認並儲存第一局後，這裡會顯示逐局牌面、點數、勝負與全部公式結果。</p><CustomFormulaSection formulas={customFormulas} /></div>;

  const chronological = [...items].reverse();
  const displayRows = chronological.slice(-HISTORY_VISIBLE_ROWS);
  const latest = chronological.at(-1)!;
  // 僅使用已完成的歷史局數累積命中；下一局預測列不參與此統計。
  const historicalFormulaHits = Object.fromEntries(FORMULA_ORDER.map(name => [name, chronological.reduce((total, row) => total + (row.formulas.find(formula => formula.name === name)?.status === "hit" ? 1 : 0), 0)]));
  const hitValues = Object.values(historicalFormulaHits);
  const highestHit = Math.max(...hitValues, 0);
  const lowestHit = Math.min(...hitValues, 0);
  const rowFormula = (row: DetailedHistoryRow, name: string) => row.formulas.find(formula => formula.name === name);

  return <section className="mt-4" data-testid="detailed-history-results"><div className="overflow-x-auto rounded-[14px] border border-[#e4e7ec] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.05)]"><table className="min-w-[1840px] border-collapse text-xs" aria-label="歷史資料公式預測表"><thead><tr className="bg-[#f8fafc] text-[#475467]">{["局數", "閒1", "閒2", "閒3", "莊1", "莊2", "莊3", "閒點", "莊點", "結果"].map(name => <th key={name} className="min-w-11 border-b border-[#eaecf0] px-2 py-2.5 text-center text-[11px] font-bold whitespace-nowrap">{name}</th>)}{FORMULA_ORDER.map((name, index) => <th key={name} className="min-w-11 border-b border-[#eaecf0] px-2 py-2.5 text-center text-[11px] font-bold whitespace-nowrap">{formulaLabel(index)}</th>)}</tr></thead><tbody>{displayRows.map(row => <tr key={row.id ?? row.roundNo} className="bg-white text-[#344054] hover:bg-[#fcfcfd]"><td className="border-b border-[#eaecf0] px-2 py-2 text-center font-bold text-[#172033]">{row.roundNo}</td>{[0, 1, 2].map(index => <td key={`p-${index}`} className="min-w-11 border-b border-[#eaecf0] px-2 py-2 text-center font-medium">{cardLabel(row.playerCards[index])}</td>)}{[0, 1, 2].map(index => <td key={`b-${index}`} className="min-w-11 border-b border-[#eaecf0] px-2 py-2 text-center font-medium">{cardLabel(row.bankerCards[index])}</td>)}<td className="border-b border-[#eaecf0] px-2 py-2 text-center font-semibold">{row.playerPoint}</td><td className="border-b border-[#eaecf0] px-2 py-2 text-center font-semibold">{row.bankerPoint}</td><td className={`border-b border-[#eaecf0] px-2 py-2 text-center font-extrabold ${predictionTextClass(row.winner)}`}>{row.winner}</td>{FORMULA_ORDER.map((name, index) => <FormulaCell key={name} formula={rowFormula(row, name)} kind="history" label={formulaLabel(index)} />)}</tr>)}<tr data-testid="next-prediction-row" className="bg-[#f2f4f7] text-[#344054]"><td colSpan={10} className="border-b border-[#eaecf0] px-3 py-2.5 text-left font-bold">下一局 · 第 {latest.roundNo + 1} 局預測<span className="ml-2 text-[11px] font-medium text-[#667085]">僅預測，不計入命中</span></td>{FORMULA_ORDER.map((name, index) => <FormulaCell key={name} formula={rowFormula(latest, name)} kind="next" label={formulaLabel(index)} />)}</tr><tr data-testid="historical-hit-row" className="bg-[#f2f4f7] text-[#344054]"><td colSpan={10} className="px-3 py-2.5 text-left text-xs font-bold">已完成局數命中</td>{FORMULA_ORDER.map(name => { const value = historicalFormulaHits[name]; const className = value === highestHit && highestHit > 0 ? "text-[#b42318]" : value === lowestHit ? "text-[#175cd3]" : "text-[#344054]"; return <td key={name} className={`px-2 py-2.5 text-center text-xs font-extrabold ${className}`}>{value}</td>; })}</tr></tbody></table></div><CustomFormulaSection formulas={customFormulas} /></section>;
}
