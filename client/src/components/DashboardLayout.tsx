import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Archive, FileSpreadsheet, LayoutDashboard, Layers3, LogOut, PanelLeft, Sparkles, Wand2 } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "預測儀表板", path: "/" },
  { icon: Wand2, label: "自訂公式", path: "/custom-formulas" },
  { icon: Layers3, label: "卡片管理", path: "/cards" },
  { icon: Archive, label: "儲存空間", path: "/storage" },
  { icon: FileSpreadsheet, label: "CSV 管理", path: "/csv" },
];

const SIDEBAR_WIDTH_KEY = "baccarat-sidebar-width";
const DEFAULT_WIDTH = 276;
const MIN_WIDTH = 220;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 login-canvas">
        <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-10 text-center shadow-[0_24px_80px_rgba(18,32,54,0.14)] backdrop-blur">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#15243B] text-[#D5B46B]"><Sparkles className="size-6" /></div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#A27C2E]">BACCARAT LEDGER</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#15243B]">請登入以繼續</h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">登入後即可使用您的卡片、公式計算紀錄與儲存空間。</p>
          <Button onClick={() => startLogin()} className="mt-8 h-11 w-full bg-[#15243B] text-white hover:bg-[#213856]">登入管理系統</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find(item => item.path === location);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width);
    };
    const stop = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-[#E9ECF2] bg-[#FBFCFE]" disableTransition={isResizing}>
          <SidebarHeader className="h-[90px] justify-center px-3">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} aria-label="切換側邊欄" className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-[#EEF2F7] hover:text-[#15243B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A355]">
                <PanelLeft className="size-4" />
              </button>
              {!isCollapsed && <div className="min-w-0"><p className="text-[10px] font-semibold tracking-[0.18em] text-[#A27C2E]">BACCARAT</p><p className="font-serif text-lg font-semibold text-[#15243B]">Predictor Ledger</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            {!isCollapsed && <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400">管理模組</p>}
            <SidebarMenu className="gap-1">
              {menuItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl px-3 text-[13px] font-medium data-[active=true]:bg-[#15243B] data-[active=true]:text-white data-[active=true]:shadow-[0_6px_16px_rgba(21,36,59,0.18)]">
                    <item.icon className="size-4" /><span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[#EEF2F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A355] group-data-[collapsible=icon]:justify-center">
                  <Avatar className="size-9 border border-[#E4D3AB]"><AvatarFallback className="bg-[#F7F0DE] text-xs font-bold text-[#816122]">{user?.name?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold text-[#15243B]">{user?.name || "使用者"}</p><p className="mt-0.5 truncate text-xs text-slate-400">我的工作空間</p></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 size-4" />登出</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        {!isCollapsed && <div className="absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition hover:bg-[#C9A355]/30" onMouseDown={() => setIsResizing(true)} />}
      </div>
      <SidebarInset className="bg-[#F5F6F8]">
        {isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[#E9ECF2] bg-white/90 px-3 backdrop-blur"><SidebarTrigger className="rounded-xl" /><span className="font-serif font-semibold text-[#15243B]">{activeMenuItem?.label ?? "管理系統"}</span></div>}
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
