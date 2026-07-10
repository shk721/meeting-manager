import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";
import { CalendarDays, CheckSquare, Clock, MapPin, AlertCircle, Briefcase, TrendingUp, FileCheck } from "lucide-react";

const meetingStatusMap: Record<string, { label: string; bg: string; color: string }> = {
  scheduled: { label: "مجدول", bg: "#e8f2ea", color: "#1f7a4d" },
  in_progress: { label: "جارٍ", bg: "#fbf1dd", color: "#a97918" },
};

const decisionStatusMap: Record<string, { label: string; bg: string; color: string }> = {
  draft:          { label: "مسودة",           bg: "#f4f6f2", color: "#5a675a" },
  pending_review: { label: "بانتظار المراجعة", bg: "#fbf1dd", color: "#a97918" },
  approved:       { label: "معتمد",            bg: "#e8f2ea", color: "#1f7a4d" },
  rejected:       { label: "مرفوض",            bg: "#fbeeea", color: "#c0492f" },
  deferred:       { label: "مؤجل",             bg: "#f0f0fb", color: "#5b5bbf" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  critical: { label: "حرج", color: "#c0492f" },
  high:     { label: "عالٍ", color: "#d97706" },
  medium:   { label: "متوسط", color: "#3b82f6" },
  low:      { label: "منخفض", color: "#6b7280" },
};

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء النور";
}

function getEndOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d.toISOString().split("T")[0];
}

function StatCard({ title, value, icon, alert = false }: { title: string; value: number; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className="p-4 rounded-xl border bg-card" style={alert && value > 0 ? { borderColor: "#fca5a5" } : {}}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold" style={alert && value > 0 ? { color: "#c0492f" } : {}}>{value}</span>
      </div>
      <p className="text-xs text-muted-foreground">{title}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: myMeetings = [], isLoading: loadingMeetings } = useQuery<any[]>({
    queryKey: ["my-meetings"],
    queryFn: () => fetchJson("/api/dashboard/my-meetings"),
  });

  const { data: myTasks = [], isLoading: loadingTasks } = useQuery<any[]>({
    queryKey: ["my-tasks"],
    queryFn: () => fetchJson("/api/dashboard/my-tasks"),
  });

  const { data: myDecisions = [], isLoading: loadingDecisions } = useQuery<any[]>({
    queryKey: ["my-decisions"],
    queryFn: () => fetchJson("/api/dashboard/my-decisions"),
  });

  const showPlans = user?.role === "admin" || user?.role === "manager";
  const { data: plansDash } = useQuery<any>({
    queryKey: ["plans-dashboard"],
    queryFn: () => fetchJson("/api/plans-dashboard"),
    enabled: showPlans,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const endOfWeek = getEndOfWeek();
  const overdueTasks = myTasks.filter(t => t.isOverdue);
  const thisWeekTasks = myTasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= endOfWeek);
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}{firstName ? `، ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">إليك ما ينتظرك اليوم</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="اجتماعاتي القادمة"
          value={myMeetings.length}
          icon={<CalendarDays className="h-5 w-5" style={{ color: "#1f7a4d" }} />}
        />
        <StatCard
          title="مهامي المفتوحة"
          value={myTasks.length}
          icon={<CheckSquare className="h-5 w-5" style={{ color: "#3b82f6" }} />}
        />
        <StatCard
          title="مهام متأخرة"
          value={overdueTasks.length}
          icon={<AlertCircle className="h-5 w-5" style={{ color: "#c0492f" }} />}
          alert
        />
        <StatCard
          title="مهام هذا الأسبوع"
          value={thisWeekTasks.length}
          icon={<Clock className="h-5 w-5" style={{ color: "#d97706" }} />}
        />
      </div>

      {/* Active plans widget — admin/manager only */}
      {showPlans && plansDash?.recentPlans && plansDash.recentPlans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: "#1f7a4d" }} />
              خططي النشطة
            </h2>
            <Link href="/planning/plans" className="text-sm" style={{ color: "#1f7a4d" }}>عرض الكل</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {(plansDash.recentPlans as any[]).slice(0, 3).map((p: any) => (
              <Link key={p.id} href={`/planning/plans/${p.id}`}>
                <div className="p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-semibold text-sm leading-snug">{p.title}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#e8f2ea", color: "#1f7a4d", flexShrink: 0 }}>
                      نشطة
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs" style={{ color: "#5a675a" }}>
                      <span>التقدّم</span>
                      <span className="font-semibold" style={{ color: "#1f7a4d" }}>{p.progress ?? 0}%</span>
                    </div>
                    <div style={{ background: "#e6ece4", borderRadius: 999, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${p.progress ?? 0}%`, background: "#1f7a4d", height: "100%", borderRadius: 999, transition: "width 0.3s" }} />
                    </div>
                  </div>
                  {p.endDate && (
                    <div className="mt-2 text-xs" style={{ color: "#8a978a" }}>
                      ينتهي: {new Date(p.endDate).toLocaleDateString("ar-SA")}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Two-column content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My upcoming meetings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">اجتماعاتي القادمة</h2>
            <Link href="/meetings" className="text-sm" style={{ color: "#1f7a4d" }}>عرض الكل</Link>
          </div>
          {loadingMeetings ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
          ) : myMeetings.length === 0 ? (
            <div className="text-center py-10 rounded-xl border bg-card">
              <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد اجتماعات قادمة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myMeetings.map((m: any) => {
                const st = meetingStatusMap[m.status];
                return (
                  <Link key={m.id} href={`/meetings/${m.id}`}>
                    <div className="p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium text-sm leading-snug">{m.title}</span>
                        {st && (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: st.bg, color: st.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {st.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(m.date + "T00:00:00").toLocaleDateString("ar-SA")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {m.time}
                        </span>
                        {m.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {m.location}
                          </span>
                        )}
                        {m.project && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {m.project}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* My open tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">مهامي المفتوحة</h2>
            <Link href="/tasks" className="text-sm" style={{ color: "#1f7a4d" }}>عرض الكل</Link>
          </div>
          {loadingTasks ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6" /></div>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-10 rounded-xl border bg-card">
              <CheckSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد مهام مفتوحة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.map((t: any) => {
                const pr = priorityMap[t.priority];
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                    style={t.isOverdue ? { borderColor: "#fca5a5" } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      {t.dueDate && (
                        <p className="text-xs mt-0.5" style={{ color: t.isOverdue ? "#c0492f" : "#8a978a" }}>
                          {t.isOverdue ? "متأخر — " : ""}
                          {new Date(t.dueDate + "T00:00:00").toLocaleDateString("ar-SA")}
                        </p>
                      )}
                    </div>
                    {pr && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 999,
                        background: pr.color + "18", color: pr.color,
                        border: `1px solid ${pr.color}38`, whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        {pr.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* My pending decisions */}
      {(loadingDecisions || myDecisions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5" style={{ color: "#6d28d9" }} />
              قراراتي المعلّقة
            </h2>
          </div>
          {loadingDecisions ? (
            <div className="flex justify-center py-6"><Spinner className="h-6 w-6" /></div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {myDecisions.map((d: any) => {
                const ds = decisionStatusMap[d.status] ?? { label: d.status, bg: "#f4f6f2", color: "#5a675a" };
                return (
                  <Link key={d.id} href={`/decisions/${d.id}`}>
                    <div className="p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium leading-snug line-clamp-2">{d.title}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: ds.bg, color: ds.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {ds.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs" style={{ color: "#8a978a" }}>
                        {d.meetingTitle && <span>{d.meetingTitle}</span>}
                        {d.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(d.dueDate + "T00:00:00").toLocaleDateString("ar-SA")}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
