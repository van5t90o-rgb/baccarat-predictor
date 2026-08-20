import { Badge } from "@/components/ui/badge";
import { Check, CircleDotDashed, X } from "lucide-react";

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

const HISTORY_VISIBLE_ROWS = 9;

function cardLabel(value?: number) {
  if (value === undefined) return "—";
  return ({ 1: "A", 11: "J", 12: "Q", 13: "K" } as Record<number, string>)[value] ?? String(value);
}

function predictionClass(value: Prediction) {
  if (value === "閒") return "text-[#0057FF]";
  if (value === "莊") return "text-[#E00000]";
  if (value === "和") return "text-[#009B3A]";
  return "text-slate-400";
}

function statusMeta(status: DetailedFormula["status"]) {
  if (status === "hit") return { text: "命中", className: "border-[#F2B8B8] bg-[#FFF1F1] text-[#C62828]", Icon: Check };
  if (status === "miss") return { text: "未中", className: "border-[#DDE3EB] bg-[#F7F9FB] text-slate-500", Icon: X };
  return { text: "待驗證", className: "border-[#E7D9B8] bg-[#FFF9EC] text-[#986E23]", Icon: CircleDotDashed };
}

function FormulaResultCard({ formula }: { formula: DetailedFormula }) {
  const meta = statusMeta(formula.status);
  const Icon = meta.Icon;
  return <article className="rounded-xl border border-[#E8EBF0] bg-white p-3 shadow-[0_3px_12px_rgba(21,36,59,0.025)]" title={`${formula.name} 運算值：${formula.value ?? "—"}`}>
    <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-sm font-bold text-[#15243B]">{formula.name}</p><Badge variant="outline" className={`shrink-0 gap-1 rounded-full px-2 py-0.5 text-[11px] ${meta.className}`}><Icon className="size-3" />{meta.text}</Badge></div>
    <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[11px] text-slate-400">上局預測本局</p><p className={`mt-0.5 font-serif text-xl font-semibold ${predictionClass(formula.previousPrediction)}`}>{formula.previousPrediction || "—"}</p></div><div className="text-right"><p className="text-[11px] text-slate-400">運算值</p><p className="mt-0.5 text-sm font-semibold text-[#45546A]">{formula.value ?? "—"}</p></div></div>
  </article>;
}

function NextFormulaCard({ formula }: { formula: DetailedFormula }) {
  return <div className="rounded-xl border border-[#E8EBF0] bg-[#FCFDFE] p-3"><p className="truncate text-xs font-bold text-[#45546A]">{formula.name}</p><div className="mt-2 flex items-end justify-between"><span className={`font-serif text-xl font-semibold ${predictionClass(formula.nextPrediction)}`}>{formula.nextPrediction || "—"}</span><span className="text-[11px] text-slate-400">{formula.value ?? "—"}</span></div></div>;
}

function CardsLine({ label, cards, point, tone }: { label: "閒" | "莊"; cards: number[]; point: number; tone: "blue" | "red" }) {
  const toneClass = tone === "blue" ? "border-[#DCEAFF] bg-[#F7FBFF] text-[#0057FF]" : "border-[#F6D9D9] bg-[#FFF8F8] text-[#D94444]";
  return <div className={`rounded-xl border p-3 ${toneClass}`}><div className="flex items-center justify-between"><p className="text-xs font-bold">{label}牌</p><p className="font-serif text-lg font-semibold">{point}<span className="ml-0.5 text-[11px] font-medium">點</span></p></div><div className="mt-2 flex gap-1.5">{[0, 1, 2].map(index => <span key={index} className="inline-flex size-7 items-center justify-center rounded-lg bg-white text-sm font-bold shadow-sm">{cardLabel(cards[index])}</span>)}</div></div>;
}

function CustomFormulaSection({ formulas }: { formulas: CustomFormulaPreview[] }) {
  return <section className="mt-5 rounded-2xl border border-[#EADCBF] bg-[#FFFCF5] p-4 sm:p-5" data-testid="custom-formula-history-section"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.14em] text-[#A27C2E]">CUSTOM RULES</p><p className="mt-1 font-serif text-lg font-semibold text-[#15243B]">本局自訂公式預測</p></div><Badge variant="outline" className="border-[#E3D1A9] bg-white text-[#8C6825]">{formulas.length} 項</Badge></div>{formulas.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{formulas.map(formula => <article key={formula.id} className="rounded-xl border border-[#E9E0CF] bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#15243B]">{formula.name}</p><p className="mt-1 text-xs text-slate-400">運算值 {formula.value}</p></div><span className={`font-serif text-2xl font-semibold ${predictionClass(formula.prediction)}`}>{formula.prediction}</span></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500" title={formula.expression}>{formula.expression}</p></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-[#E5D9C3] bg-white/80 px-4 py-4 text-sm leading-6 text-slate-500">目前沒有啟用中的自訂公式。您可在「自訂公式」頁面建立或啟用公式。</p>}</section>;
}

export function DetailedHistoryResults({ items, loading, customFormulas = [] }: { items: DetailedHistoryRow[]; loading: boolean; customFormulas?: CustomFormulaPreview[] }) {
  if (loading) return <p className="mt-5 rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm text-slate-400">正在載入歷史資料…</p>;

  const chronological = [...items].reverse();
  const displayRows = chronological.slice(-HISTORY_VISIBLE_ROWS).reverse();
  const formulaNames = chronological[0]?.formulas.map(formula => formula.name) ?? [];
  const formulaHits = Object.fromEntries(formulaNames.map(name => [name, chronological.reduce((total, row) => total + (row.formulas.find(formula => formula.name === name)?.status === "hit" ? 1 : 0), 0)]));
  const latest = chronological.at(-1);

  if (!items.length) return <div className="mt-5" data-testid="detailed-history-results"><p className="rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm leading-6 text-slate-500">尚無本桌公式紀錄；確認並儲存第一局後，這裡會顯示逐局牌面、點數、勝負與全部公式結果。</p><CustomFormulaSection formulas={customFormulas} /></div>;

  return <div className="mt-5 space-y-4" data-testid="detailed-history-results"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[#DCE4EE] bg-white text-slate-500">紅色標記：命中</Badge><Badge variant="outline" className="border-[#DCE4EE] bg-white text-slate-500">顯示最新 {Math.min(items.length, HISTORY_VISIBLE_ROWS)} 局</Badge></div>{displayRows.map(row => <section key={row.id ?? row.roundNo} className="overflow-hidden rounded-2xl border border-[#E6EAF0] bg-[#FCFDFE]" aria-label={`第 ${row.roundNo} 局歷史資料`}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9ECF1] bg-white px-4 py-3 sm:px-5"><div className="flex items-center gap-3"><span className="font-serif text-lg font-semibold text-[#15243B]">第 {row.roundNo} 局</span><Badge variant="outline" className={`${predictionClass(row.winner)} border-current bg-white font-bold`}>{row.winner}</Badge>{row.playerPair && <Badge className="bg-[#EEF6FF] text-[#246FA9] hover:bg-[#EEF6FF]">閒對</Badge>}{row.bankerPair && <Badge className="bg-[#FFF0F0] text-[#B64A4A] hover:bg-[#FFF0F0]">莊對</Badge>}</div><p className="text-xs text-slate-400">閒勝 {row.playerWins} · 莊勝 {row.bankerWins} · 和局 {row.tieCount}</p></div><div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[280px_minmax(0,1fr)]"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><CardsLine label="閒" cards={row.playerCards} point={row.playerPoint} tone="blue" /><CardsLine label="莊" cards={row.bankerCards} point={row.bankerPoint} tone="red" /></div><div><p className="text-xs font-semibold tracking-[0.12em] text-[#A27C2E]">各公式結果</p><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{row.formulas.map(formula => <FormulaResultCard key={formula.name} formula={formula} />)}</div></div></div></section>)}{latest && <section className="rounded-2xl border border-[#DDE7F3] bg-[#F7FAFE] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold tracking-[0.14em] text-[#3B6F9F]">NEXT ROUND</p><p className="mt-1 font-serif text-lg font-semibold text-[#15243B]">下一局預測 · 第 {latest.roundNo + 1} 局</p></div><p className="text-xs text-slate-500">顯示最新一局各公式計算結果</p></div><div className="mt-4 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">{latest.formulas.map(formula => <NextFormulaCard key={formula.name} formula={formula} />)}</div></section>}<section className="rounded-2xl border border-[#E8EBF0] bg-white p-4 sm:p-5"><p className="text-xs font-semibold tracking-[0.14em] text-[#6B7A90]">公式命中數</p><div className="mt-3 grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">{formulaNames.map(name => <div key={name} className="rounded-xl border border-[#E8EBF0] bg-[#FCFDFE] px-3 py-2"><p className="truncate text-xs font-bold text-[#45546A]">{name}</p><p className="mt-1 font-serif text-xl font-semibold text-[#15243B]">{formulaHits[name]}</p></div>)}</div></section><CustomFormulaSection formulas={customFormulas} /></div>;
}
