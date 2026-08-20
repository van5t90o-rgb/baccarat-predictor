import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AnalysisPage from "./pages/AnalysisPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminSecurityPage from "./pages/AdminSecurityPage";
import AdminStoragePage from "./pages/AdminStoragePage";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function Router() {
  return <Switch><Route path="/admin/login" component={AdminLoginPage} /><Route path="/admin/storage" component={AdminStoragePage} /><Route path="/admin/security" component={AdminSecurityPage} /><Route path="/admin" component={AdminDashboardPage} /><Route path="/"><main className="min-h-screen bg-[#F5F6F8] p-4 sm:p-6 lg:p-8"><Home /></main></Route><Route path="/analysis"><main className="min-h-screen bg-[#F5F6F8] p-4 sm:p-6 lg:p-8"><AnalysisPage /></main></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
