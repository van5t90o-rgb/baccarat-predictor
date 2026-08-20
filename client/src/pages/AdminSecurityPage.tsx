import { AdminShell } from "@/components/AdminShell";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { KeyRound, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function AdminSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const changePassword = trpc.admin.changePassword.useMutation({ onSuccess: () => { setCurrentPassword(""); setNextPassword(""); setConfirmPassword(""); toast.success("密碼已更新，其他既有登入工作階段已失效。"); }, onError: error => toast.error(error.message) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (nextPassword !== confirmPassword) return toast.error("兩次輸入的新密碼不一致。"); changePassword.mutate({ currentPassword, nextPassword }); };
  return <AdminShell><div className="mx-auto max-w-[860px]"><AppHeader eyebrow="ACCOUNT SECURITY" title="帳號與密碼" description="修改後台管理帳號的登入密碼。密碼更新後，其他既有後台工作階段將立即失效。" /><Card className="mt-7 rounded-2xl border-[#E7EAF0] bg-white shadow-[0_8px_28px_rgba(21,36,59,0.045)]"><CardContent className="p-6 sm:p-8"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#F7F0DE] text-[#936E25]"><KeyRound className="size-5" /></div><div><p className="font-serif text-xl font-semibold text-[#15243B]">修改登入密碼</p><p className="mt-1 text-sm text-slate-500">新密碼最少須 6 個字元。</p></div></div><form className="mt-7 max-w-lg space-y-5" onSubmit={submit}><PasswordField id="current-password" label="目前密碼" value={currentPassword} onChange={setCurrentPassword} /><PasswordField id="next-password" label="新密碼" value={nextPassword} onChange={setNextPassword} /><PasswordField id="confirm-password" label="確認新密碼" value={confirmPassword} onChange={setConfirmPassword} /><Button type="submit" className="h-11 bg-[#15243B] text-white hover:bg-[#213856]" disabled={changePassword.isPending}><LockKeyhole className="size-4" />{changePassword.isPending ? "更新中" : "更新密碼"}</Button></form></CardContent></Card></div></AdminShell>;
}

function PasswordField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="password" value={value} minLength={6} autoComplete={id === "current-password" ? "current-password" : "new-password"} onChange={event => onChange(event.target.value)} className="h-11 max-w-lg border-[#E2E7EE]" required /></div>; }
