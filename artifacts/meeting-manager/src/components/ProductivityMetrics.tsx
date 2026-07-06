import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useAuth } from "@/hooks/use-auth";

interface UserMetrics {
  userId: number;
  meetingsAttended: number;
  meetingsOrganized: number;
  actionItemsOwned: number;
  actionItemsCompleted: number;
  productivityScore: number;
}

type Period = "week" | "month";

export function ProductivityMetrics() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");

  const { data, isLoading } = useQuery<UserMetrics>({
    queryKey: ["analytics-productivity", user?.id, period],
    queryFn: () => fetch(`/api/analytics/productivity?user_id=${user?.id}&period=${period}`).then(r => r.json()),
    enabled: !!user?.id,
  });

  const chartData = data ? [
    { name: "حضرتها", value: data.meetingsAttended },
    { name: "نظمتها", value: data.meetingsOrganized },
    { name: "مهامي", value: data.actionItemsOwned },
    { name: "مكتملة", value: data.actionItemsCompleted },
  ] : [];

  return (
    <Card data-testid="productivity-metrics">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4" />
            مقاييس الإنتاجية
          </CardTitle>
          <div className="flex gap-1">
            {(["week", "month"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${period === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
              >
                {p === "week" ? "أسبوع" : "شهر"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoading && data && (
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold text-primary" data-testid="productivity-score">
              {data.productivityScore}
            </div>
            <div>
              <p className="text-sm font-medium">نقاط الإنتاجية</p>
              <p className="text-xs text-muted-foreground">من 100 نقطة</p>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="h-32 bg-muted animate-pulse rounded" />
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="العدد" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
