import { Sparkles } from "lucide-react";

export function AppHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-[#A27C2E]"><Sparkles className="size-3" />{eyebrow}</div><h1 className="font-serif text-3xl font-semibold tracking-tight text-[#15243B] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</header>;
}
