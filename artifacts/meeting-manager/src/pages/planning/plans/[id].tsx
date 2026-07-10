import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, Plus, Trash2, Edit2, Check, X, Search, Unlink } from "lucide-react";

async function apiFetch(url: string, method = "GET", body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:       { bg: "#f4f6f2", color: "#5a675a",  label: "مسودة" },
  active:      { bg: "#e8f2ea", color: "#1f7a4d",  label: "نشطة" },
  in_progress: { bg: "#fbf1dd", color: "#a97918",  label: "قيد التنفيذ" },
  on_hold:     { bg: "#f4f6f2", color: "#5a675a",  label: "معلّقة" },
  overdue:     { bg: "#fbeeea", color: "#c0492f",  label: "متأخرة" },
  completed:   { bg: "#e8f2ea", color: "#1f7a4d",  label: "مكتملة" },
};

const TABS = [
  { id: "overview",      label: "نظرة عامة" },
  { id: "workstreams",   label: "مسارات العمل" },
  { id: "tasks",         label: "المهام" },
  { id: "deliverables",  label: "المخرجات" },
  { id: "meetings",      label: "الاجتماعات" },
  { id: "decisions",     label: "القرارات" },
  { id: "timeline",      label: "الخط الزمني" },
  { id: "progress",      label: "التقدّم" },
  { id: "dependencies",  label: "الاعتمادية" },
  { id: "notes",         label: "ملاحظات" },
];

type TabId = typeof TABS[number]["id"];

const TASK_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:        { bg: "#f4f6f2", color: "#5a675a", label: "مفتوحة" },
  in_progress: { bg: "#fbf1dd", color: "#a97918", label: "جارية" },
  completed:   { bg: "#e8f2ea", color: "#1f7a4d", label: "مكتملة" },
  done:        { bg: "#e8f2ea", color: "#1f7a4d", label: "منجزة" },
  on_hold:     { bg: "#f0f3ee", color: "#5a675a", label: "معلّقة" },
  overdue:     { bg: "#fbeeea", color: "#c0492f", label: "متأخرة" },
};

const IMPACT_LABELS: Record<string, string> = {
  scope_change:    "تغيير النطاق",
  timeline_change: "تغيير الجدول",
  resource_change: "تغيير الموارد",
  priority_change: "تغيير الأولوية",
  risk_acceptance: "قبول مخاطرة",
  escalation:      "تصعيد",
  other:           "أخرى",
};

