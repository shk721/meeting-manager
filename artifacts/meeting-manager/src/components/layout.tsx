import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, CheckSquare, LogOut,
  UserCog, CalendarDays, Calendar, ExternalLink,
  LayoutGrid, BarChart2, Search, Menu,
  TrendingUp, List, ClipboardList, Settings, Building2, Shield, Cpu,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير",
  member: "عضو",
  viewer: "مشاهد",
};

function getNavItems(role: string) {
  if (role === "admin") {
    return [
      { title: "مركز التحكم", href: "/hub", icon: LayoutGrid },
      { title: "لوحة التحكم", href: "/", icon: LayoutDashboard },
      { title: "الاجتماعات", href: "/meetings", icon: CalendarDays },
      { title: "المهام", href: "/tasks", icon: CheckSquare },
      { title: "إدارة المستخدمين", href: "/users", icon: UserCog },
      { title: "المنظمات", href: "/organizations", icon: Building2 },
      { title: "الحوكمة", href: "/governance", icon: Shield },
      { title: "التحول الرقمي", href: "/digital-transformation", icon: Cpu },
    ];
  }
  if (role === "manager") {
    return [
      { title: "مركز التحكم", href: "/hub", icon: LayoutGrid },
      { title: "لوحة التحكم", href: "/", icon: LayoutDashboard },
      { title: "الاجتماعات", href: "/meetings", icon: CalendarDays },
      { title: "المهام", href: "/tasks", icon: CheckSquare },
      { title: "الحوكمة", href: "/governance", icon: Shield },
      { title: "التحول الرقمي", href: "/digital-transformation", icon: Cpu },
    ];
  }
  return [
    { title: "الاجتماعات", href: "/meetings", icon: CalendarDays },
    { title: "مهامي", href: "/tasks", icon: CheckSquare },
  ];
}

const toolsNavItems = [
  { title: "التقويم", href: "/calendar", icon: Calendar },
  { title: "التحليلات", href: "/analytics", icon: BarChart2 },
];

const planningNavItems = [
  { title: "لوحة التخطيط", href: "/planning", icon: TrendingUp },
  { title: "الخطط", href: "/planning/plans", icon: List },
  { title: "القوالب", href: "/planning/templates", icon: ClipboardList },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  const navItems = getNavItems(user.role);
  const initials = user.fullName.substring(0, 2);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const sidebarContent = (
    <div className="flex flex-col h-full" dir="rtl">
      {/* 5px gradient strip */}
      <div style={{ height: 5, background: "linear-gradient(90deg,#d6b23e,#1f7a4d)", flexShrink: 0 }} />

      {/* Brand block */}
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid #e6ece4" }}>
        <div
          className="flex items-center justify-center rounded-xl text-white font-bold text-lg"
          style={{ width: 40, height: 40, background: "#1f7a4d", flexShrink: 0 }}
        >
          م
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm" style={{ color: "#1c261c" }}>منصة استخبارات</span>
          <span className="text-xs" style={{ color: "#8a978a" }}>التنفيذ</span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-xs font-semibold px-3 mb-2" style={{ color: "#a3b0a3" }}>القائمة الرئيسية</p>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors"
                style={active ? {
                  background: "#e8f2ea",
                  color: "#1f7a4d",
                  fontWeight: 700,
                  borderRight: "3px solid #1f7a4d",
                } : {
                  color: "#5a675a",
                  borderRight: "3px solid transparent",
                }}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Planning section (admin + manager only) */}
        {(user.role === "admin" || user.role === "manager") && (
          <>
            <p className="text-xs font-semibold px-3 mt-4 mb-2" style={{ color: "#a3b0a3" }}>التخطيط والتنفيذ</p>
            <nav className="flex flex-col gap-0.5">
              {planningNavItems.map((item) => {
                const active = location.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors"
                    style={active ? {
                      background: "#e8f2ea",
                      color: "#1f7a4d",
                      fontWeight: 700,
                      borderRight: "3px solid #1f7a4d",
                    } : {
                      color: "#5a675a",
                      borderRight: "3px solid transparent",
                    }}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        {/* Tools section (admin + manager only) */}
        {(user.role === "admin" || user.role === "manager") && (
          <>
            <p className="text-xs font-semibold px-3 mt-4 mb-2" style={{ color: "#a3b0a3" }}>الأدوات</p>
            <nav className="flex flex-col gap-0.5">
              {toolsNavItems.map((item) => {
                const active = location.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors"
                    style={active ? {
                      background: "#e8f2ea",
                      color: "#1f7a4d",
                      fontWeight: 700,
                      borderRight: "3px solid #1f7a4d",
                    } : {
                      color: "#5a675a",
                      borderRight: "3px solid transparent",
                    }}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 pb-3" style={{ borderTop: "1px solid #e6ece4" }}>
        {/* User chip */}
        <div className="flex items-center gap-2.5 px-3 py-3">
          <div
            className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
            style={{ width: 34, height: 34, background: "#1f7a4d" }}
          >
            {initials}
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-semibold truncate" style={{ color: "#1c261c" }}>{user.fullName}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full w-fit mt-0.5"
              style={{ background: "#e8f2ea", color: "#1f7a4d", fontSize: 11 }}
            >
              {roleLabels[user.role] ?? user.role}
            </span>
          </div>
        </div>

        {/* Secondary links */}
        <div className="flex flex-col gap-0.5 mt-1">
          <a
            href="/dt/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-muted"
            style={{ color: "#5a675a" }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            لوحة التحول الرقمي
          </a>
          <a
            href="/committees/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-muted"
            style={{ color: "#5a675a" }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            وحدة اللجان
          </a>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-muted"
            style={{ color: "#5a675a" }}
          >
            <Settings className="h-3.5 w-3.5" />
            الإعدادات
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-red-50 w-full text-right"
            style={{ color: "#c0492f" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full" dir="rtl">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: 242, background: "#fff", borderLeft: "1px solid #e6ece4", position: "sticky", top: 0, height: "100vh" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(20,32,24,.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute right-0 top-0 h-full flex flex-col"
            style={{ width: 242, background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center gap-3 px-5 flex-shrink-0"
          style={{ height: 56, background: "#fff", borderBottom: "1px solid #e6ece4" }}
        >
          {/* Mobile menu trigger */}
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" style={{ color: "#5a675a" }} />
          </button>

          {/* Search pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
            style={{ background: "#f4f6f2", border: "1px solid #e6ece4", color: "#8a978a", minWidth: 200 }}
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span>بحث...</span>
          </div>

          <div className="flex-1" />
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#f4f6f2", padding: 26 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
