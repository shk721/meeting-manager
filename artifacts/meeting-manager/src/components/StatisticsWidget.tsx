import { CalendarDays, CheckSquare, FileText, AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalMeetings: number;
  upcomingMeetings: number;
  pendingMinutes: number;
  openTasks: number;
  overdueTasks: number;
  completionRate: number;
}

const kpis = (stats: Stats) => [
  {
    title: "إجمالي الاجتماعات",
    value: stats.totalMeetings,
    sub: `${stats.upcomingMeetings} اجتماعات قادمة`,
    icon: CalendarDays,
    iconBg: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-500",
    valueColor: "",
  },
  {
    title: "محاضر بانتظار الاعتماد",
    value: stats.pendingMinutes,
    sub: "محاضر معلقة",
    icon: FileText,
    iconBg: "bg-amber-50 dark:bg-amber-950",
    iconColor: "text-amber-500",
    valueColor: stats.pendingMinutes > 0 ? "text-amber-600" : "",
  },
  {
    title: "مهام مفتوحة",
    value: stats.openTasks,
    sub: "قيد التنفيذ",
    icon: CheckSquare,
    iconBg: "bg-violet-50 dark:bg-violet-950",
    iconColor: "text-violet-500",
    valueColor: "",
  },
  {
    title: "مهام متأخرة",
    value: stats.overdueTasks,
    sub: "تجاوزت الموعد",
    icon: AlertCircle,
    iconBg: "bg-red-50 dark:bg-red-950",
    iconColor: "text-red-500",
    valueColor: stats.overdueTasks > 0 ? "text-red-600" : "",
  },
  {
    title: "نسبة الإنجاز",
    value: `${stats.completionRate}%`,
    sub: "من إجمالي المهام",
    icon: TrendingUp,
    iconBg: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-500",
    valueColor: stats.completionRate >= 70 ? "text-emerald-600" : "",
  },
];

export function StatisticsWidget({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {kpis(stats).map((kpi) => (
        <Card key={kpi.title} className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${kpi.iconBg}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpi.valueColor}`}>{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
