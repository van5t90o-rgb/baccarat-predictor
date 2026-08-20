import type { inferRouterOutputs } from "@trpc/server";
import { AppHeader } from "@/components/AppHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { Prediction } from "@/components/Prediction";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AppRouter } from "../../../server/routers";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type FormulaPageData = RouterOutput["baccarat"]["storage"]["formulaList"];
type EventPageData = RouterOutput["baccarat"]["storage"]["eventList"];
type Deposit = { tableId: string; playerWins: string; bankerWins: string; tieCount: string; playerCards: string; bankerCards: string };
const initialDeposit: Deposit = { tableId: "", playerWins: "0", bankerWins: "0", tieCount: "0", playerCards: "", bankerCards: "" };

export default function StoragePage() {
  const [mode, setMode] = useState<"formulas" | "events">("formulas");
  const [search, setSearch] = useState("");
  const [tableId, setTableId] = useState("");
  const [page, setPage] = useState(1);
  const [depositOpen, setDepositOpen] = useState(false);
  const [deposit, setDeposit] = useState<Deposit>(initialDeposit);
  const utils = trpc.useUtils();
  const query = { page, pageSize: 10, search, tableId: tableId || undefined };
  const formulas = trpc.baccarat.storage.formulaList.useQuery(query, { enabled: mode === "formulas" });
  const events = trpc.baccarat.storage.eventList.useQuery(query, { enabled: mode === "events" });
  const deleteFormula = trpc.baccarat.formulas.remove.useMutation({ onSuccess: () => { utils.baccarat.storage.formulaList.invalidate(); toast.success("公式紀錄已取出並刪除。"); }, onError: error => toast.error(error.message) });
  const deleteEvent = trpc.baccarat.storage.removeEvent.useMutation({ onSuccess: () => { utils.baccarat.storage.eventList.invalidate(); toast.success("事件紀錄已取出並刪除。"); }, onError: error => toast.error(error.message) });
  const saveFormula = trpc.baccarat.formulas.calculateAndStore.useMutation({
    onSuccess: () => { setDepositOpen(false); setDeposit(initialDeposit); utils.baccarat.storage.formulaList.invalidate(); utils.baccarat.storage.eventList.invalidate(); toast.success("公式紀錄已存入儲存空間。"); },
    onError: error => toast.error(error.message),
  });
  const pageData = mode === "formulas" ? formulas.data : events.data;
  const changeMode = (value: string) => { setMode(value as "formulas" | "events"); setPage(1); };
  const setDepositField = (key: keyof Deposit, value: string) => setDeposit(current => ({ ...current, [key]: key === "tableId" || key.endsWith("Cards") ? value.toUpperCase() : value }));
  const cards = (key: "playerCards" | "bankerCards") => deposit[key].split(",").map(card => card.trim()).filter(Boolean);
  const submitDeposit = () => saveFormula.mutate({ tableId: deposit.tableId, playerWins: Number(deposit.playerWins) || 0, bankerWins: Number(deposit.bankerWins) || 0, tieCount: Number(deposit.tieCount) || 0, playerCards: cards("playerCards"), bankerCards: cards("bankerCards") });

  return <div className="mx-auto max-w-[1320px]">
    <AppHeader eyebrow="STORAGE.PY" title="儲存空間" description="瀏覽、查詢、存入與取出以 MySQL 保存的公式局數紀錄與事件模式；資料欄位與 Storage.py 完整對應。" action={<Button className="bg-[#15243B] text-white hover:bg-[#213856]" onClick={() => setDepositOpen(open => !open)}><Plus className="size-4" />存入公式紀錄</Button>} />
    {depositOpen && <Card className="mb-5 rounded-2xl border-[#E5D9BB] bg-[#FFFDF7] shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-5"><p className="text-xs font-bold tracking-[0.15em] text-[#A27C2E]">INSERT_FORMULA</p><p className="mt-1 text-sm text-slate-500">依 Formula.py 計算並寫入下一局紀錄；牌面請以逗號分隔，例如 <b>A,2,3</b>。</p><div className="mt-4 grid gap-3 md:grid-cols-6"><Input value={deposit.tableId} placeholder="桌號" onChange={event => setDepositField("tableId", event.target.value)} /><Input type="number" min={0} value={deposit.playerWins} placeholder="閒勝" onChange={event => setDepositField("playerWins", event.target.value)} /><Input type="number" min={0} value={deposit.bankerWins} placeholder="莊勝" onChange={event => setDepositField("bankerWins", event.target.value)} /><Input type="number" min={0} value={deposit.tieCount} placeholder="和局" onChange={event => setDepositField("tieCount", event.target.value)} /><Input value={deposit.playerCards} placeholder="閒牌：A,2,3" onChange={event => setDepositField("playerCards", event.target.value)} /><Input value={deposit.bankerCards} placeholder="莊牌：K,4,5" onChange={event => setDepositField("bankerCards", event.target.value)} /></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" className="border-[#E3D5B1] bg-white" onClick={() => setDepositOpen(false)}>取消</Button><Button className="bg-[#15243B] text-white hover:bg-[#213856]" onClick={submitDeposit} disabled={saveFormula.isPending}>確認存入</Button></div></CardContent></Card>}
    <Card className="rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-5 sm:p-6"><Tabs value={mode} onValueChange={changeMode}><TabsList className="h-10 bg-[#F2F4F7]"><TabsTrigger value="formulas" className="rounded-lg px-5 data-[state=active]:bg-[#15243B] data-[state=active]:text-white">公式紀錄</TabsTrigger><TabsTrigger value="events" className="rounded-lg px-5 data-[state=active]:bg-[#15243B] data-[state=active]:text-white">事件儲存</TabsTrigger></TabsList></Tabs><div className="mt-6 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><Input value={search} placeholder={mode === "formulas" ? "搜尋桌號或結果" : "搜尋事件或桌號"} onChange={event => { setSearch(event.target.value); setPage(1); }} className="h-10 border-[#E2E7EE] pl-9 focus-visible:ring-[#C9A355]" /></div><Input value={tableId} placeholder="以桌號篩選（選填）" onChange={event => { setTableId(event.target.value.toUpperCase()); setPage(1); }} className="h-10 max-w-full border-[#E2E7EE] uppercase md:max-w-56 focus-visible:ring-[#C9A355]" /></div>{mode === "formulas" ? <FormulaStorageTable data={formulas.data} loading={formulas.isLoading} onRemove={id => deleteFormula.mutate({ id })} /> : <EventStorageTable data={events.data} loading={events.isLoading} onRemove={id => deleteEvent.mutate({ id })} />}{pageData && <div className="mt-5"><PaginationControls page={page} total={pageData.total} totalPages={pageData.totalPages} onPageChange={setPage} /></div>}</CardContent></Card>
  </div>;
}

function FormulaStorageTable({ data, loading, onRemove }: { data: FormulaPageData | undefined; loading: boolean; onRemove: (id: number) => void }) { return <div className="mt-5 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>桌號 / 局數</TableHead><TableHead>閒牌 / 點數</TableHead><TableHead>莊牌 / 點數</TableHead><TableHead>結果</TableHead><TableHead>公式數</TableHead><TableHead className="text-right">取出</TableHead></TableRow></TableHeader><TableBody>{loading ? <EmptyRows columns={6} text="讀取中…" /> : data?.items.length ? data.items.map(item => <TableRow key={item.id}><TableCell><p className="font-semibold text-[#15243B]">{item.tableId}</p><p className="text-xs text-slate-400">第 {item.roundNo} 局</p></TableCell><TableCell>{item.playerCards.join("、")} <span className="text-slate-400">/ {item.playerPoint} 點</span></TableCell><TableCell>{item.bankerCards.join("、")} <span className="text-slate-400">/ {item.bankerPoint} 點</span></TableCell><TableCell><Prediction value={item.winner} /></TableCell><TableCell>{Object.keys(item.formulas).length}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onRemove(item.id!)}><Trash2 className="size-4" /></Button></TableCell></TableRow>) : <EmptyRows columns={6} text="尚無公式紀錄。" />}</TableBody></Table></div>; }
function EventStorageTable({ data, loading, onRemove }: { data: EventPageData | undefined; loading: boolean; onRemove: (id: number) => void }) { return <div className="mt-5 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>事件</TableHead><TableHead>桌號 / 局數</TableHead><TableHead>點差</TableHead><TableHead>理數</TableHead><TableHead>導數</TableHead><TableHead>真數</TableHead><TableHead>HZ</TableHead><TableHead>價值</TableHead><TableHead className="text-right">取出</TableHead></TableRow></TableHeader><TableBody>{loading ? <EmptyRows columns={9} text="讀取中…" /> : data?.items.length ? data.items.map(item => <TableRow key={item.id}><TableCell className="font-semibold text-[#8B6522]">{item.eventName}</TableCell><TableCell>{item.tableId}<span className="ml-1 text-xs text-slate-400">第 {item.roundNo} 局</span></TableCell><TableCell><Prediction value={item.點差} /></TableCell><TableCell><Prediction value={item.理數} /></TableCell><TableCell><Prediction value={item.導數} /></TableCell><TableCell><Prediction value={item.真數} /></TableCell><TableCell><Prediction value={item.HZ} /></TableCell><TableCell><Prediction value={item.價值} /></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="size-4" /></Button></TableCell></TableRow>) : <EmptyRows columns={9} text="尚無事件資料。" />}</TableBody></Table></div>; }
function EmptyRows({ columns, text }: { columns: number; text: string }) { return <TableRow><TableCell colSpan={columns} className="h-28 text-center text-slate-400">{text}</TableCell></TableRow>; }
