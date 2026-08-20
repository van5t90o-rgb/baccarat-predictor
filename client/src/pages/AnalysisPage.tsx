import { AppHeader } from "@/components/AppHeader";
import { DetailedHistoryResults, type CustomFormulaPreview, type DetailedHistoryRow } from "@/components/DetailedHistoryResults";
import { Prediction } from "@/components/Prediction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Dices, History, Play, RotateCcw, Trophy } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/routers";
import { useLocation } from "wouter";

const cardMap: Record<string, number> = { A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13 };
const baccaratMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 0, 11: 0, 12: 0, 13: 0 };
type RouterOutput = inferRouterOutputs<AppRouter>;
type CalculationResponse = RouterOutput["baccarat"]["formulas"]["calculateAndStore"];

function previewCards(values: string[]) {
  const cards = values.map(value => cardMap[value.trim().toUpperCase()]).filter((value): value is number => typeof value === "number");
  return { cards, point: cards.reduce((sum, card) => sum + (baccaratMap[card] ?? 0), 0) % 10 };
}

function numericParam(params: URLSearchParams, name: string) {
  const value = Number(params.get(name) ?? 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export default function AnalysisPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const tableId = (params.get("table") ?? "").trim().toUpperCase();
  const initialCounts = { playerWins: numericParam(params, "playerWins"), bankerWins: numericParam(params, "bankerWins"), tieCount: numericParam(params, "tieCount") };
  const [playerCards, setPlayerCards] = useState(["", "", ""]);
  const [bankerCards, setBankerCards] = useState(["", "", ""]);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [playerPair, setPlayerPair] = useState(false);
  const [bankerPair, setBankerPair] = useState(false);
  const utils = trpc.useUtils();
  const history = trpc.baccarat.formulas.history.useQuery({ tableId }, { enabled: Boolean(tableId) });
  const historyDetails = trpc.baccarat.formulas.historyDetails.useQuery({ tableId }, { enabled: Boolean(tableId) });
  const countedRecord = [...(history.data ?? [])].reverse().find(row => row.playerWins + row.bankerWins + row.tieCount > 0);
  const counts = result?.record ?? countedRecord ?? initialCounts;
  const currentRound = counts.playerWins + counts.bankerWins + counts.tieCount;
  const existingRounds = new Set((history.data ?? []).map(row => row.roundNo));
  const missingRound = Array.from({ length: currentRound }, (_, index) => index + 1).find(round => !existingRounds.has(round));

  const resetTable = trpc.baccarat.storage.resetFormulaTable.useMutation({
    onSuccess: () => {
      utils.baccarat.formulas.history.invalidate();
      utils.baccarat.formulas.historyDetails.invalidate();
      utils.baccarat.formulas.list.invalidate();
      utils.baccarat.storage.formulaList.invalidate();
      setResult(null);
      toast.success("已清除本桌公式紀錄；事件紀錄已保留。");
      navigate("/");
    },
    onError: error => toast.error(error.message),
  });
  const calculate = trpc.baccarat.formulas.calculateAndStore.useMutation({
    onSuccess: data => {
      setResult(data);
      utils.baccarat.formulas.history.invalidate();
      utils.baccarat.formulas.historyDetails.invalidate();
      utils.baccarat.formulas.list.invalidate();
      utils.baccarat.storage.formulaList.invalidate();
      utils.baccarat.storage.eventList.invalidate();
      toast.success("本局已完成，結果已存入資料庫。");
    },
    onError: error => toast.error(error.message),
  });
  const supplement = trpc.baccarat.formulas.supplementHistory.useMutation({
    onSuccess: data => {
      setPlayerPair(false);
      setBankerPair(false);
      utils.baccarat.formulas.history.invalidate();
      utils.baccarat.formulas.historyDetails.invalidate();
      utils.baccarat.formulas.list.invalidate();
      utils.baccarat.storage.formulaList.invalidate();
      toast.success(`已補齊第 ${data.roundNo} 局歷史結果。`);
    },
    onError: error => toast.error(error.message),
  });
  const preview = useMemo(() => ({ player: previewCards(playerCards), banker: previewCards(bankerCards) }), [playerCards, bankerCards]);
  const liveWinner = preview.player.cards.length && preview.banker.cards.length ? preview.player.point > preview.banker.point ? "閒" : preview.player.point < preview.banker.point ? "莊" : "和" : "";
  const updateCard = (side: "player" | "banker", index: number, value: string) => {
    const setter = side === "player" ? setPlayerCards : setBankerCards;
    setter(previous => previous.map((card, cardIndex) => cardIndex === index ? value.toUpperCase() : card));
  };
  const resetCards = () => {
    setPlayerCards(["", "", ""]);
    setBankerCards(["", "", ""]);
    setResult(null);
  };

  if (!tableId) return <div className="mx-auto max-w-2xl"><AppHeader eyebrow="ANALYSIS" title="缺少桌局設定" description="請先回到桌局設定頁，輸入桌號與目前局數。" /><Button onClick={() => navigate("/")} className="bg-[#15243B] text-white"><ArrowLeft className="size-4" />返回桌局設定</Button></div>;

  return <div className="mx-auto max-w-[1440px]">
    <AppHeader eyebrow="CURRENT ROUND" title={`本局分析 · ${tableId}`} description="依 app.py 流程輸入閒、莊牌面；可補齊缺局並查看完整公式歷史。" action={<div className="flex flex-wrap items-center gap-2"><Badge className="rounded-full border border-[#E8D9B5] bg-[#FFF9EB] px-3 py-1.5 text-[#94702B] hover:bg-[#FFF9EB]">資料庫連線模式</Badge><Button variant="outline" className="border-[#E4D7B6] bg-white text-[#6D5425] hover:bg-[#FFF9EB]" onClick={() => resetTable.mutate({ tableId })} disabled={resetTable.isPending}><ArrowLeft className="size-4" />{resetTable.isPending ? "清除中" : "返回並清除公式紀錄"}</Button></div>} />
    <Card className="mb-5 overflow-hidden rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="grid gap-0 p-0 md:grid-cols-5"><Stat label="桌號" value={tableId} /><Stat label="閒勝" value={String(counts.playerWins)} tone="blue" /><Stat label="莊勝" value={String(counts.bankerWins)} tone="red" /><Stat label="和局" value={String(counts.tieCount)} tone="green" /><Stat label="目前局數" value={String(currentRound)} last /></CardContent></Card>
    <SupplementPanel missingRound={missingRound} currentRound={currentRound} playerPair={playerPair} bankerPair={bankerPair} onPlayerPair={setPlayerPair} onBankerPair={setBankerPair} disabled={supplement.isPending} onSubmit={winner => supplement.mutate({ tableId, ...counts, winner, playerPair, bankerPair })} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(350px,0.75fr)]">
      <Card className="rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-5 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold tracking-[0.15em] text-[#A27C2E]">CARD INPUT</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#15243B]">輸入閒／莊牌面</h2></div><Dices className="size-5 text-[#A27C2E]" /></div><div className="grid gap-4 lg:grid-cols-2"><CardHand title="閒" cards={playerCards} point={preview.player.point} onChange={(index, value) => updateCard("player", index, value)} tone="blue" /><CardHand title="莊" cards={bankerCards} point={preview.banker.point} onChange={(index, value) => updateCard("banker", index, value)} tone="red" /></div><div className="mt-6 flex flex-col justify-between gap-3 rounded-xl border border-[#E8EBF0] bg-[#FAFBFC] p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="text-sm text-slate-500">即時計算結果</span><Prediction value={liveWinner} /></div><div className="flex gap-2"><Button variant="outline" className="border-[#E2E7EE] bg-white" onClick={resetCards}><RotateCcw className="size-4" />重設牌面</Button><Button className="bg-[#15243B] text-white hover:bg-[#213856]" onClick={() => calculate.mutate({ tableId, ...counts, playerCards, bankerCards })} disabled={calculate.isPending}><Play className="size-4" />{calculate.isPending ? "計算中" : "確認並儲存"}</Button></div></div></CardContent></Card>
      <div className="space-y-5"><BestFormula result={result} /><EventWarning result={result} /></div>
    </div>
    <Card className="mt-5 rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.15em] text-[#A27C2E]">FORMULA RESULTS</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#15243B]">歷史資料</h2></div><Button variant="outline" size="sm" className="border-[#E2E7EE] bg-white" onClick={() => setHistoryOpen(open => !open)}>{historyOpen ? "收合" : "展開"}<ChevronDown className={`size-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} /></Button></div>{historyOpen && <DetailedHistoryResults items={(historyDetails.data?.items ?? []) as DetailedHistoryRow[]} loading={historyDetails.isLoading} customFormulas={(result?.customFormulas ?? []) as CustomFormulaPreview[]} />}</CardContent></Card>
  </div>;
}

