import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

interface ActionItemsStatus {
  open: number;
  completed: number;
  overdue: number;
  total: number;
  byOwner: { userId: number; open: number; completed: number; overdue: number }[];
}

export function ActionItemsBoard() {
  const { data, isLoading } = useQuery<ActionItemsStatus>({
    queryKey: ["analytics-actionitems"],
    queryFn: () => fetch("/api/analytics/actionitems/status").then(r => r.json()),
  });

  return (
    <Card data-testid="action-items-board">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" />
          بنود العمل
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 animate-pulse bg-muted rounded" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg p-3" style={{ background: "#e8f2ea" }}>
                <p className="font-rubik text-2xl font-bold" style={{ color: "#1f7a4d" }} data-testid="open-count">{data?.open ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">مفتوحة</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "#fbeeea" }}>
                <p className="font-rubik text-2xl font-bold" style={{ color: "#c0492f" }} data-testid="overdue-count">{data?.overdue ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">متأخرة</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "#e3efe8" }}>
                <p className="font-rubik text-2xl font-bold" style={{ color: "#0f7a52" }}>{data?.completed ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">مكتملة</p>
              </div>
            </div>

            {(data?.byOwner?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">حسب المسؤول</p>
                <div className="space-y-1.5">
                  {data!.byOwner.slice(0, 5).map(owner => (
                    <div key={owner.userId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">مستخدم #{owner.userId}</span>
                      <div className="flex gap-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#e8f2ea", color: "#1f7a4d" }}>{owner.open} مفتوح</span>
                        {owner.overdue > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fbeeea", color: "#c0492f" }}>{owner.overdue} متأخر</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
