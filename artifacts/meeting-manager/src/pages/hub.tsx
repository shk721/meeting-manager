import { useGetDashboardStats } from "@workspace/api-client-react";
import { CalendarDays, CheckSquare, TrendingUp, Shield, FileText, Cpu } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";

const modules = [
  {
    title: "إدارة الاجتماعات",
    description: "جدولة الاجتماعات، المهام، والمحاضر الرسمية",
    icon: CalendarDays,
    href: "/meetings",
    iconBg: "#e8f2ea",
    iconColor: "#1f7a4d",
    linkColor: "#1f7a4d",
  },
  {
    title: "التحول الرقمي",
    description: "تتبع مبادرات التحول الرقمي والخطط الفرعية",
    icon: Cpu,
    href: "/digital-transformation",
    iconBg: "#e3efe8",
    iconColor: "#0f7a52",
    linkColor: "#0f7a52",
  },
  {
    title: "الحوكمة واللجان",
    description: "إدارة اللجان، الحضور، والنصاب القانوني",
    icon: Shield,
    href: "/governance",
    iconBg: "#fbf1dd",
    iconColor: "#a97918",
    linkColor: "#a97918",
  },
  {
    title: "التخطيط",
    description: "خطط التنفيذ، المراحل، المسارات والمخرجات",
    icon: TrendingUp,
    href: "/planning",
    iconBg: "#ede9fe",
    iconColor: "#6d28d9",
    linkColor: "#6d28d9",
  },
];

interface KpiProps {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  topColor: string;
  iconBg: string;
  iconColor: string;
  subColor?: string;
}

function KpiCard({ title, value, sub, icon: Icon, topColor, iconBg, iconColor, subColor }: KpiProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#fff", border: "1px solid #e6ece4", borderTop: `3px solid ${topColor}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: "#5a675a" }}>{title}</span>
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, background: iconBg }}
        >
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
      </div>
      <div className="font-rubik text-3xl font-bold" style={{ color: "#1c261c" }}>{value}</div>
      <p className="text-xs mt-1" style={{ color: subColor ?? "#8a978a" }}>{sub}</p>
    </div>
  );
}

export default function HubPage() {
  const { data: stats, isLoading } = useGetDashboardStats();

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1c261c" }}>مركز التحكم الموحّد</h1>
        <p className="text-sm mt-1" style={{ color: "#8a978a" }}>نظرة شاملة على جميع وحدات النظام</p>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner className="size-8" /></div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="اجتماعات قادمة"
            value={stats.upcomingMeetings}
            sub={`من أصل ${stats.totalMeetings} إجمالاً`}
            icon={CalendarDays}
            topColor="#1f7a4d"
            iconBg="#e8f2ea"
            iconColor="#1f7a4d"
          />
          <KpiCard
            title="مهام مفتوحة"
            value={stats.openTasks}
            sub={`${stats.overdueTasks} متأخرة`}
            icon={CheckSquare}
            topColor="#d6b23e"
            iconBg="#fbf1dd"
            iconColor="#a97918"
            subColor={stats.overdueTasks > 0 ? "#c0492f" : undefined}
          />
          <KpiCard
            title="مهام مكتملة"
            value={stats.completedTasks}
            sub={`نسبة ${stats.completionRate}%`}
            icon={TrendingUp}
            topColor="#0f7a52"
            iconBg="#e3efe8"
            iconColor="#0f7a52"
          />
          <KpiCard
            title="محاضر بانتظار الاعتماد"
            value={stats.pendingMinutes}
            sub="تنتظر المراجعة"
            icon={FileText}
            topColor="#c99a2e"
            iconBg="#fbf1dd"
            iconColor="#a97918"
          />
        </div>
      ) : null}

      {/* Module cards */}
      <div>
        <h2 className="text-base font-bold mb-4" style={{ color: "#1c261c" }}>الوحدات</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="block no-underline rounded-2xl p-5 transition-shadow hover:shadow-md"
              style={{ background: "#fff", border: "1px solid #e6ece4" }}
            >
              <div
                className="flex items-center justify-center rounded-2xl mb-3"
                style={{ width: 48, height: 48, background: m.iconBg }}
              >
                <m.icon className="h-6 w-6" style={{ color: m.iconColor }} />
              </div>
              <div className="mb-1">
                <span className="text-sm font-bold" style={{ color: "#1c261c" }}>{m.title}</span>
              </div>
              <p className="text-xs mb-3" style={{ color: "#5a675a" }}>{m.description}</p>
              <span className="text-sm font-semibold" style={{ color: m.linkColor }}>فتح الوحدة ←</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
