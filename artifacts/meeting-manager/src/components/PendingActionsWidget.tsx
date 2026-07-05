import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { usePending } from "@/hooks/useDashboard";
import { Link } from "wouter";
import { AlertCircle, Calendar } from "lucide-react";

const priorityColors: Record<string, string> = {
  critical: "text-red-600",
  high: "text-orange-500",
  medium: "text-blue-500",
  low: "text-gray-400",
};

const priorityLabels: Record<string, string> = {
  critical: "حرج", high: "عالٍ", medium: "متوسط", low: "منخفض",
};

export function PendingActionsWidget() {
  const { data, isLoading } = usePending();

  const overdueTasks = data?.overdueTasks ?? [];
  const upcomingMeetings = data?.upcomingMeetings ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>الإجراءات المعلقة</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">مهام متأخرة ({overdueTasks.length})</span>
              </div>
              {overdueTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد مهام متأخرة 🎉</p>
              ) : (
                <div className="space-y-2">
                  {overdueTasks.map((t: any) => (
                    <div key={t.id} className="flex items-start justify-between py-1.5 border-b last:border-0">
                      <span className="text-sm truncate flex-1 ml-2">{t.title}</span>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-medium ${priorityColors[t.priority] ?? ""}`}>
                          {priorityLabels[t.priority] ?? t.priority}
                        </span>
                        {t.dueDate && (
                          <p className="text-xs text-destructive">{t.dueDate}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/tasks" className="text-xs text-primary hover:underline mt-3 block">
                عرض جميع المهام ←
              </Link>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">اجتماعات قادمة ({upcomingMeetings.length})</span>
              </div>
              {upcomingMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا اجتماعات قادمة</p>
              ) : (
                <div className="space-y-2">
                  {upcomingMeetings.map((m: any) => (
                    <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-start justify-between py-1.5 border-b last:border-0 hover:bg-muted rounded-sm px-1 -mx-1">
                      <span className="text-sm truncate flex-1 ml-2">{m.title}</span>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{m.date}</p>
                        {m.time && <p className="text-xs text-muted-foreground">{m.time}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/meetings" className="text-xs text-primary hover:underline mt-3 block">
                عرض جميع الاجتماعات ←
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
