import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, CheckSquare, FileText, LogOut, Building2, UserCog, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير",
  member: "عضو",
  viewer: "مشاهد",
};

function getNavItems(role: string) {
  if (role === "admin") {
    return [
      { title: "لوحة التحكم", href: "/", icon: LayoutDashboard },
      { title: "إدارة المستخدمين", href: "/users", icon: UserCog },
    ];
  }
  if (role === "manager") {
    return [
      { title: "لوحة التحكم", href: "/", icon: LayoutDashboard },
      { title: "الاجتماعات", href: "/meetings", icon: CalendarDays },
      { title: "المهام", href: "/tasks", icon: CheckSquare },
      { title: "المحاضر", href: "/minutes", icon: FileText },
    ];
  }
  // member / viewer
  return [
    { title: "الاجتماعات", href: "/meetings", icon: CalendarDays },
    { title: "مهامي", href: "/tasks", icon: CheckSquare },
  ];
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const navItems = getNavItems(user.role);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <Sidebar side="right" variant="inset">
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">نظام إدارة</span>
                <span className="text-xs text-muted-foreground">الاجتماعات الرسمي</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span className="text-base">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user.fullName.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{user.fullName}</span>
                <Badge variant="secondary" className="text-xs w-fit">{roleLabels[user.role] ?? user.role}</Badge>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <LogOut className="h-5 w-5" />
                  <span>تسجيل الخروج</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
