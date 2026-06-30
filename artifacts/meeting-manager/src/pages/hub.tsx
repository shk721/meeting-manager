import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckSquare, Building2, TrendingUp, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const modules = [
  {
    title: "إدارة الاجتماعات",
    description: "جدولة الاجتماعات، المهام، والمحاضر الرسمية",
    icon: CalendarDays,
    href: "/",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "التحول الرقمي",
    description: "تتبع مبادرات التحول الرقمي والخطط الفرعية",
    icon: TrendingUp,
    href: "/dt/",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "اللجان",
    description: "إدارة اللجان الداخلية والخارجية وتكليفاتها",
    icon: Building2,
    href: "/committees/",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default function HubPage() {
  const { data: stats, isLoading } = useGetDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">مركز التحكم الموحّد</h1>
        <p className="text-muted-foreground mt-1">نظرة شاملة على جميع وحدات النظام</p>
      </div>

      {/* KPIs from meetings module */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner className="size-8" /></div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">اجتماعات قادمة</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingMeetings}</div>
              <p className="text-xs text-muted-foreground">من أصل {stats.totalMeetings} إجمالاً</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مهام مفتوحة</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openTasks}</div>
              <p className="text-xs text-muted-foreground">{stats.overdueTasks} متأخرة</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مهام مكتملة</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">نسبة {stats.completionRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">محاضر بانتظار الاعتماد</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingMinutes}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Module cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">الوحدات</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map(m => (
            <a key={m.href} href={m.href} className="no-underline">
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${m.bg} mb-2`}>
                    <m.icon className={`h-6 w-6 ${m.color}`} />
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    {m.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{m.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className={`text-sm font-medium ${m.color}`}>فتح الوحدة ←</span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
