// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  Brain,
  Shield,
  BarChart3,
  ChevronDown,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "Dashboard", icon: LayoutDashboard },
  { name: "Pacientes", href: "Patients", icon: Users },
  { name: "Agenda", href: "Schedule", icon: Calendar },
  { name: "Prontuários", href: "MedicalRecords", icon: FileText },
  { name: "Financeiro", href: "Financial", icon: DollarSign },
  { name: "Análise IA", href: "AIAnalysis", icon: Brain },
  { name: "Relatórios", href: "Reports", icon: BarChart3 },
  { name: "LGPD", href: "LGPD", icon: Shield },
  { name: "Configurações", href: "Settings", icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications] = useState([]);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.log("User not logged in");
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    logout(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200/80 transform transition-transform duration-300 ease-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
            <Link
              to={createPageUrl("Dashboard")}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-slate-800 text-lg tracking-tight">
                  Cognify
                </span>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Pro
                </p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-white" : "text-slate-400",
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-t border-slate-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-medium">
                      {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {user.full_name || "Psicólogo"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => navigate(createPageUrl("Settings"))}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">
                  {navigation.find((n) => n.href === currentPageName)?.name ||
                    currentPageName}
                </h1>
                <p className="text-sm text-slate-400">
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                    <Bell className="w-5 h-5 text-slate-500" />
                    {notifications.length > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-slate-500">
                      Nenhuma notificação por enquanto.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem key={n.id} onClick={n.onClick}>
                        {n.label}
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(createPageUrl("Schedule"))}>
                    Ver agenda
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
