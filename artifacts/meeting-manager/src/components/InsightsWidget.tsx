import { Sun, TrendingUp, Users, Award, AlertCircle, CalendarDays, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useInsights } from "@/hooks/useDashboard";

type IconComponent = React.ComponentType<{ className?: string }>;

interface MetricItem {
  icon: IconComponent;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

export function InsightsWidget() {
  const { data, isLoading } = useInsights();

  const metrics: MetricItem[] = data ? [
    {
      icon: Sun,
      label: "أكثر يوم اجتماعات",
      value: data.busiestDay || "—",
      iconBg: "bg-yellow-50 dark:bg-yellow-950",
      iconColor: "text-yellow-500",
    },
    {
      icon: TrendingUp,
      label: "نسبة إنجاز المهام",
      value: `${data.completionRate}%`,
      iconBg: "bg-emerald-50 dark:bg-emerald-950",
      iconColor: "text-emerald-500",
      valueColor: data.completionRate >= 70 ? "text-emerald-600" : "",
    },
    {
      icon: Users,
      label: "متوسط الحضور",
      value: `${data.avgAttendeesPerMeeting} شخص`,
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-500",
    },
    {
      icon: Award,
      label: "الأكثر حضوراً",
      value: data.mostActiveAttendee ?? "—",
      iconBg: "bg-violet-50 dark:bg-violet-950",
      iconColor: "text-violet-500",
    },
    {
      icon: AlertCircle,
      label: "مهام متأخرة",
      value: data.overdueTaskCount,
      iconBg: "bg-red-50 dark:bg-red-950",
      iconColor: "text-red-500",
      valueColor: data.overdueTaskCount > 0 ? "text-red-600" : "",
    },
    {
      icon: CalendarDays,
      label: "إجمالي الاجتماعات",
      value: data.totalMeetings,
      iconBg: "bg-indigo-50 dark:bg-indigo-950",
      iconColor: "text-indigo-500",
    },
    {
      icon: CheckSquare,
      label: "إجمالي المهام",
      value: data.totalTasks,
      iconBg: "bg-teal-50 dark:bg-teal-950",
      iconColor: "text-teal-500",
    },
  ] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>إحصائيات ونظرة عامة</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.iconBg}`}>
                  <m.icon className={`h-4 w-4 ${m.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">{m.label}</p>
                  <p className={`text-sm font-semibold truncate ${m.valueColor ?? ""}`}>{m.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
