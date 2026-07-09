import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, List, AlertCircle, TrendingUp, CheckSquare, FileText, CalendarDays } from "lucide-react";

async function apiFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:       { bg: "#f4f6f2", color: "#5a675a", label: "مسودة" },
  active:      { bg: "#e8f2ea", color: "#1f7a4d", label: "نشطة" },
  in_progress: { bg: "#fbf1dd", color: "#a97918", label: "قيد التنفيذ" },
  on_hold:     { bg: "#f4f6f2", color: "#5a675a", label: "معلّقة" },
  overdue:     { bg: "#fbeeea", color: "#c0492f", label: "متأخرة" },
  completed:   { bg: "#e8f2ea", color: "#1f7a4d", label: "مكتملة" },
};

export default function PlanningDashboard() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ["plans-dashboard"],
    queryFn: () => apiFetch("/api/plans-dashboard"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20" style={{ color: "#8a978a" }}>
        جارٍ التحميل...
      </div>
    );
  }

  const total = dash?.total ?? 0;
  const active = dash?.active ?? 0;
  const overdue = dash?.overdue ?? 0;
  const overallProgress = dash?.overallProgress ?? 0;
  const readiness = dash?.readiness ?? 0;
  const operational = dash?.operational ?? 0;
  const recentPlans: any[] = dash?.recentPlans ?? [];

  const ringCircumference = 2 * Math.PI * 40;
  const readinessPct = total > 0 ? readiness / total : 0;
  const operationalPct = total > 0 ? operational / total : 0;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, font: "800 26px Cairo", color: "#1c261c" }}>لوحة التخطيط</h1>
          <p style={{ margin: "5px 0 0", color: "#8a978a", fontSize: 14 }}>التخطيط أولاً، والاجتماعات سياق للتنفيذ</p>
        </div>
        <Link href="/planning/plans/new">
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1f7a4d", color: "#fff", padding: "10px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={16} />
            خطة جديدة
          </div>
        </Link>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 16, borderTop: "3px solid #1f7a4d" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#8a978a" }}>إجمالي الخطط</span>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "#e8f2ea", color: "#1f7a4d", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <List size={15} />
            </span>
          </div>
          <div style={{ font: "800 30px Rubik", marginTop: 8 }}>{total}</div>
          <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 2 }}>إجمالي الخطط المسجّلة</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 16, borderTop: "3px solid #2f9e6b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#8a978a" }}>خطط نشطة</span>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "#e8f2ea", color: "#1f7a4d", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={15} />
            </span>
          </div>
          <div style={{ font: "800 30px Rubik", marginTop: 8 }}>{active}</div>
          <div style={{ fontSize: 11.5, color: "#2f9e6b", marginTop: 2 }}>قيد التنفيذ الآن</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 16, borderTop: "3px solid #c0492f" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#8a978a" }}>خطط متأخرة</span>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "#fbeeea", color: "#c0492f", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={15} />
            </span>
          </div>
          <div style={{ font: "800 30px Rubik", marginTop: 8, color: "#c0492f" }}>{overdue}</div>
          <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 2 }}>تحتاج تدخّلاً</div>
        </div>
        <div style={{ background: "linear-gradient(150deg,#1f7a4d,#2f9e6b)", borderRadius: 14, padding: 16, color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#d5ecdf" }}>التقدّم العام</span>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={15} />
            </span>
          </div>
          <div style={{ font: "800 30px Rubik", marginTop: 8 }}>{overallProgress}%</div>
          <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,.22)", marginTop: 9, overflow: "hidden" }}>
            <div style={{ width: `${overallProgress}%`, height: "100%", background: "#fff" }} />
          </div>
        </div>
      </div>

      {/* Readiness vs Operational + Open items */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Ring chart */}
        <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 20 }}>
          <div style={{ font: "700 15px Cairo", marginBottom: 4 }}>خطط الجاهزية مقابل التشغيلية</div>
          <div style={{ fontSize: 11.5, color: "#8a978a", marginBottom: 18 }}>توزيع الخطط حسب النوع</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <svg viewBox="0 0 100 100" style={{ width: 120, height: 120 }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#eef2ec" strokeWidth="14" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1f7a4d" strokeWidth="14"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - readinessPct)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#d6b23e" strokeWidth="14"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - operationalPct * 0.6)}
                strokeLinecap="round"
                transform={`rotate(${-90 + 360 * readinessPct} 50 50)`} />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: "#1f7a4d", display: "inline-block" }} />
                    خطط جاهزية
                  </span>
                  <span style={{ fontWeight: 700 }}>{readiness}</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "#eef2ec", overflow: "hidden" }}>
                  <div style={{ width: `${total > 0 ? readiness / total * 100 : 0}%`, height: "100%", background: "#1f7a4d" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: "#d6b23e", display: "inline-block" }} />
                    خطط تشغيلية
                  </span>
                  <span style={{ fontWeight: 700 }}>{operational}</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "#eef2ec", overflow: "hidden" }}>
                  <div style={{ width: `${total > 0 ? operational / total * 100 : 0}%`, height: "100%", background: "#d6b23e" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Open items */}
        <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 20 }}>
          <div style={{ font: "700 15px Cairo", marginBottom: 18 }}>المهام والقرارات المفتوحة</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "#f7f9f6", borderRadius: 11, padding: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8a978a" }}>
                <CheckSquare size={13} /> مهام مفتوحة
              </div>
              <div style={{ font: "800 26px Rubik", marginTop: 4 }}>{dash?.openTasks ?? "—"}</div>
            </div>
            <div style={{ background: "#f7f9f6", borderRadius: 11, padding: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8a978a" }}>
                <FileText size={13} /> قرارات مفتوحة
              </div>
              <div style={{ font: "800 26px Rubik", marginTop: 4 }}>{dash?.openDecisions ?? "—"}</div>
            </div>
            <div style={{ background: "#f7f9f6", borderRadius: 11, padding: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8a978a" }}>
                <TrendingUp size={13} /> مسارات نشطة
              </div>
              <div style={{ font: "800 26px Rubik", marginTop: 4 }}>{dash?.activeWorkstreams ?? "—"}</div>
            </div>
            <div style={{ background: "#f7f9f6", borderRadius: 11, padding: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8a978a" }}>
                <CalendarDays size={13} /> اجتماعات مرتبطة
              </div>
              <div style={{ font: "800 26px Rubik", marginTop: 4 }}>{dash?.linkedMeetings ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent active plans */}
      <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 18px", borderBottom: "1px solid #e6ece4" }}>
          <span style={{ font: "700 15px Cairo" }}>أحدث الخطط النشطة</span>
          <Link href="/planning/plans" style={{ fontSize: 12, color: "#1f7a4d", fontWeight: 600 }}>عرض الكل ←</Link>
        </div>
        {recentPlans.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "#8a978a", fontSize: 14 }}>
            لا توجد خطط نشطة حتى الآن
          </div>
        ) : (
          recentPlans.map((p: any) => {
            const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
            const barColor = p.status === "overdue" ? "#c0492f" : "#1f7a4d";
            return (
              <Link key={p.id} href={`/planning/plans/${p.id}`}>
                <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1fr 1.4fr", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #f0f3ee", fontSize: 13, cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: "#8a978a", marginTop: 2 }}>{p.type === "readiness" ? "جاهزية" : "تشغيلية"}</div>
                  </div>
                  <span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                  </span>
                  <span style={{ color: "#8a978a" }}>{p.taskCount ?? 0} مهمة</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ flex: 1, height: 6, borderRadius: 4, background: "#eef2ec", overflow: "hidden" }}>
                      <span style={{ display: "block", width: `${p.progress ?? 0}%`, height: "100%", background: barColor }} />
                    </span>
                    {p.progress ?? 0}%
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
