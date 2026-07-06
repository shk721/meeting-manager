import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useThisWeek } from "@/hooks/useDashboard";
import { Link } from "wouter";

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  open: "bg-blue-100 text-blue-800",
  pending: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  completed: "مكتمل", cancelled: "ملغى", in_progress: "جارٍ",
  scheduled: "مجدول", open: "مفتوح", pending: "معلق",
};

type Tab = "meetings" | "tasks";

export function ThisWeekWidget() {
  const [tab, setTab] = useState<Tab>("meetings");
  const { data, isLoading } = useThisWeek();

  return (
    <Card>
      <CardHeader>
        <CardTitle>هذا الأسبوع</CardTitle>
        <div className="flex gap-2 mt-2">
          {(["meetings", "tasks"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
              }`}
            >
              {t === "meetings" ? "الاجتماعات" : "المهام"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : tab === "meetings" ? (
          <div className="space-y-2">
            {(data?.meetings ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا اجتماعات هذا الأسبوع</p>
            ) : (
              (data?.meetings ?? []).map((m: any) => (
                <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center justify-between py-1.5 hover:bg-muted rounded px-2 -mx-2">
                  <span className="text-sm truncate flex-1">{m.title}</span>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{m.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[m.status] ?? ""}`}>
                      {statusLabels[m.status] ?? m.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
            {(data?.upcoming ?? []).length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">القادمة</p>
                {(data.upcoming ?? []).map((m: any) => (
                  <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center justify-between py-1 hover:bg-muted rounded px-2 -mx-2">
                    <span className="text-sm truncate flex-1">{m.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0 mr-2">{m.date} {m.time ?? ""}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.tasks ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا مهام هذا الأسبوع</p>
            ) : (
              (data?.tasks ?? []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 hover:bg-muted rounded px-2 -mx-2">
                  <span className="text-sm truncate flex-1">{t.title}</span>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    {t.dueDate && <span className="text-xs text-muted-foreground">{t.dueDate}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[t.status] ?? ""}`}>
                      {statusLabels[t.status] ?? t.status}
                    </span>
                    <Badge variant={t.priority === "high" || t.priority === "critical" ? "destructive" : "secondary"} className="text-xs">
                      {t.priority}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
