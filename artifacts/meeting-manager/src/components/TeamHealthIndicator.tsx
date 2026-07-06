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

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-emerald-50 border-emerald-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
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

  return (
    <Card className={`border ${scoreBg(score)}`} data-testid="team-health-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4" />
          صحة الفريق
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`text-5xl font-bold ${scoreColor(score)}`} data-testid="health-score">
            {score}
          </div>
          <div>
            <p className={`font-semibold ${scoreColor(score)}`}>{scoreLabel(score)}</p>
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
            <p className={`font-semibold ${(data?.overdueCount ?? 0) > 0 ? "text-red-600" : ""}`}>
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
