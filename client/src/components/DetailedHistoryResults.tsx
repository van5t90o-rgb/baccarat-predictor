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

function cardLabel(value?: number) {
  if (value === undefined) return "";
  return ({ 1: "A", 11: "J", 12: "Q", 13: "K" } as Record<number, string>)[value] ?? String(value);
}

function predictionTextClass(value: Prediction) {
  if (value === "閒") return "text-[#0057FF]";
  if (value === "莊") return "text-[#E00000]";
  return "text-[#203044]";
}

function predictionCellClass(value: Prediction) {
  if (value === "莊") return "bg-[#F10B0B] text-white";
  if (value === "閒") return "bg-white text-[#0057FF]";
  if (value === "和") return "bg-[#F6F8FA] text-[#203044]";
  return "bg-white text-slate-300";
}

function CustomFormulaSection({ formulas }: { formulas: CustomFormulaPreview[] }) {
  if (!formulas.length) return null;
  return <section className="mt-4 rounded-xl border border-[#E7D9B8] bg-[#FFFCF5] px-4 py-3" data-testid="custom-formula-history-section"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-semibold tracking-[0.13em] text-[#A27C2E]">CUSTOM RULES</p><p className="mt-0.5 text-sm font-bold text-[#15243B]">本局自訂公式預測</p></div><Badge variant="outline" className="border-[#E3D1A9] bg-white text-[#8C6825]">{formulas.length} 項</Badge></div><div className="mt-3 flex flex-wrap gap-2">{formulas.map(formula => <article key={formula.id} className="min-w-40 rounded-lg border border-[#E9E0CF] bg-white px-3 py-2" title={formula.expression}><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-bold text-[#45546A]">{formula.name}</p><span className={`font-serif text-lg font-semibold ${predictionTextClass(formula.prediction)}`}>{formula.prediction || "—"}</span></div><p className="mt-1 text-[11px] text-slate-400">運算值 {formula.value}</p></article>)}</div></section>;
}

function FormulaCell({ formula, kind }: { formula?: DetailedFormula; kind: "history" | "next" }) {
  const prediction = kind === "history" ? formula?.previousPrediction ?? "" : formula?.nextPrediction ?? "";
  const value = formula?.value ?? "—";
  const label = kind === "history" ? `${formula?.name ?? "公式"}：${prediction || "—"}；運算值 ${value}` : `${formula?.name ?? "公式"}：下一局預測 ${prediction || "—"}；運算值 ${value}`;
  return <td className={`min-w-10 border border-[#212121] px-1 py-0.5 text-center text-xs font-bold leading-4 ${predictionCellClass(prediction)}`} title={label}>{prediction || "—"}</td>;
}

export function DetailedHistoryResults({ items, loading, customFormulas = [] }: { items: DetailedHistoryRow[]; loading: boolean; customFormulas?: CustomFormulaPreview[] }) {
  if (loading) return <p className="mt-5 rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm text-slate-400">正在載入歷史資料…</p>;
  if (!items.length) return <div className="mt-5" data-testid="detailed-history-results"><p className="rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm leading-6 text-slate-500">尚無本桌公式紀錄；確認並儲存第一局後，這裡會顯示逐局牌面、點數、勝負與全部公式結果。</p><CustomFormulaSection formulas={customFormulas} /></div>;

  const chronological = [...items].reverse();
  const displayRows = chronological.slice(-HISTORY_VISIBLE_ROWS);
  const latest = chronological.at(-1)!;
  const formulaHits = Object.fromEntries(FORMULA_ORDER.map(name => [name, chronological.reduce((total, row) => total + (row.formulas.find(formula => formula.name === name)?.status === "hit" ? 1 : 0), 0)]));
  const rowFormula = (row: DetailedHistoryRow, name: string) => row.formulas.find(formula => formula.name === name);

  return <section className="mt-5" data-testid="detailed-history-results"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">橫向捲動可查看全部十八項 Formula.py 公式；紅底為莊預測，藍字為閒預測。</p><p className="text-xs font-semibold text-[#6B7A90]">顯示最近 {displayRows.length} 局</p></div><div className="overflow-x-auto rounded-lg border border-[#212121] bg-white shadow-[0_3px_12px_rgba(21,36,59,0.05)]"><table className="min-w-[1880px] border-collapse text-sm" aria-label="歷史資料公式預測表"><thead><tr className="bg-[#F8F8F8] text-[#172235]">{["局數", "閒1", "閒2", "閒3", "莊1", "莊2", "莊3", "閒點", "莊點", "結果", ...FORMULA_ORDER].map(name => <th key={name} className="min-w-10 border border-[#212121] px-1 py-1 text-center text-xs font-bold whitespace-nowrap">{name}</th>)}</tr></thead><tbody>{displayRows.map(row => <tr key={row.id ?? row.roundNo} className="bg-white"><td className="border border-[#212121] px-1 py-0.5 text-center font-semibold text-[#15243B]">{row.roundNo}</td>{[0, 1, 2].map(index => <td key={`p-${index}`} className="min-w-11 border border-[#212121] px-1 py-0.5 text-center italic">{cardLabel(row.playerCards[index])}</td>)}{[0, 1, 2].map(index => <td key={`b-${index}`} className="min-w-11 border border-[#212121] px-1 py-0.5 text-center italic">{cardLabel(row.bankerCards[index])}</td>)}<td className="border border-[#212121] px-1 py-0.5 text-center">{row.playerPoint}</td><td className="border border-[#212121] px-1 py-0.5 text-center">{row.bankerPoint}</td><td className={`border border-[#212121] px-1 py-0.5 text-center font-bold ${predictionTextClass(row.winner)}`}>{row.winner}</td>{FORMULA_ORDER.map(name => <FormulaCell key={name} formula={rowFormula(row, name)} kind="history" />)}</tr>)}<tr className="bg-[#F9FBFD]"><td colSpan={10} className="border border-[#212121] px-2 py-1 text-left font-bold text-[#15243B]">下一局 · 第 {latest.roundNo + 1} 局預測</td>{FORMULA_ORDER.map(name => <FormulaCell key={name} formula={rowFormula(latest, name)} kind="next" />)}</tr><tr className="bg-[#F8F8F8]"><td colSpan={10} className="border border-[#212121] px-2 py-1 text-left text-xs font-bold text-[#45546A]">公式命中數</td>{FORMULA_ORDER.map(name => <td key={name} className="border border-[#212121] px-1 py-1 text-center text-xs font-bold text-[#15243B]">{formulaHits[name]}</td>)}</tr></tbody></table></div><CustomFormulaSection formulas={customFormulas} /></section>;
}
