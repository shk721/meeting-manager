import { useGetDashboardStats } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { StatisticsWidget } from "@/components/StatisticsWidget";
import { MeetingChartWidget } from "@/components/MeetingChartWidget";
import { TaskChartWidget } from "@/components/TaskChartWidget";
import { ThisWeekWidget } from "@/components/ThisWeekWidget";
import { InsightsWidget } from "@/components/InsightsWidget";
import { PendingActionsWidget } from "@/components/PendingActionsWidget";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>

      {/* Row 1: KPI cards */}
      <StatisticsWidget stats={stats} />

      {/* Row 2: Time-series charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <MeetingChartWidget />
        <TaskChartWidget />
      </div>

      {/* Row 3: This week + Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <ThisWeekWidget />
        <InsightsWidget />
      </div>

      {/* Row 4: Pending actions */}
      <PendingActionsWidget />
    </div>
  );
}
