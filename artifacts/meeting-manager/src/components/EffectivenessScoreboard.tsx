import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface MeetingEffectiveness {
  meetingId: number;
  title: string;
  date: string;
  score: number;
  breakdown: { hasAgenda: boolean; hasMinutes: boolean; hasDecisions: boolean; hasTasks: boolean };
}

interface EffectivenessData {
  meetings: MeetingEffectiveness[];
  averageScore: number;
}

function ScoreBar({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${value ? "text-emerald-600" : "text-muted-foreground"}`}>
        {value ? "+25" : "—"}
      </span>
    </div>
  );
}

export function EffectivenessScoreboard() {
  const { data, isLoading } = useQuery<EffectivenessData>({
    queryKey: ["analytics-effectiveness"],
    queryFn: () => fetch("/api/analytics/effectiveness").then(r => r.json()),
  });

  if (isLoading) return <Card className="animate-pulse"><CardContent className="h-48" /></Card>;

  const top = (data?.meetings ?? []).slice().sort((a, b) => b.score - a.score).slice(0, 5);
  const avg = data?.averageScore ?? 0;

  return (
    <Card data-testid="effectiveness-scoreboard">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          فعالية الاجتماعات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl font-bold text-primary" data-testid="avg-score">{avg}</div>
          <div>
            <p className="text-sm font-medium">المتوسط العام</p>
            <p className="text-xs text-muted-foreground">من 100 نقطة</p>
          </div>
        </div>

        {top.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">أفضل الاجتماعات</p>
            {top.map(m => (
              <div key={m.meetingId} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[180px]">{m.title}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${m.score}%` }} />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right">{m.score}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {top[0] && (
          <div className="border-t pt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">عوامل التقييم</p>
            <ScoreBar label="جدول أعمال" value={top[0].breakdown.hasAgenda} />
            <ScoreBar label="محضر" value={top[0].breakdown.hasMinutes} />
            <ScoreBar label="قرارات" value={top[0].breakdown.hasDecisions} />
            <ScoreBar label="مهام عمل" value={top[0].breakdown.hasTasks} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
