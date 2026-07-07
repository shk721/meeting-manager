import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface TeamHealth {
  score: number;
  completionRate: number;
  engagementScore: number;
  overdueCount: number;
  totalTasks: number;
  completedTasks: number;
}

function scoreStyle(score: number): { color: string; bg: string; border: string } {
  if (score >= 70) return { color: "#1f7a4d", bg: "#e8f2ea", border: "#9fcbb2" };
  if (score >= 40) return { color: "#a97918", bg: "#fbf1dd", border: "#d6b23e" };
  return { color: "#c0492f", bg: "#fbeeea", border: "#e8a498" };
}

function scoreLabel(score: number) {
  if (score >= 70) return "جيد";
  if (score >= 40) return "متوسط";
  return "يحتاج تحسين";
}

export function TeamHealthIndicator() {
  const { data, isLoading } = useQuery<TeamHealth>({
    queryKey: ["team-health"],
    queryFn: () => fetch("/api/analytics/team-health").then(r => r.json()),
  });

  if (isLoading) return <Card className="animate-pulse"><CardContent className="h-40" /></Card>;

  const score = data?.score ?? 0;
  const s = scoreStyle(score);

  return (
    <Card style={{ borderTop: `3px solid ${s.border}` }} data-testid="team-health-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4" style={{ color: s.color }} />
          صحة الفريق
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div
            className="font-rubik text-5xl font-bold"
            style={{ color: s.color }}
            data-testid="health-score"
          >
            {score}
          </div>
          <div>
            <p className="font-semibold" style={{ color: s.color }}>{scoreLabel(score)}</p>
            <p className="text-xs text-muted-foreground mt-1">من 100 نقطة</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">معدل الإنجاز</p>
            <p className="font-semibold">{data?.completionRate ?? 0}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">مهام متأخرة</p>
            <p className="font-semibold" style={{ color: (data?.overdueCount ?? 0) > 0 ? "#c0492f" : undefined }}>
              {data?.overdueCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">معدل المشاركة</p>
            <p className="font-semibold">{data?.engagementScore ?? 0}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">مهام مكتملة</p>
            <p className="font-semibold">{data?.completedTasks ?? 0} / {data?.totalTasks ?? 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
