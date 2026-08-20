import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const status = trpc.admin.status.useQuery(undefined, { retry: false });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.admin.login.useMutation({
    onSuccess: () => { toast.success("後台登入成功。"); navigate("/admin/storage"); },
    onError: error => toast.error(error.message),
  });
  useEffect(() => { if (status.data?.authenticated) navigate("/admin/storage"); }, [navigate, status.data]);
  const submit = (event: FormEvent) => { event.preventDefault(); login.mutate({ username, password }); };

  return <main className="grid min-h-screen place-items-center overflow-hidden bg-[#F3F5F8] p-5"><div className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(circle_at_20%_20%,rgba(210,180,108,0.18),transparent_27%),radial-gradient(circle_at_80%_85%,rgba(35,65,110,0.13),transparent_30%)]" /><Card className="relative w-full max-w-[460px] rounded-[2rem] border-white bg-white/95 shadow-[0_28px_80px_rgba(18,32,54,0.16)]"><CardContent className="p-7 sm:p-10"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#15243B] text-[#DFC37F]"><ShieldCheck className="size-7" /></div><p className="mt-7 text-center text-[11px] font-bold tracking-[0.22em] text-[#A27C2E]">BACCARAT MANAGEMENT</p><h1 className="mt-2 text-center font-serif text-3xl font-semibold text-[#15243B]">後台管理登入</h1><p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-slate-500">登入後可讀取 MySQL 儲存空間內容、管理公式與事件資料，並修改後台密碼。</p><form className="mt-8 space-y-5" onSubmit={submit}><div className="space-y-2"><Label htmlFor="admin-username">帳號</Label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><Input id="admin-username" value={username} autoComplete="username" onChange={event => setUsername(event.target.value)} className="h-11 border-[#E2E7EE] pl-9" required /></div></div><div className="space-y-2"><Label htmlFor="admin-password">密碼</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><Input id="admin-password" type="password" value={password} autoComplete="current-password" onChange={event => setPassword(event.target.value)} className="h-11 border-[#E2E7EE] pl-9" required /></div></div><Button type="submit" className="mt-2 h-11 w-full bg-[#15243B] text-white hover:bg-[#213856]" disabled={login.isPending}><KeyRound className="size-4" />{login.isPending ? "登入驗證中" : "登入後台"}</Button></form><Button variant="link" className="mx-auto mt-5 block text-slate-400" onClick={() => navigate("/")}>返回預測系統</Button></CardContent></Card></main>;
}
