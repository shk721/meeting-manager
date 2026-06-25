import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardStats, useGetUpcomingMeetings, useGetPendingMinutes, useGetOverdueTasks,
  useApproveMinutes, useUpdateTask,
  getGetPendingMinutesQueryKey, getGetDashboardStatsQueryKey, getGetOverdueTasksQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckSquare, FileText, AlertCircle, TrendingUp, Calendar, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const meetingStatusLabels: Record<string, string> = {
  scheduled: "مجدول",
  in_progress: "جارٍ",
  completed: "مكتمل",
  cancelled: "ملغى",
  postponed: "مؤجل",
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const canApprove = user?.role === "admin" || user?.role === "manager";

  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: upcomingMeetings = [] } = useGetUpcomingMeetings();
  const { data: pendingMinutes = [] } = useGetPendingMinutes();
  const { data: overdueTasks = [] } = useGetOverdueTasks();

  const approveMutation = useApproveMinutes();
  const updateTaskMutation = useUpdateTask();

  const handleApproveMinutes = async (minutesId: number) => {
    try {
      await approveMutation.mutateAsync({ id: minutesId });
      queryClient.invalidateQueries({ queryKey: getGetPendingMinutesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      toast({ title: "تم اعتماد المحضر" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await updateTaskMutation.mutateAsync({ id: taskId, data: { status: "completed" } });
      queryClient.invalidateQueries({ queryKey: getGetOverdueTasksQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      toast({ title: "تم إتمام المهمة" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاجتماعات</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMeetings}</div>
            <p className="text-xs text-muted-foreground">{stats.upcomingMeetings} اجتماعات قادمة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">محاضر بانتظار الاعتماد</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingMinutes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مهام مفتوحة</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مهام متأخرة</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الإنجاز</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>المهام حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tasksByStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>الاجتماعات حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.meetingsByStatus}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Action Lists */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              الاجتماعات القادمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingMeetings.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد اجتماعات قادمة.</p>
            ) : (
              upcomingMeetings.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 py-1 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.date).toLocaleDateString("ar-SA")} — {m.time}
                    </p>
                  </div>
                  <Link href={`/meetings/${m.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0">عرض</Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Minutes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              محاضر للاعتماد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingMinutes.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد محاضر بانتظار الاعتماد.</p>
            ) : (
              pendingMinutes.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 py-1 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.meetingTitle}</p>
                    <Badge variant="secondary" className="text-xs mt-0.5">
                      {m.status === "pending_approval" ? "بانتظار الاعتماد" : "مسودة"}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {canApprove && m.status === "pending_approval" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={approveMutation.isPending}
                        onClick={() => handleApproveMinutes(m.id)}
                      >
                        <Check className="h-3 w-3 ml-0.5" />
                        اعتماد
                      </Button>
                    )}
                    <Link href={`/meetings/${m.meetingId}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">عرض</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-destructive" />
              مهام متأخرة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد مهام متأخرة.</p>
            ) : (
              overdueTasks.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-2 py-1 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.assignee?.fullName ?? "غير مُعيَّن"}
                      {t.dueDate && ` — ${new Date(t.dueDate).toLocaleDateString("ar-SA")}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    disabled={updateTaskMutation.isPending}
                    onClick={() => handleCompleteTask(t.id)}
                  >
                    <Check className="h-3 w-3 ml-0.5" />
                    إتمام
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
