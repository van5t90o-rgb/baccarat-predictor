import type { inferRouterOutputs } from "@trpc/server";
import { AdminShell } from "@/components/AdminShell";
import { AppHeader } from "@/components/AppHeader";
import { PaginationControls } from "@/components/PaginationControls";
import { Prediction } from "@/components/Prediction";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "../../../server/routers";

type RouterOutput = inferRouterOutputs<AppRouter>;
type FormulaPageData = RouterOutput["admin"]["storage"]["formulaList"];
type EventPageData = RouterOutput["admin"]["storage"]["eventList"];

export default function AdminStoragePage() {
  const [mode, setMode] = useState<"formulas" | "events">("formulas");
  const [search, setSearch] = useState("");
  const [tableId, setTableId] = useState("");
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();
  const query = { page, pageSize: 10, search: search || undefined, tableId: tableId || undefined };
  const formulas = trpc.admin.storage.formulaList.useQuery(query, { enabled: mode === "formulas" });
  const events = trpc.admin.storage.eventList.useQuery(query, { enabled: mode === "events" });
  const removeFormula = trpc.admin.storage.removeFormula.useMutation({ onSuccess: () => { utils.admin.storage.formulaList.invalidate(); toast.success("公式紀錄已取出。") }, onError: error => toast.error(error.message) });
  const removeEvent = trpc.admin.storage.removeEvent.useMutation({ onSuccess: () => { utils.admin.storage.eventList.invalidate(); toast.success("事件資料已取出。") }, onError: error => toast.error(error.message) });
  const pageData = mode === "formulas" ? formulas.data : events.data;
  const changeMode = (value: string) => { setMode(value as "formulas" | "events"); setPage(1); };

  return <AdminShell><div className="mx-auto max-w-[1320px]"><AppHeader eyebrow="STORAGE.PY" title="儲存空間" description="瀏覽、查詢與取出以 Aiven MySQL 保存的公式局數紀錄與事件模式；資料欄位與 Storage.py 對應。" /><Card className="mt-7 rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-5 sm:p-6"><Tabs value={mode} onValueChange={changeMode}><TabsList className="h-10 bg-[#F2F4F7]"><TabsTrigger value="formulas" className="rounded-lg px-5 data-[state=active]:bg-[#15243B] data-[state=active]:text-white">公式紀錄</TabsTrigger><TabsTrigger value="events" className="rounded-lg px-5 data-[state=active]:bg-[#15243B] data-[state=active]:text-white">事件儲存</TabsTrigger></TabsList></Tabs><div className="mt-6 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><Input value={search} placeholder={mode === "formulas" ? "搜尋桌號或結果" : "搜尋事件或桌號"} onChange={event => { setSearch(event.target.value); setPage(1); }} className="h-10 border-[#E2E7EE] pl-9" /></div><Input value={tableId} placeholder="以桌號篩選（選填）" onChange={event => { setTableId(event.target.value.toUpperCase()); setPage(1); }} className="h-10 max-w-full border-[#E2E7EE] uppercase md:max-w-56" /></div>{mode === "formulas" ? <FormulaRows data={formulas.data} loading={formulas.isLoading} onRemove={id => removeFormula.mutate({ id })} /> : <EventRows data={events.data} loading={events.isLoading} onRemove={id => removeEvent.mutate({ id })} />}{pageData && <div className="mt-5"><PaginationControls page={page} total={pageData.total} totalPages={pageData.totalPages} onPageChange={setPage} /></div>}</CardContent></Card></div></AdminShell>;
}

function FormulaRows({ data, loading, onRemove }: { data: FormulaPageData | undefined; loading: boolean; onRemove: (id: number) => void }) { return <div className="mt-5 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>桌號 / 局數</TableHead><TableHead>閒牌 / 點數</TableHead><TableHead>莊牌 / 點數</TableHead><TableHead>結果</TableHead><TableHead>公式數</TableHead><TableHead className="text-right">取出</TableHead></TableRow></TableHeader><TableBody>{loading ? <EmptyRows columns={6} text="讀取中…" /> : data?.items.length ? data.items.map(item => <TableRow key={item.id}><TableCell><p className="font-semibold text-[#15243B]">{item.tableId}</p><p className="text-xs text-slate-400">第 {item.roundNo} 局</p></TableCell><TableCell>{item.playerCards.join("、")} <span className="text-slate-400">/ {item.playerPoint} 點</span></TableCell><TableCell>{item.bankerCards.join("、")} <span className="text-slate-400">/ {item.bankerPoint} 點</span></TableCell><TableCell><Prediction value={item.winner} /></TableCell><TableCell>{Object.keys(item.formulas).length}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onRemove(item.id!)}><Trash2 className="size-4" /></Button></TableCell></TableRow>) : <EmptyRows columns={6} text="尚無公式紀錄。" />}</TableBody></Table></div>; }
function EventRows({ data, loading, onRemove }: { data: EventPageData | undefined; loading: boolean; onRemove: (id: number) => void }) { return <div className="mt-5 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>事件</TableHead><TableHead>桌號 / 局數</TableHead><TableHead>點差</TableHead><TableHead>理數</TableHead><TableHead>導數</TableHead><TableHead>真數</TableHead><TableHead>HZ</TableHead><TableHead>價值</TableHead><TableHead className="text-right">取出</TableHead></TableRow></TableHeader><TableBody>{loading ? <EmptyRows columns={9} text="讀取中…" /> : data?.items.length ? data.items.map(item => <TableRow key={item.id}><TableCell className="font-semibold text-[#8B6522]">{item.eventName}</TableCell><TableCell>{item.tableId}<span className="ml-1 text-xs text-slate-400">第 {item.roundNo} 局</span></TableCell><TableCell><Prediction value={item.點差} /></TableCell><TableCell><Prediction value={item.理數} /></TableCell><TableCell><Prediction value={item.導數} /></TableCell><TableCell><Prediction value={item.真數} /></TableCell><TableCell><Prediction value={item.HZ} /></TableCell><TableCell><Prediction value={item.價值} /></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => onRemove(item.id)}><Trash2 className="size-4" /></Button></TableCell></TableRow>) : <EmptyRows columns={9} text="尚無事件資料。" />}</TableBody></Table></div>; }
function EmptyRows({ columns, text }: { columns: number; text: string }) { return <TableRow><TableCell colSpan={columns} className="h-28 text-center text-slate-400">{text}</TableCell></TableRow>; }