export default function PlanDetail({ id }: { id: string }) {
  const planId = parseInt(id, 10);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [notes, setNotes] = useState("");
  const [notesEdit, setNotesEdit] = useState(false);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [addingWs, setAddingWs] = useState<number | null>(null);
  const [newWsTitle, setNewWsTitle] = useState("");
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [dlvForm, setDlvForm] = useState({ title: "", status: "not_started", progressPercent: 0 });
  const qc = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => apiFetch(`/api/plans/${planId}`),
    enabled: !isNaN(planId),
  });

  const patchPlan = useMutation({
    mutationFn: (body: any) => apiFetch(`/api/plans/${planId}`, "PATCH", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", planId] }),
  });

  const addPhase = useMutation({
    mutationFn: (title: string) => apiFetch(`/api/plans/${planId}/phases`, "POST", { title, orderIndex: (plan?.phases?.length ?? 0) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan", planId] }); setAddingPhase(false); setNewPhaseTitle(""); },
  });

  const addWorkstream = useMutation({
    mutationFn: ({ phaseId, title }: { phaseId: number; title: string }) =>
      apiFetch(`/api/plan-phases/${phaseId}/workstreams`, "POST", { title }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan", planId] }); setAddingWs(null); setNewWsTitle(""); },
  });

  const deletePhase = useMutation({
    mutationFn: (phaseId: number) => apiFetch(`/api/plan-phases/${phaseId}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", planId] }),
  });

  const deleteWorkstream = useMutation({
    mutationFn: (wsId: number) => apiFetch(`/api/plan-workstreams/${wsId}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", planId] }),
  });

  const { data: deliverables = [] } = useQuery({
    queryKey: ["deliverables", planId],
    queryFn: () => apiFetch(`/api/deliverables?planId=${planId}`),
    enabled: !isNaN(planId),
  });

  const createDeliverable = useMutation({
    mutationFn: (body: any) => apiFetch("/api/deliverables", "POST", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deliverables", planId] }); setShowAddDeliverable(false); setDlvForm({ title: "", status: "not_started", progressPercent: 0 }); },
  });

  const patchDeliverable = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiFetch(`/api/deliverables/${id}`, "PATCH", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables", planId] }),
  });

  const deleteDeliverable = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/deliverables/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables", planId] }),
  });

  if (isLoading) return <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>جارٍ التحميل...</div>;
  if (!plan) return <div style={{ textAlign: "center", padding: 60, color: "#c0492f" }}>لم يتم العثور على الخطة</div>;

  const s = STATUS_STYLE[plan.status] ?? STATUS_STYLE.draft;
  const phases: any[] = plan.phases ?? [];
  const workstreams: any[] = plan.workstreams ?? [];
  const tasks: any[] = plan.tasks ?? [];
  const decisions: any[] = plan.decisions ?? [];
  const progress = plan.progress ?? 0;
  const ringOffset = 264 * (1 - progress / 100);

  const phasesWithWs = phases.map(ph => ({
    ...ph,
    workstreams: workstreams.filter(w => w.phaseId === ph.id),
  }));
  const crossPhaseWorkstreams = workstreams.filter(w => w.phaseId === null || w.phaseId === undefined);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Breadcrumb */}
      <Link href="/planning/plans" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#5a675a", textDecoration: "none" }}>
        <ChevronLeft size={15} /> رجوع لقائمة الخطط
      </Link>

      {/* Plan header */}
      <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <h1 style={{ margin: 0, font: "800 23px Cairo", color: "#1c261c" }}>{plan.title}</h1>
            <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: plan.type === "readiness" ? "#e8f2ea" : "#fbf1dd", color: plan.type === "readiness" ? "#1f7a4d" : "#a97918" }}>
              {plan.type === "readiness" ? "جاهزية" : "تشغيلية"}
            </span>
            <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
          </div>
          {plan.description && <div style={{ fontSize: 13.5, color: "#5a675a", marginBottom: 8 }}>{plan.description}</div>}
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: "#8a978a" }}>
            {plan.startDate && <span>البداية: <b style={{ color: "#1c261c" }}>{plan.startDate}</b></span>}
            {plan.endDate && <span>النهاية: <b style={{ color: "#1c261c" }}>{plan.endDate}</b></span>}
            <span>المراحل: <b style={{ color: "#1c261c" }}>{phases.length}</b></span>
            <span>المهام: <b style={{ color: "#1c261c" }}>{tasks.length}</b></span>
          </div>
          {/* Status selector */}
          <div style={{ marginTop: 12 }}>
            <select value={plan.status}
              onChange={e => patchPlan.mutate({ status: e.target.value })}
              style={{ border: "1px solid #e6ece4", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, fontFamily: "inherit", background: "#f7f9f6" }}>
              <option value="draft">مسودة</option>
              <option value="active">نشطة</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="on_hold">معلّقة</option>
              <option value="overdue">متأخرة</option>
              <option value="completed">مكتملة</option>
            </select>
          </div>
        </div>
        {/* Progress ring */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <svg viewBox="0 0 100 100" style={{ width: 80, height: 80 }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#eef2ec" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1f7a4d" strokeWidth="10"
              strokeDasharray="264" strokeDashoffset={ringOffset}
              strokeLinecap="round" transform="rotate(-90 50 50)" />
            <text x="50" y="56" fontSize="20" fontWeight="700" fill="#1c261c" textAnchor="middle" fontFamily="Rubik">{progress}%</text>
          </svg>
          <span style={{ fontSize: 11, color: "#8a978a" }}>نسبة التقدّم</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e6ece4", overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as TabId)}
              style={{ padding: "12px 16px", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, border: "none", borderBottom: activeTab === t.id ? "2px solid #1f7a4d" : "2px solid transparent", background: "transparent", color: activeTab === t.id ? "#1f7a4d" : "#5a675a", cursor: "pointer", whiteSpace: "nowrap", transition: "color .15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {/* ─── Overview ─── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                {[
                  { label: "المراحل", value: phases.length, color: "#1f7a4d" },
                  { label: "المهام", value: tasks.length, color: "#d6b23e" },
                  { label: "المخرجات", value: (deliverables as any[]).length, color: "#1d4ed8" },
                  { label: "القرارات", value: decisions.length, color: "#5a675a" },
                  { label: "مسارات العمل", value: workstreams.length, color: "#2f9e6b" },
                ].map(item => (
                  <div key={item.label} style={{ background: "#f7f9f6", borderRadius: 10, padding: 14, borderTop: `3px solid ${item.color}` }}>
                    <div style={{ fontSize: 12, color: "#8a978a" }}>{item.label}</div>
                    <div style={{ font: "800 24px Rubik", marginTop: 4, color: "#1c261c" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {plan.notes && (
                <div style={{ background: "#f7f9f6", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#3f5145", marginBottom: 8 }}>ملاحظات</div>
                  <div style={{ fontSize: 13, color: "#5a675a", whiteSpace: "pre-wrap" }}>{plan.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* ─── Workstreams ─── */}
          {activeTab === "workstreams" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {phasesWithWs.map((ph, pi) => (
                <div key={ph.id} style={{ border: "1px solid #e6ece4", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ background: "#f7f9f6", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#1f7a4d", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{pi + 1}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{ph.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setAddingWs(ph.id); setNewWsTitle(""); }}
                        style={{ border: "1px solid #e6ece4", background: "#fff", borderRadius: 7, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#5a675a", display: "flex", alignItems: "center", gap: 4 }}>
                        <Plus size={12} /> مسار
                      </button>
                      <button onClick={() => deletePhase.mutate(ph.id)}
                        style={{ border: "1px solid #fbeeea", background: "#fbeeea", borderRadius: 7, padding: "4px 8px", fontSize: 12, cursor: "pointer", color: "#c0492f" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {ph.workstreams.length > 0 && (
                    <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {ph.workstreams.map((ws: any) => (
                        <div key={ws.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", border: "1px solid #f0f3ee", borderRadius: 8 }}>
                          <span style={{ fontSize: 13 }}>{ws.title}</span>
                          <button onClick={() => deleteWorkstream.mutate(ws.id)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#c0492f", padding: "2px 4px" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {addingWs === ph.id && (
                    <div style={{ padding: "8px 16px 12px", display: "flex", gap: 8, alignItems: "center" }}>
                      <input autoFocus value={newWsTitle} onChange={e => setNewWsTitle(e.target.value)} placeholder="اسم مسار العمل"
                        style={{ flex: 1, border: "1px solid #1f7a4d", borderRadius: 7, padding: "7px 10px", fontSize: 13, fontFamily: "inherit" }}
                        onKeyDown={e => { if (e.key === "Enter" && newWsTitle.trim()) addWorkstream.mutate({ phaseId: ph.id, title: newWsTitle.trim() }); if (e.key === "Escape") setAddingWs(null); }} />
                      <button onClick={() => newWsTitle.trim() && addWorkstream.mutate({ phaseId: ph.id, title: newWsTitle.trim() })}
                        style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 7, padding: "7px 12px", cursor: "pointer" }}><Check size={14} /></button>
                      <button onClick={() => setAddingWs(null)} style={{ background: "#f0f3ee", border: "none", borderRadius: 7, padding: "7px 10px", cursor: "pointer" }}><X size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
              {crossPhaseWorkstreams.length > 0 && (
                <div style={{ border: "1px solid #dbeafe", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ background: "#f0f7ff", padding: "12px 16px", fontWeight: 700, fontSize: 13, color: "#1d4ed8" }}>
                    مسارات عابرة للمراحل
                  </div>
                  <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {crossPhaseWorkstreams.map((ws: any) => (
                      <div key={ws.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", border: "1px solid #f0f3ee", borderRadius: 8 }}>
                        <span style={{ fontSize: 13 }}>{ws.title}</span>
                        <button onClick={() => deleteWorkstream.mutate(ws.id)}
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#c0492f", padding: "2px 4px" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {addingPhase ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input autoFocus value={newPhaseTitle} onChange={e => setNewPhaseTitle(e.target.value)} placeholder="اسم المرحلة الجديدة"
                    style={{ flex: 1, border: "1px solid #1f7a4d", borderRadius: 8, padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit" }}
                    onKeyDown={e => { if (e.key === "Enter" && newPhaseTitle.trim()) addPhase.mutate(newPhaseTitle.trim()); if (e.key === "Escape") setAddingPhase(false); }} />
                  <button onClick={() => newPhaseTitle.trim() && addPhase.mutate(newPhaseTitle.trim())}
                    style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}><Check size={14} /></button>
                  <button onClick={() => setAddingPhase(false)} style={{ background: "#f0f3ee", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setAddingPhase(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, border: "1.5px dashed #c2ccc2", background: "transparent", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#5a675a", cursor: "pointer", width: "100%", justifyContent: "center" }}>
                  <Plus size={14} /> إضافة مرحلة
                </button>
              )}
            </div>
          )}

          {/* ─── Tasks ─── */}
          {activeTab === "tasks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>لا توجد مهام مرتبطة بهذه الخطة</div>
              ) : (
                tasks.map((t: any) => {
                  const ts = TASK_STATUS_STYLE[t.status] ?? TASK_STATUS_STYLE.open;
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f7f9f6", borderRadius: 10, border: "1px solid #e6ece4" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.title}</div>
                        {t.dueDate && <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 2 }}>الاستحقاق: {t.dueDate}</div>}
                      </div>
                      <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 10, background: ts.bg, color: ts.color }}>{ts.label}</span>
                      <div style={{ fontSize: 11.5, color: "#5a675a", fontFamily: "Rubik", fontWeight: 600 }}>{t.completionPercent ?? 0}%</div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── Deliverables ─── */}
          {activeTab === "deliverables" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowAddDeliverable(true)}
                  style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Plus size={14} /> إضافة مخرج
                </button>
              </div>
              {showAddDeliverable && (
                <div style={{ background: "#f4f9f5", border: "1px solid #c8dcc8", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      placeholder="عنوان المخرج *"
                      value={dlvForm.title}
                      onChange={e => setDlvForm(f => ({ ...f, title: e.target.value }))}
                      style={{ flex: 2, border: "1px solid #cdd9cc", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", minWidth: 160 }}
                    />
                    <select
                      value={dlvForm.status}
                      onChange={e => setDlvForm(f => ({ ...f, status: e.target.value }))}
                      style={{ flex: 1, border: "1px solid #cdd9cc", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "#fff", outline: "none", minWidth: 120 }}
                    >
                      <option value="not_started">لم يبدأ</option>
                      <option value="in_progress">قيد التنفيذ</option>
                      <option value="under_review">قيد المراجعة</option>
                      <option value="accepted">مقبول</option>
                      <option value="rejected">مرفوض</option>
                    </select>
                    <button
                      onClick={() => createDeliverable.mutate({ planId, title: dlvForm.title, status: dlvForm.status, progressPercent: dlvForm.progressPercent })}
                      disabled={!dlvForm.title.trim() || createDeliverable.isPending}
                      style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600, opacity: !dlvForm.title.trim() ? 0.5 : 1 }}
                    >
                      حفظ
                    </button>
                    <button onClick={() => setShowAddDeliverable(false)} style={{ border: "1px solid #cdd9cc", background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>إلغاء</button>
                  </div>
                </div>
              )}
              {(deliverables as any[]).length === 0 && !showAddDeliverable ? (
                <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>لا توجد مخرجات مرتبطة بهذه الخطة</div>
              ) : (
                (deliverables as any[]).map((d: any) => {
                  const DLV_STATUS: Record<string, { bg: string; color: string; label: string; next: string }> = {
                    not_started:  { bg: "#f4f6f2", color: "#5a675a",  label: "لم يبدأ",        next: "in_progress" },
                    in_progress:  { bg: "#dbeafe", color: "#1d4ed8",  label: "قيد التنفيذ",    next: "under_review" },
                    under_review: { bg: "#fbf1dd", color: "#a97918",  label: "قيد المراجعة",   next: "accepted" },
                    accepted:     { bg: "#e8f2ea", color: "#1f7a4d",  label: "مقبول",           next: "not_started" },
                    rejected:     { bg: "#fbeeea", color: "#c0492f",  label: "مرفوض",           next: "not_started" },
                  };
                  const ds = DLV_STATUS[d.status] ?? DLV_STATUS.not_started;
                  return (
                    <div key={d.id} style={{ background: "#f7f9f6", borderRadius: 10, border: "1px solid #e6ece4", padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.title}</div>
                          {d.dueDate && <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 2 }}>الاستحقاق: {d.dueDate}</div>}
                        </div>
                        <button
                          onClick={() => patchDeliverable.mutate({ id: d.id, body: { status: ds.next } })}
                          style={{ fontSize: 11, padding: "2px 9px", borderRadius: 10, background: ds.bg, color: ds.color, border: "none", cursor: "pointer", fontWeight: 600 }}
                          title="انقر للتقدم إلى الحالة التالية"
                        >
                          {ds.label}
                        </button>
                        <div style={{ fontSize: 11.5, color: "#5a675a", fontWeight: 600, minWidth: 32, textAlign: "center" }}>{d.progressPercent ?? 0}%</div>
                        <button onClick={() => deleteDeliverable.mutate(d.id)} style={{ border: "none", background: "none", color: "#c0492f", cursor: "pointer", fontSize: 16, padding: "0 2px" }}>×</button>
                      </div>
                      {/* Progress bar */}
                      <div style={{ marginTop: 8, background: "#e6ece4", borderRadius: 999, height: 5, overflow: "hidden" }}>
                        <div style={{ width: `${d.progressPercent ?? 0}%`, background: "#1f7a4d", height: "100%", borderRadius: 999, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── Meetings ─── */}
          {activeTab === "meetings" && (
            <MeetingsTab planId={planId} />
          )}

          {/* ─── Decisions ─── */}
          {activeTab === "decisions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {decisions.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>لا توجد قرارات مرتبطة بهذه الخطة</div>
              ) : (
                decisions.map((d: any) => (
                  <div key={d.id} style={{ padding: "13px 16px", background: "#f7f9f6", borderRadius: 10, border: "1px solid #e6ece4" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{d.content}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {d.impactType && (
                        <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 10, background: "#fbf1dd", color: "#a97918" }}>
                          {IMPACT_LABELS[d.impactType] ?? d.impactType}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#8a978a" }}>{new Date(d.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── Timeline ─── */}
          {activeTab === "timeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {phases.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>لا توجد مراحل لعرضها</div>
              ) : (
                phases.map((ph, i) => (
                  <div key={ph.id} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1f7a4d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      {i < phases.length - 1 && <div style={{ width: 2, height: 40, background: "#e6ece4" }} />}
                    </div>
                    <div style={{ background: "#f7f9f6", borderRadius: 10, padding: "10px 14px", flex: 1, border: "1px solid #e6ece4" }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{ph.title}</div>
                      {(ph.startDate || ph.endDate) && (
                        <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 3 }}>
                          {ph.startDate && `${ph.startDate} `}{ph.endDate && `← ${ph.endDate}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─── Progress ─── */}
          {activeTab === "progress" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <svg viewBox="0 0 100 100" style={{ width: 120, height: 120, margin: "0 auto" }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#eef2ec" strokeWidth="10" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1f7a4d" strokeWidth="10"
                    strokeDasharray="264" strokeDashoffset={ringOffset}
                    strokeLinecap="round" transform="rotate(-90 50 50)" />
                  <text x="50" y="56" fontSize="20" fontWeight="700" fill="#1c261c" textAnchor="middle" fontFamily="Rubik">{progress}%</text>
                </svg>
                <div style={{ fontSize: 14, color: "#5a675a", marginTop: 10 }}>التقدّم محسوب من المخرجات (إن وجدت) أو المهام</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "مكتملة", value: tasks.filter(t => t.status === "completed" || t.status === "done").length, color: "#1f7a4d" },
                  { label: "جارية", value: tasks.filter(t => t.status === "in_progress").length, color: "#d6b23e" },
                  { label: "مفتوحة", value: tasks.filter(t => t.status === "open").length, color: "#8a978a" },
                ].map(item => (
                  <div key={item.label} style={{ background: "#f7f9f6", borderRadius: 10, padding: 14, textAlign: "center" }}>
                    <div style={{ font: "800 24px Rubik", color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: "#8a978a", marginTop: 3 }}>مهام {item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Dependencies ─── */}
          {activeTab === "dependencies" && (
            <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>
              <div style={{ fontSize: 14 }}>الاعتمادية الديناميكية بين الخطط قيد التطوير</div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}>سيتم تفعيلها في الإصدار القادم (V3)</div>
            </div>
          )}

          {/* ─── Notes ─── */}
          {activeTab === "notes" && (
            <div>
              {notesEdit ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea value={notes || plan.notes || ""} onChange={e => setNotes(e.target.value)} rows={10}
                    style={{ width: "100%", border: "1px solid #1f7a4d", borderRadius: 10, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { patchPlan.mutate({ notes: notes || plan.notes }); setNotesEdit(false); }}
                      style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <Check size={14} /> حفظ
                    </button>
                    <button onClick={() => setNotesEdit(false)}
                      style={{ background: "#f0f3ee", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                    <button onClick={() => { setNotes(plan.notes || ""); setNotesEdit(true); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #e6ece4", background: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", color: "#5a675a" }}>
                      <Edit2 size={13} /> تعديل
                    </button>
                  </div>
                  {plan.notes ? (
                    <div style={{ background: "#f7f9f6", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#3f5145", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{plan.notes}</div>
                  ) : (
                    <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>لا توجد ملاحظات بعد — اضغط تعديل لإضافتها</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MeetingsTab({ planId }: { planId: number }) {
  const qc = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const { data: linked = [] } = useQuery<any[]>({
    queryKey: ["plan-meetings", planId],
    queryFn: () => apiFetch(`/api/plans/${planId}/meetings`),
  });

  const { data: allMeetings = [] } = useQuery<any[]>({
    queryKey: ["all-meetings-picker"],
    queryFn: () => apiFetch("/api/meetings"),
    enabled: showPicker,
  });

  const linkMeeting = useMutation({
    mutationFn: (meetingId: number) => apiFetch(`/api/plans/${planId}/meetings/${meetingId}`, "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plan-meetings", planId] }); setShowPicker(false); setSearch(""); },
  });

  const unlinkMeeting = useMutation({
    mutationFn: (meetingId: number) => apiFetch(`/api/plans/${planId}/meetings/${meetingId}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-meetings", planId] }),
  });

  const linkedIds = new Set(linked.map((m: any) => m.id));
  const available = allMeetings.filter((m: any) =>
    !linkedIds.has(m.id) && (!search || m.title.includes(search))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => { setShowPicker(true); setSearch(""); }}
          style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} /> ربط اجتماع
        </button>
      </div>

      {showPicker && (
        <div style={{ background: "#f4f9f5", border: "1px solid #c8dcc8", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#fff", border: "1px solid #e6ece4", borderRadius: 8, padding: "7px 10px" }}>
            <Search size={14} style={{ color: "#8a978a", flexShrink: 0 }} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن اجتماع..."
              style={{ border: "none", outline: "none", flex: 1, fontSize: 13, fontFamily: "inherit", background: "transparent" }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {available.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "#8a978a", fontSize: 13 }}>لا توجد نتائج</div>
            ) : (
              available.slice(0, 20).map((m: any) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #e6ece4" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: "#8a978a" }}>{m.date} — {m.time}</div>
                  </div>
                  <button
                    onClick={() => linkMeeting.mutate(m.id)}
                    disabled={linkMeeting.isPending}
                    style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                  >
                    ربط
                  </button>
                </div>
              ))
            )}
          </div>
          <button onClick={() => setShowPicker(false)} style={{ marginTop: 8, border: "1px solid #e6ece4", background: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#5a675a" }}>
            إلغاء
          </button>
        </div>
      )}

      {linked.length === 0 && !showPicker ? (
        <div style={{ textAlign: "center", padding: 40, color: "#8a978a" }}>
          <CalendarDaysIcon />
          <div style={{ marginTop: 8 }}>لا توجد اجتماعات مرتبطة بهذه الخطة</div>
        </div>
      ) : (
        linked.map((m: any) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f7f9f6", borderRadius: 10, border: "1px solid #e6ece4" }}>
            <div style={{ flex: 1 }}>
              <Link href={`/meetings/${m.id}`} style={{ fontWeight: 600, fontSize: 13.5, color: "#1f7a4d", textDecoration: "none" }}>{m.title}</Link>
              <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 2 }}>{m.date} — {m.time}{m.location ? ` | ${m.location}` : ""}</div>
            </div>
            <button
              onClick={() => unlinkMeeting.mutate(m.id)}
              disabled={unlinkMeeting.isPending}
              title="إلغاء الربط"
              style={{ border: "1px solid #fbeeea", background: "#fbeeea", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "#c0492f", display: "flex", alignItems: "center" }}
            >
              <Unlink size={13} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function CalendarDaysIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c2ccc2" strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block" }}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/></svg>;
}
