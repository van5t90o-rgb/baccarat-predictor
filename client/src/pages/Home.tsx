import { AppHeader } from "@/components/AppHeader";
import { Prediction } from "@/components/Prediction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Database, ShieldCheck, TableProperties } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export const HISTORY_VISIBLE_ROWS = 12;
export const HISTORY_ROW_HEIGHT = 64;

export function shouldAutoScrollHistory(rowCount: number) {
  return rowCount > HISTORY_VISIBLE_ROWS;
}

export function historyStatusClass(status: "hit" | "miss" | "pending") {
  if (status === "hit") return "border-[#93D8B2] bg-[#F0FBF5] shadow-[0_3px_12px_rgba(46,130,94,0.08)]";
  if (status === "miss") return "border-[#F0DDDF] bg-[#FFF9F9]";
  return "border-[#E7ECF2] bg-[#FCFDFE]";
}

type HistoryRow = {
  id?: number;
  roundNo: number;
  nextRoundNo: number;
  formula: string;
  prediction: "閒" | "莊" | "和" | "";
  hits: number;
  accuracy: number;
  reversed: boolean;
  actualWinner: "閒" | "莊" | "和" | "";
  status: "hit" | "miss" | "pending";
};

export default function Home() {
  const [, navigate] = useLocation();
  const [tableId, setTableId] = useState("");
  const [playerWins, setPlayerWins] = useState("0");
  const [bankerWins, setBankerWins] = useState("0");
  const [tieCount, setTieCount] = useState("0");

  const beginAnalysis = () => {
    const table = tableId.trim().toUpperCase();
    if (!table) {
      toast.error("請先輸入桌號。");
      return;
    }
    const params = new URLSearchParams({ table, playerWins, bankerWins, tieCount });
    navigate(`/analysis?${params.toString()}`);
  };

  return <div className="mx-auto max-w-[1080px]">
    <AppHeader eyebrow="TABLE SETUP" title="桌局設定" description="先確認桌號與目前閒、莊、和局數；確認後才會進入本局牌面與公式分析。" action={<div className="flex flex-wrap items-center justify-end gap-2"><Badge className="w-fit rounded-full border border-[#E8D9B5] bg-[#FFF9EB] px-3 py-1.5 text-[#94702B] hover:bg-[#FFF9EB]">資料庫連線模式</Badge><Button variant="outline" size="sm" className="border-[#DCE4EE] bg-white text-[#344156]" onClick={() => navigate("/admin/login")}><ShieldCheck className="size-4" />後台管理</Button></div>} />
    <Card className="overflow-hidden rounded-2xl border-[#E7EAF0] bg-white shadow-[0_12px_36px_rgba(21,36,59,0.06)]"><CardContent className="p-6 sm:p-9"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]"><div><div className="flex items-start gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#15243B] text-white"><TableProperties className="size-5" /></div><div><p className="text-xs font-semibold tracking-[0.15em] text-[#A27C2E]">STEP 01</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#15243B]">輸入本桌初始紀錄</h2><p className="mt-2 text-sm leading-6 text-slate-500">局數會作為分析頁第一局的起點；後續每一局將由系統依牌面結果自動更新。</p></div></div><div className="mt-8 grid gap-4 sm:grid-cols-2"><SetupField label="桌號" value={tableId} onChange={value => setTableId(value.toUpperCase())} placeholder="例如 A01" /><SetupField label="閒勝" value={playerWins} type="number" onChange={setPlayerWins} /><SetupField label="莊勝" value={bankerWins} type="number" onChange={setBankerWins} /><SetupField label="和局" value={tieCount} type="number" onChange={setTieCount} /></div><div className="mt-8 flex flex-col gap-3 border-t border-[#EEF0F4] pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">設定完成後，將前往本局牌面輸入與預測頁面。</p><Button className="bg-[#15243B] text-white hover:bg-[#213856]" onClick={beginAnalysis}><ArrowRight className="size-4" />確認並進入分析</Button></div></div><div className="rounded-2xl border border-[#E6D9B9] bg-[#FFFCF4] p-6"><Database className="size-5 text-[#A27C2E]" /><p className="mt-5 text-xs font-bold tracking-[0.15em] text-[#A27C2E]">WORKFLOW</p><ol className="mt-3 space-y-3 text-sm leading-6 text-[#506078]"><li><b className="mr-2 text-[#15243B]">01</b>確認桌局初始數據</li><li><b className="mr-2 text-[#15243B]">02</b>輸入閒、莊牌面</li><li><b className="mr-2 text-[#15243B]">03</b>查看公式預測與歷程</li></ol></div></div></CardContent></Card>
  </div>;
}

