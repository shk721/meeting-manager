import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useInsights } from "@/hooks/useDashboard";

export function InsightsWidget() {
  const { data, isLoading } = useInsights();

  return (
    <Card>
      <CardHeader>
        <CardTitle>إحصائيات ونظرة عامة</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">أكثر يوم اجتماعات</p>
              <p className="text-sm font-semibold">{data.busiestDay}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">نسبة إنجاز المهام</p>
              <p className="text-sm font-semibold">{data.completionRate}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">متوسط الحضور</p>
              <p className="text-sm font-semibold">{data.avgAttendeesPerMeeting} شخص</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">الأكثر حضوراً</p>
              <p className="text-sm font-semibold">{data.mostActiveAttendee ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">مهام متأخرة</p>
              <p className="text-sm font-semibold text-destructive">{data.overdueTaskCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">إجمالي الاجتماعات</p>
              <p className="text-sm font-semibold">{data.totalMeetings}</p>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-xs text-muted-foreground">إجمالي المهام</p>
              <p className="text-sm font-semibold">{data.totalTasks}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