function Stat({ label, value, tone, last = false }: { label: string; value: string; tone?: "blue" | "red" | "green"; last?: boolean }) {
  const colors = { blue: "text-[#1C69B3]", red: "text-[#B64A4A]", green: "text-[#2E825E]" };
  return <div className={`min-w-0 px-5 py-4 ${!last ? "border-b border-[#EEF0F4] md:border-b-0 md:border-r" : ""}`}><p className="text-[11px] font-medium text-slate-400">{label}</p><p className={`mt-1 truncate font-serif text-2xl font-semibold ${tone ? colors[tone] : "text-[#15243B]"}`}>{value}</p></div>;
}

function SupplementPanel({ missingRound, currentRound, playerPair, bankerPair, onPlayerPair, onBankerPair, disabled, onSubmit }: { missingRound: number | undefined; currentRound: number; playerPair: boolean; bankerPair: boolean; onPlayerPair: (value: boolean) => void; onBankerPair: (value: boolean) => void; disabled: boolean; onSubmit: (winner: "閒" | "莊" | "和") => void }) {
  const complete = currentRound > 0 && !missingRound;
  return <Card className="mb-5 rounded-2xl border-[#E6D9B9] bg-[#FFFCF4] shadow-[0_8px_28px_rgba(21,36,59,0.035)]"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="text-xs font-bold tracking-[0.14em] text-[#A27C2E]">SUPPLEMENT HISTORY</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#15243B]">補齊歷史資料</h2><p className="mt-1 text-sm text-slate-500">{currentRound <= 0 ? "目前局數為 0" : complete ? "歷史資料已完整" : `待補局數：${missingRound}`}</p></div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-slate-600"><Checkbox checked={playerPair} onCheckedChange={checked => onPlayerPair(checked === true)} disabled={disabled || !missingRound} />閒對</label><label className="flex items-center gap-2 text-sm text-slate-600"><Checkbox checked={bankerPair} onCheckedChange={checked => onBankerPair(checked === true)} disabled={disabled || !missingRound} />莊對</label><div className="flex gap-2"><Button size="sm" variant="outline" className="border-[#BFDDF5] bg-white text-[#1C69B3] hover:bg-[#F4FAFF]" disabled={disabled || !missingRound} onClick={() => onSubmit("閒")}>閒</Button><Button size="sm" variant="outline" className="border-[#F2CBCC] bg-white text-[#B64A4A] hover:bg-[#FFF7F7]" disabled={disabled || !missingRound} onClick={() => onSubmit("莊")}>莊</Button><Button size="sm" variant="outline" className="border-[#C5E6D4] bg-white text-[#28764E] hover:bg-[#F1FBF5]" disabled={disabled || !missingRound} onClick={() => onSubmit("和")}>和</Button></div></div></CardContent></Card>;
}