function SetupField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-500">{label}</span><Input type={type} min={type === "number" ? 0 : undefined} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="h-11 border-[#E2E7EE] bg-white focus-visible:ring-[#C9A355]" /></label>;
}

function Empty({ text }: { text: string }) { return <p className="mt-6 rounded-xl border border-dashed border-[#E3E7EE] bg-[#FAFBFC] px-4 py-5 text-sm leading-6 text-slate-400">{text}</p>; }

export function InlineHistory({ rows, loading, active }: { rows: HistoryRow[]; loading: boolean; active: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => { const element = viewport.current; if (!element || !shouldAutoScrollHistory(rows.length)) return; let frame = 0; let previous = performance.now(); const scroll = (now: number) => { if (!element.matches(":hover") && !document.hidden) { element.scrollTop += (now - previous) * 0.018; if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) element.scrollTop = 0; } previous = now; frame = requestAnimationFrame(scroll); }; frame = requestAnimationFrame(scroll); return () => cancelAnimationFrame(frame); }, [rows.length]);
  if (!active) return <Empty text="輸入桌號後，這裡會直接顯示下一局預測、累計命中次數與最新命中結果。" />;
  if (loading) return <Empty text="正在載入公式歷程…" />;
  if (!rows.length) return <Empty text="尚無本桌公式紀錄；確認並儲存第一局後，歷程將直接顯示於此。" />;
  return <div className="mt-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#273B58]">下一局預測歷程</p><p className="text-xs text-slate-400">顯示區最多 {HISTORY_VISIBLE_ROWS} 筆；其餘資料會自動捲動</p></div><div ref={viewport} data-testid="history-viewport" style={{ maxHeight: `${HISTORY_VISIBLE_ROWS * HISTORY_ROW_HEIGHT}px` }} className="space-y-2 overflow-y-auto pr-1 [scrollbar-color:#d1d9e5_transparent] [scrollbar-width:thin]">{rows.map(row => <div key={`${row.id}-${row.roundNo}`} className={`grid h-16 grid-cols-[64px_minmax(0,1fr)_78px_auto] items-center gap-2 overflow-hidden rounded-xl border px-3 transition-colors sm:grid-cols-[88px_minmax(0,1fr)_130px_120px] sm:gap-3 ${historyStatusClass(row.status)}`}><div><p className="text-xs text-slate-400">第 {row.roundNo} 局</p><p className="text-xs font-semibold text-[#687890]">預測第 {row.nextRoundNo} 局</p></div><div className="flex min-w-0 items-center gap-2 sm:gap-3"><Prediction value={row.prediction} /><p className="truncate text-sm font-semibold text-[#243955]">{row.formula}{row.reversed ? "（反打）" : ""}</p></div><div><p className="text-xs text-slate-400">累計命中</p><p className="font-serif text-base font-semibold text-[#1B365D] sm:text-lg">{row.hits} <span className="text-[10px] font-medium text-slate-400 sm:text-xs">次 · {row.accuracy}%</span></p></div><div className="flex min-w-0 items-center justify-end gap-2">{row.status === "hit" ? <span className="rounded-full bg-[#19734B] px-2 py-1 text-[10px] font-bold text-white sm:px-2.5 sm:text-xs">✓ 命中</span> : row.status === "miss" ? <span className="rounded-full bg-[#B64A4A] px-2 py-1 text-[10px] font-bold text-white sm:px-2.5 sm:text-xs">未命中</span> : <span className="rounded-full bg-[#EAF0F7] px-2 py-1 text-[10px] font-semibold text-[#63758D] sm:px-2.5 sm:text-xs">待下一局</span>}{row.actualWinner && <span className="hidden text-xs font-semibold text-slate-500 sm:inline">實際：{row.actualWinner}</span>}</div></div>)}</div></div>;
}
