import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useTaskStats } from "@/hooks/useDashboard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

type Period = "day" | "week" | "month";

const periodLabels: Record<Period, string> = {
  day: "يومي (7 أيام)",
  week: "أسبوعي (4 أسابيع)",
  month: "شهري (12 شهر)",
};

export function TaskChartWidget() {
  const [period, setPeriod] = useState<Period>("week");
  const { data, isLoading } = useTaskStats(period);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>المهام عبر الزمن</CardTitle>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value as Period)}
          className="text-xs border rounded px-2 py-1 bg-background"
          aria-label="اختر الفترة"
        >
          {(Object.entries(periodLabels) as [Period, string][]).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="h-[260px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><Spinner /></div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" name="الإجمالي" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="completed" name="مكتمل" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="overdue" name="متأخر" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="high" name="أولوية عالية" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
