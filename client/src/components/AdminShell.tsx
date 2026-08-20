import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Archive, KeyRound, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const navigation = [
  { path: "/admin/storage", label: "儲存空間", icon: Archive },
  { path: "/admin/security", label: "帳號與密碼", icon: KeyRound },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const status = trpc.admin.status.useQuery(undefined, { retry: false });
  const logout = trpc.admin.logout.useMutation({ onSuccess: () => navigate("/admin/login") });

  useEffect(() => {
    if (status.data && !status.data.authenticated) navigate("/admin/login");
  }, [navigate, status.data]);

  if (status.isLoading || !status.data?.authenticated) return <div className="min-h-screen bg-[#F5F6F8]" />;

  return <div className="min-h-screen bg-[#F5F6F8] lg:grid lg:grid-cols-[266px_minmax(0,1fr)]">
    <aside className="border-b border-[#E7EAF0] bg-white px-4 py-5 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
      <div className="flex items-center gap-3 px-2"><div className="flex size-9 items-center justify-center rounded-xl bg-[#F4F6FA] text-[#627088]"><LayoutDashboard className="size-4" /></div><div><p className="text-[10px] font-bold tracking-[0.18em] text-[#A27C2E]">BACCARAT</p><p className="font-serif text-xl font-semibold text-[#15243B]">Predictor Ledger</p></div></div>
      <p className="mt-10 px-2 text-[10px] font-bold tracking-[0.16em] text-slate-400">管理模組</p>
      <nav className="mt-3 flex gap-2 overflow-x-auto lg:flex-col">{navigation.map(item => { const Icon = item.icon; const active = location === item.path; return <button key={item.path} onClick={() => navigate(item.path)} className={`inline-flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-[#15243B] text-white shadow-[0_8px_18px_rgba(21,36,59,0.18)]" : "text-[#344156] hover:bg-[#F1F4F8]"}`}><Icon className="size-4" />{item.label}</button>; })}</nav>
      <div className="mt-8 hidden rounded-2xl border border-[#E8E1D1] bg-[#FFFCF6] p-4 lg:block"><div className="flex items-center gap-2 text-[#8C6825]"><ShieldCheck className="size-4" /><p className="text-xs font-bold">已登入後台</p></div><p className="mt-2 text-xs leading-5 text-slate-500">使用者：{status.data.username}</p></div>
      <div className="mt-8 border-t border-[#EEF0F4] pt-4"><Button variant="ghost" className="w-full justify-start text-slate-500 hover:bg-[#FFF3F3] hover:text-[#C53E3E]" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut className="size-4" />登出後台</Button></div>
    </aside>
    <main className="min-w-0 p-4 sm:p-6 lg:p-9">{children}</main>
  </div>;
}
