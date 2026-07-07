import { CalendarDays, CheckSquare, FileText, AlertCircle, TrendingUp } from "lucide-react";

interface Stats {
  totalMeetings: number;
  upcomingMeetings: number;
  pendingMinutes: number;
  openTasks: number;
  overdueTasks: number;
  completionRate: number;
}

interface KpiDef {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  topColor: string;
  iconBg: string;
  iconColor: string;
  gradient?: boolean;
  subColor?: string;
}

function buildKpis(stats: Stats): KpiDef[] {
  return [
    {
      title: "مهام مفتوحة",
      value: stats.openTasks,
      sub: "▲3 هذا الأسبوع",
      icon: CheckSquare,
      topColor: "#1f7a4d",
      iconBg: "#e8f2ea",
      iconColor: "#1f7a4d",
    },
    {
      title: "مهام متأخرة",
      value: stats.overdueTasks,
      sub: "تجاوزت الموعد",
      icon: AlertCircle,
      topColor: "#c0492f",
      iconBg: "#fbeeea",
      iconColor: "#c0492f",
      subColor: stats.overdueTasks > 0 ? "#c0492f" : undefined,
    },
    {
      title: "محاضر معلّقة",
      value: stats.pendingMinutes,
      sub: "بانتظار الاعتماد",
      icon: FileText,
      topColor: "#c99a2e",
      iconBg: "#fbf1dd",
      iconColor: "#a97918",
    },
    {
      title: "نسبة الإنجاز",
      value: `${stats.completionRate}%`,
      sub: "من إجمالي المهام",
      icon: TrendingUp,
      topColor: "#1f7a4d",
      iconBg: "rgba(255,255,255,0.25)",
      iconColor: "#fff",
      gradient: true,
    },
  ];
}

export function StatisticsWidget({ stats }: { stats: Stats }) {
  const kpis = buildKpis(stats);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) =>
        kpi.gradient ? (
          <div
            key={kpi.title}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(150deg,#1f7a4d,#2f9e6b)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{kpi.title}</span>
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 36, height: 36, background: "rgba(255,255,255,0.2)" }}
              >
                <kpi.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="font-rubik text-3xl font-bold text-white">{kpi.value}</div>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>{kpi.sub}</p>
            <div className="mt-3 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: kpi.value, background: "rgba(255,255,255,0.8)" }}
              />
            </div>
          </div>
        ) : (
          <div
            key={kpi.title}
            className="rounded-2xl p-5"
            style={{ background: "#fff", border: "1px solid #e6ece4", borderTop: `3px solid ${kpi.topColor}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: "#5a675a" }}>{kpi.title}</span>
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 36, height: 36, background: kpi.iconBg }}
              >
                <kpi.icon className="h-4 w-4" style={{ color: kpi.iconColor }} />
              </div>
            </div>
            <div className="font-rubik text-3xl font-bold" style={{ color: "#1c261c" }}>{kpi.value}</div>
            <p className="text-xs mt-1" style={{ color: kpi.subColor ?? "#8a978a" }}>{kpi.sub}</p>
          </div>
        )
      )}
    </div>
  );
}
