import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (page: number) => void }) {
  return <div className="flex items-center justify-between gap-3 border-t border-[#EEF0F4] px-1 pt-4"><span className="text-xs text-slate-400">共 {total} 筆資料</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" className="h-8 border-[#E4E8EF] bg-white" onClick={() => onPageChange(page - 1)} disabled={page <= 1}><ChevronLeft className="size-4" />上一頁</Button><span className="min-w-14 text-center text-xs font-medium text-slate-500">{page} / {totalPages}</span><Button variant="outline" size="sm" className="h-8 border-[#E4E8EF] bg-white" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}><ChevronRight className="size-4" />下一頁</Button></div></div>;
}
