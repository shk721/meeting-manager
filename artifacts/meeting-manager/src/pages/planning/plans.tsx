import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, List, LayoutGrid, CheckSquare, CalendarDays, FileText } from "lucide-react";

async function apiFetch(url: string, method = "GET", body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const COLUMNS = [
  { status: "draft",       label: "مسودة",       color: "#8a978a", bg: "#f4f6f2" },
  { status: "active",      label: "نشطة",        color: "#1f7a4d", bg: "#e8f2ea" },
  { status: "in_progress", label: "قيد التنفيذ", color: "#a97918", bg: "#fbf1dd" },
  { status: "on_hold",     label: "معلّقة",       color: "#5a675a", bg: "#f0f3ee" },
  { status: "overdue",     label: "متأخرة",      color: "#c0492f", bg: "#fbeeea" },
  { status: "completed",   label: "مكتملة",      color: "#1f7a4d", bg: "#e8f2ea" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {};
COLUMNS.forEach(c => { STATUS_STYLE[c.status] = { bg: c.bg, color: c.color, label: c.label }; });

export default function PlansPage() {
  const [view, setView] = useState<"cards" | "kanban">("cards");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dragId, setDragId] = useState<number | null>(null);

  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => apiFetch("/api/plans"),
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/plans/${id}`, "PATCH", { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });

  const filtered = plans.filter((p: any) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const handleDrop = (status: string) => {
    if (dragId === null) return;
    patchStatus.mutate({ id: dragId, status });
    setDragId(null);
  };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, font: "800 26px Cairo", color: "#1c261c" }}>الخطط</h1>
          <p style={{ margin: "5px 0 0", color: "#8a978a", fontSize: 14 }}>جميع خطط الجاهزية والخطط التشغيلية</p>
        </div>
        <Link href="/planning/plans/new">
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1f7a4d", color: "#fff", padding: "10px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={16} /> خطة جديدة
          </div>
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ border: "1px solid #e6ece4", borderRadius: 8, padding: "7px 11px", fontSize: 12.5, color: "#3f5145", background: "#fff" }}>
          <option value="all">النوع: الكل</option>
          <option value="readiness">جاهزية</option>
          <option value="operational">تشغيلية</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ border: "1px solid #e6ece4", borderRadius: 8, padding: "7px 11px", fontSize: 12.5, color: "#3f5145", background: "#fff" }}>
          <option value="all">الحالة: الكل</option>
          {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {/* View toggle */}
        <div style={{ display: "flex", background: "#f4f6f2", border: "1px solid #e6ece4", borderRadius: 8, padding: 3 }}>
          <button onClick={() => setView("cards")}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, fontSize: 12.5, border: "none", cursor: "pointer",
              background: view === "cards" ? "#fff" : "transparent",
              color: view === "cards" ? "#1c261c" : "#8a978a",
              boxShadow: view === "cards" ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            <LayoutGrid size={13} /> بطاقات
          </button>
          <button onClick={() => setView("kanban")}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, fontSize: 12.5, border: "none", cursor: "pointer",
              background: view === "kanban" ? "#fff" : "transparent",
              color: view === "kanban" ? "#1c261c" : "#8a978a",
              boxShadow: view === "kanban" ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            <List size={13} /> كانبان
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>جارٍ التحميل...</div>
      ) : view === "kanban" ? (
        /* KANBAN */
        <div style={{ display: "flex", gap: 14, overflowX: "auto", alignItems: "flex-start", paddingBottom: 6 }}>
          {COLUMNS.map(col => {
            const colPlans = plans.filter((p: any) => p.status === col.status);
            return (
              <div key={col.status}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.status)}
                style={{ minWidth: 220, flex: 1, display: "flex", flexDirection: "column", gap: 10, background: "#eef2ec", borderRadius: 12, padding: 10, minHeight: 130 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, display: "inline-block" }} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{col.label}</span>
                  <span style={{ background: col.bg, color: col.color, fontSize: 11, padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>{colPlans.length}</span>
                </div>
                {colPlans.map((p: any) => (
                  <div key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onClick={() => window.location.href = `/planning/plans/${p.id}`}
                    style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 10, padding: 12, cursor: "pointer" }}>
                    <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 10, background: p.type === "readiness" ? "#e8f2ea" : "#fbf1dd", color: p.type === "readiness" ? "#1f7a4d" : "#a97918" }}>
                      {p.type === "readiness" ? "جاهزية" : "تشغيلية"}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: 13, margin: "9px 0 11px", lineHeight: 1.5 }}>{p.title}</div>
                    <div style={{ height: 5, borderRadius: 4, background: "#eef2ec", overflow: "hidden", marginBottom: 9 }}>
                      <div style={{ width: `${p.progress ?? 0}%`, height: "100%", background: "#1f7a4d" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#8a978a" }}>{p.taskCount ?? 0} مهمة</span>
                      <span style={{ fontSize: 11, color: "#1c261c", fontWeight: 700 }}>{p.progress ?? 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* CARDS */
        filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#8a978a", background: "#fff", borderRadius: 14, border: "1px solid #e6ece4" }}>
            <Plus size={40} style={{ opacity: .3, margin: "0 auto 12px" }} />
            <div>لا توجد خطط مطابقة</div>
            <Link href="/planning/plans/new">
              <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "#1f7a4d", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                <Plus size={14} /> أنشئ خطة جديدة
              </div>
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {filtered.map((p: any) => {
              const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
              const accent = p.type === "readiness" ? "#1f7a4d" : "#d6b23e";
              const barColor = p.status === "overdue" ? "#c0492f" : "#1f7a4d";
              return (
                <Link key={p.id} href={`/planning/plans/${p.id}`}>
                  <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRight: `3px solid ${accent}`, borderRadius: 14, padding: 18, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <div style={{ font: "700 15px Cairo", lineHeight: 1.5 }}>{p.title}</div>
                        {p.description && <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 3 }}>{p.description}</div>}
                      </div>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>{s.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: p.type === "readiness" ? "#e8f2ea" : "#fbf1dd", color: p.type === "readiness" ? "#1f7a4d" : "#a97918" }}>
                        {p.type === "readiness" ? "جاهزية" : "تشغيلية"}
                      </span>
                      {p.phases?.length > 0 && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#f4f6f2", color: "#5a675a" }}>
                          {p.phases.length} مراحل
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8a978a", marginBottom: 5 }}>
                        <span>التقدّم</span>
                        <span style={{ color: "#1c261c", fontWeight: 700 }}>{p.progress ?? 0}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: "#eef2ec", overflow: "hidden" }}>
                        <div style={{ width: `${p.progress ?? 0}%`, height: "100%", background: barColor }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, paddingTop: 11, borderTop: "1px solid #f0f3ee", fontSize: 12, color: "#5a675a" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <CheckSquare size={14} style={{ color: "#8a978a" }} /> {p.taskCount ?? 0} مهمة
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <CalendarDays size={14} style={{ color: "#8a978a" }} /> {p.meetingCount ?? 0} اجتماع
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <FileText size={14} style={{ color: "#8a978a" }} /> {p.decisionCount ?? 0} قرار
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
