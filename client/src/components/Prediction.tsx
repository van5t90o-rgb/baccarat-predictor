export function Prediction({ value, large = false }: { value?: string; large?: boolean }) {
  const prediction = value || "—";
  const tones: Record<string, string> = { 閒: "bg-[#EFF6FF] text-[#1765B5] ring-[#BDDDF7]", 莊: "bg-[#FEF1F1] text-[#B64747] ring-[#F4C9C9]", 和: "bg-[#EDF9F2] text-[#287650] ring-[#C7E7D5]" };
  return <span className={`inline-flex items-center justify-center rounded-full font-bold ring-1 ${large ? "min-w-16 px-5 py-2 text-2xl" : "min-w-8 px-2 py-1 text-xs"} ${tones[prediction] ?? "bg-slate-100 text-slate-400 ring-slate-200"}`}>{prediction}</span>;
}