function CardHand({ title, cards, point, onChange, tone }: { title: string; cards: string[]; point: number; onChange: (index: number, value: string) => void; tone: "blue" | "red" }) {
  return <div className={`rounded-2xl border p-5 ${tone === "blue" ? "border-[#D8E9F8] bg-[#F8FBFF]" : "border-[#F3DADA] bg-[#FFF9F9]"}`}><div className="flex items-center justify-between"><h3 className={`font-serif text-xl font-semibold ${tone === "blue" ? "text-[#1C69B3]" : "text-[#B64A4A]"}`}>{title}</h3><span className="font-serif text-3xl font-bold text-[#15243B]">{cards.filter(Boolean).length ? point : "—"}<span className="ml-1 text-xs font-medium text-slate-400">點</span></span></div><div className="mt-5 grid grid-cols-3 gap-2">{cards.map((card, index) => <Input key={`${title}-${index}`} value={card} maxLength={2} placeholder={`牌 ${index + 1}`} onChange={event => onChange(index, event.target.value)} className="h-11 border-white bg-white text-center font-bold uppercase shadow-sm focus-visible:ring-[#C9A355]" />)}</div></div>;
}

function BestFormula({ result }: { result: CalculationResponse | null }) {
  return <Card className="rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold tracking-[0.15em] text-[#A27C2E]">BEST FORMULA</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#15243B]">最佳公式預測</h2></div><Trophy className="size-5 text-[#C9A355]" /></div>{result ? <div className="mt-7"><Prediction value={result.best.decision} large /><p className="mt-5 text-sm font-bold text-[#15243B]">最佳公式：{result.best.bestFormula || "無法決定"}{result.best.reversed ? "（反打）" : ""}</p><p className="mt-2 text-xs leading-5 text-slate-500">{result.best.reason}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span>分析局數 {result.best.analysisTotal}</span><span>命中 {result.best.hits}</span><span>命中率 {result.best.accuracy}%</span></div></div> : <Empty text="完成本局確認後，將依歷程提供最佳公式預測。" />}</CardContent></Card>;
}

function EventWarning({ result }: { result: CalculationResponse | null }) {
  return <Card className="rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-6"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-[#C38A35]" /><h2 className="font-serif text-xl font-semibold text-[#15243B]">事件預警</h2></div>{result?.event.matched ? <div className="mt-4 rounded-xl border border-[#F1DEB8] bg-[#FFFAED] p-4 text-sm font-semibold text-[#8B6522]">偵測到事件：{result.event.events.join("、")}</div> : <p className="mt-4 text-sm text-slate-500">{result ? "目前沒有符合的歷史事件模式。" : "確認本局後會依上一局六項公式進行比對。"}</p>}</CardContent></Card>;
}

function Empty({ text }: { text: string }) {
  return <p className="mt-6 rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm leading-6 text-slate-400">{text}</p>;
}
