import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Metric = "frequency" | "duration" | "attendance";
type Weeks = 4 | 8 | 12;

const metricLabels: Record<Metric, string> = {
  frequency: "عدد الاجتماعات",
  duration: "المدة (دقيقة)",
  attendance: "الحضور",
};

interface TrendPoint {
  week: string;
  value: number;
}

interface TrendData {
  metric: string;
  weeks: number;
  data: TrendPoint[];
}

export function TrendAnalysis() {
  const [metric, setMetric] = useState<Metric>("frequency");
  const [weeks, setWeeks] = useState<Weeks>(4);

  const { data, isLoading } = useQuery<TrendData>({
    queryKey: ["analytics-trends", metric, weeks],
    queryFn: () => fetch(`/api/analytics/trends?metric=${metric}&weeks=${weeks}`).then(r => r.json()),
  });

  return (
    <Card data-testid="trend-analysis">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4" />
            تحليل الاتجاهات
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1">
              {(["frequency", "duration", "attendance"] as Metric[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${metric === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                  aria-label={metricLabels[m]}
                >
                  {metricLabels[m]}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {([4, 8, 12] as Weeks[]).map(w => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${weeks === w ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  {w} أسابيع
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">جاري التحميل...</div>
        ) : (data?.data?.length ?? 0) === 0 ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات كافية</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data!.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={metricLabels[metric]}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
