import { AdminShell } from "@/components/AdminShell";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowRight, Database, KeyRound, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const formulas = trpc.admin.storage.formulaList.useQuery({ page: 1, pageSize: 1 });
  const events = trpc.admin.storage.eventList.useQuery({ page: 1, pageSize: 1 });
  const formulaTotal = formulas.data?.total ?? "—";
  const eventTotal = events.data?.total ?? "—";

  return <AdminShell><div className="mx-auto max-w-[1320px]" data-testid="admin-dashboard-page"><AppHeader eyebrow="ADMIN CONSOLE" title="後台管理" description="管理 Aiven MySQL 儲存空間、公式紀錄、事件模式與後台登入密碼。" /><section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><SummaryCard icon={Database} label="公式紀錄" value={formulaTotal} description="已保存的逐局公式計算結果" action="管理公式紀錄" onClick={() => navigate("/admin/storage")} /><SummaryCard icon={Archive} label="事件儲存" value={eventTotal} description="已保存的事件預警模式" action="瀏覽事件資料" onClick={() => navigate("/admin/storage")} /><SummaryCard icon={ShieldCheck} label="帳號安全" value="已保護" description="帳密以雜湊保存，支援主動變更密碼" action="修改登入密碼" onClick={() => navigate("/admin/security")} /></section><Card className="mt-5 rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-5 sm:p-7"><p className="text-[11px] font-bold tracking-[0.15em] text-[#A27C2E]">MANAGEMENT WORKFLOW</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#15243B]">後台操作導覽</h2><div className="mt-6 grid gap-3 lg:grid-cols-3"><GuideStep number="01" title="查看儲存資料" text="以桌號或關鍵字篩選公式紀錄與事件預警資料。" /><GuideStep number="02" title="取出不需要的資料" text="在資料列右側使用取出按鈕移除不再需要的紀錄。" /><GuideStep number="03" title="更新登入密碼" text="定期變更密碼；更新後其他既有登入工作階段會失效。" /></div><div className="mt-7 flex flex-wrap gap-3"><Button className="bg-[#15243B] text-white hover:bg-[#213856]" onClick={() => navigate("/admin/storage")}><Archive className="size-4" />前往儲存空間<ArrowRight className="size-4" /></Button><Button variant="outline" className="border-[#E2E7EE]" onClick={() => navigate("/admin/security")}><KeyRound className="size-4" />帳號與密碼</Button></div></CardContent></Card></div></AdminShell>;
}

function SummaryCard({ icon: Icon, label, value, description, action, onClick }: { icon: typeof Database; label: string; value: number | string; description: string; action: string; onClick: () => void }) {
  return <Card className="rounded-2xl border-[#E7EAF0] bg-white shadow-[0_6px_20px_rgba(21,36,59,0.04)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#F1F5FA] text-[#536E8F]"><Icon className="size-5" /></div><p className="font-serif text-3xl font-semibold text-[#15243B]">{value}</p></div><p className="mt-5 text-sm font-bold text-[#273B58]">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p><Button variant="link" className="mt-3 h-auto px-0 text-[#34587F]" onClick={onClick}>{action}<ArrowRight className="size-3.5" /></Button></CardContent></Card>;
}

function GuideStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="rounded-xl border border-[#E9EDF2] bg-[#FBFCFE] p-4"><p className="text-xs font-bold tracking-[0.14em] text-[#A27C2E]">{number}</p><p className="mt-2 text-sm font-bold text-[#273B58]">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></article>;
}
