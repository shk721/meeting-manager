import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

async function apiFetch(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const TYPE_LABEL: Record<string, string> = {
  committee: "لجنة",
  board: "مجلس",
  team: "فريق",
  working_group: "فريق عمل",
};

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  committee:     { bg: "#dbeafe", color: "#1d4ed8" },
  board:         { bg: "#ede9fe", color: "#6d28d9" },
  team:          { bg: "#d1fae5", color: "#065f46" },
  working_group: { bg: "#fef3c7", color: "#92400e" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "#e8f2ea", color: "#1f7a4d", label: "نشط" },
  inactive: { bg: "#f4f6f2", color: "#5a675a", label: "غير نشط" },
};

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_BADGE[type] ?? { bg: "#f4f6f2", color: "#5a675a" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { bg: "#f4f6f2", color: "#5a675a", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  head: "رئيس",
  member: "عضو",
  secretary: "أمين سر",
  observer: "مراقب",
};

export default function GovernancePage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddCtx, setShowAddCtx] = useState(false);
  const [showAddMember, setShowAddMember] = useState<number | null>(null);

  const [ctxForm, setCtxForm] = useState({ name: "", type: "committee", quorumPercent: 50, description: "" });
  const [memberForm, setMemberForm] = useState({ userId: "", externalName: "", role: "member", isVoting: true });
  const [formError, setFormError] = useState("");
  const [migrating, setMigrating] = useState(false);

  const { data: contexts = [], isLoading } = useQuery({
    queryKey: ["governance-contexts"],
    queryFn: () => apiFetch("/api/governance-contexts"),
  });

  const { data: ctxDetail } = useQuery({
    queryKey: ["governance-context", expandedId],
    queryFn: () => apiFetch(`/api/governance-contexts/${expandedId}`),
    enabled: expandedId !== null,
  });

  const createCtx = useMutation({
    mutationFn: (body: unknown) => apiFetch("/api/governance-contexts", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["governance-contexts"] });
      setShowAddCtx(false);
      setCtxForm({ name: "", type: "committee", quorumPercent: 50, description: "" });
      setFormError("");
    },
    onError: (e: any) => setFormError(e.message),
  });

  const patchCtx = useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => apiFetch(`/api/governance-contexts/${id}`, "PATCH", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["governance-contexts"] }); qc.invalidateQueries({ queryKey: ["governance-context", expandedId] }); },
  });

  const deleteCtx = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/governance-contexts/${id}`, "DELETE"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["governance-contexts"] }); if (expandedId !== null) setExpandedId(null); },
  });

  const addMember = useMutation({
    mutationFn: (body: unknown) => apiFetch("/api/governance-members", "POST", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["governance-context", showAddMember] });
      setShowAddMember(null);
      setMemberForm({ userId: "", externalName: "", role: "member", isVoting: true });
      setFormError("");
    },
    onError: (e: any) => setFormError(e.message),
  });

  async function handleMigrate() {
    setMigrating(true);
    try {
      const result = await apiFetch("/api/governance-contexts/migrate/from-committees", "POST");
      toast({ title: "اكتمل الاستيراد", description: `أُنشئ ${result.created} سياق، تم تخطي ${result.skipped}` });
      qc.invalidateQueries({ queryKey: ["governance-contexts"] });
    } catch {
      toast({ title: "فشل الاستيراد", variant: "destructive" });
    } finally {
      setMigrating(false);
    }
  }

  const filtered = (contexts as any[]).filter((c: any) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const members: any[] = ctxDetail?.members ?? [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }} dir="rtl">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2e1a", margin: 0 }}>سياقات الحوكمة</h1>
          <p style={{ fontSize: 14, color: "#5a675a", margin: "4px 0 0" }}>إدارة اللجان والمجالس وفرق العمل</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            style={{ border: "1px solid #1f7a4d", background: "#fff", color: "#1f7a4d", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600, opacity: migrating ? 0.6 : 1 }}
          >
            {migrating ? "جارٍ الاستيراد..." : "استيراد من اللجان"}
          </button>
          <button
            onClick={() => { setShowAddCtx(true); setFormError(""); }}
            style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            + إضافة سياق
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {["all", "committee", "board", "team", "working_group"].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              border: "1px solid", borderRadius: 999, padding: "4px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600,
              borderColor: typeFilter === t ? "#1f7a4d" : "#d8e4d8",
              background: typeFilter === t ? "#e8f2ea" : "#fff",
              color: typeFilter === t ? "#1f7a4d" : "#5a675a",
            }}
          >
            {t === "all" ? "الكل" : TYPE_LABEL[t]}
          </button>
        ))}
        <div style={{ width: 1, background: "#d8e4d8", margin: "0 4px" }} />
        {["all", "active", "inactive"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              border: "1px solid", borderRadius: 999, padding: "4px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600,
              borderColor: statusFilter === s ? "#1f7a4d" : "#d8e4d8",
              background: statusFilter === s ? "#e8f2ea" : "#fff",
              color: statusFilter === s ? "#1f7a4d" : "#5a675a",
            }}
          >
            {s === "all" ? "جميع الحالات" : s === "active" ? "نشط" : "غير نشط"}
          </button>
        ))}
      </div>

      {/* Add context dialog */}
      {showAddCtx && (
        <div style={{ background: "#fff", border: "1px solid #d8e4d8", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a2e1a" }}>سياق جديد</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              placeholder="الاسم *"
              value={ctxForm.name}
              onChange={e => setCtxForm(f => ({ ...f, name: e.target.value }))}
              style={{ border: "1px solid #cdd9cc", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }}
            />
            <select
              value={ctxForm.type}
              onChange={e => setCtxForm(f => ({ ...f, type: e.target.value }))}
              style={{ border: "1px solid #cdd9cc", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", outline: "none" }}
            >
              <option value="committee">لجنة</option>
              <option value="board">مجلس</option>
              <option value="team">فريق</option>
              <option value="working_group">فريق عمل</option>
            </select>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 13, color: "#5a675a", whiteSpace: "nowrap" }}>نسبة النصاب %</label>
              <input
                type="number" min={0} max={100}
                value={ctxForm.quorumPercent}
                onChange={e => setCtxForm(f => ({ ...f, quorumPercent: parseInt(e.target.value) || 50 }))}
                style={{ width: 80, border: "1px solid #cdd9cc", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none" }}
              />
            </div>
            <input
              placeholder="وصف (اختياري)"
              value={ctxForm.description}
              onChange={e => setCtxForm(f => ({ ...f, description: e.target.value }))}
              style={{ border: "1px solid #cdd9cc", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }}
            />
            {formError && <div style={{ color: "#c0492f", fontSize: 13 }}>{formError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAddCtx(false); setFormError(""); }} style={{ border: "1px solid #cdd9cc", background: "#fff", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 14 }}>إلغاء</button>
              <button
                onClick={() => createCtx.mutate({ name: ctxForm.name, type: ctxForm.type, quorumPercent: ctxForm.quorumPercent, description: ctxForm.description || undefined })}
                disabled={!ctxForm.name.trim() || createCtx.isPending}
                style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: !ctxForm.name.trim() ? 0.5 : 1 }}
              >
                {createCtx.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contexts list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>لا توجد سياقات</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((ctx: any) => (
            <div key={ctx.id} style={{ background: "#fff", border: "1px solid #d8e4d8", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Context row */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", userSelect: "none" }}
                onClick={() => setExpandedId(expandedId === ctx.id ? null : ctx.id)}
              >
                <span style={{ fontSize: 16, color: "#5a675a" }}>{expandedId === ctx.id ? "▲" : "▼"}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#1a2e1a" }}>{ctx.name}</span>
                <TypeBadge type={ctx.type} />
                <StatusBadge status={ctx.status ?? "active"} />
                {ctx.quorumPercent != null && (
                  <span style={{ fontSize: 12, color: "#8a978a", background: "#f4f6f2", padding: "2px 8px", borderRadius: 999 }}>
                    نصاب {ctx.quorumPercent}%
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); patchCtx.mutate({ id: ctx.id, body: { status: ctx.status === "active" ? "inactive" : "active" } }); }}
                  style={{ border: "1px solid #d8e4d8", background: "#f9fbf9", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#5a675a" }}
                >
                  {ctx.status === "active" ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); if (confirm("هل تريد حذف هذا السياق؟")) deleteCtx.mutate(ctx.id); }}
                  style={{ border: "none", background: "none", color: "#c0492f", cursor: "pointer", fontSize: 18, padding: "0 2px" }}
                  title="حذف"
                >×</button>
              </div>

              {/* Expanded: members */}
              {expandedId === ctx.id && (
                <div style={{ borderTop: "1px solid #e6ece4" }}>
                  <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fbf9" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#5a675a" }}>الأعضاء ({members.length})</span>
                    <button
                      onClick={() => { setShowAddMember(ctx.id); setFormError(""); }}
                      style={{ border: "1px solid #1f7a4d", background: "#fff", color: "#1f7a4d", borderRadius: 8, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                    >
                      + إضافة عضو
                    </button>
                  </div>

                  {/* Add member inline */}
                  {showAddMember === ctx.id && (
                    <div style={{ padding: "12px 18px", background: "#f4f9f5", borderBottom: "1px solid #e6ece4" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input
                          placeholder="معرّف المستخدم (داخلي)"
                          value={memberForm.userId}
                          onChange={e => setMemberForm(f => ({ ...f, userId: e.target.value, externalName: e.target.value ? "" : f.externalName }))}
                          style={{ flex: 1, border: "1px solid #cdd9cc", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", minWidth: 120 }}
                        />
                        <input
                          placeholder="أو اسم خارجي"
                          value={memberForm.externalName}
                          onChange={e => setMemberForm(f => ({ ...f, externalName: e.target.value, userId: e.target.value ? "" : f.userId }))}
                          style={{ flex: 1, border: "1px solid #cdd9cc", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", minWidth: 120 }}
                        />
                        <select
                          value={memberForm.role}
                          onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}
                          style={{ border: "1px solid #cdd9cc", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "#fff", outline: "none" }}
                        >
                          <option value="head">رئيس</option>
                          <option value="member">عضو</option>
                          <option value="secretary">أمين سر</option>
                          <option value="observer">مراقب</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#5a675a" }}>
                          <input type="checkbox" checked={memberForm.isVoting} onChange={e => setMemberForm(f => ({ ...f, isVoting: e.target.checked }))} />
                          عضو مصوّت
                        </label>
                        <button
                          onClick={() => addMember.mutate({
                            governanceContextId: ctx.id,
                            userId: memberForm.userId ? parseInt(memberForm.userId) : undefined,
                            externalName: memberForm.externalName || undefined,
                            role: memberForm.role,
                            isVoting: memberForm.isVoting,
                          })}
                          disabled={(!memberForm.userId && !memberForm.externalName) || addMember.isPending}
                          style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600, opacity: (!memberForm.userId && !memberForm.externalName) ? 0.5 : 1 }}
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => { setShowAddMember(null); setFormError(""); }}
                          style={{ border: "1px solid #cdd9cc", background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}
                        >إلغاء</button>
                      </div>
                      {formError && <div style={{ color: "#c0492f", fontSize: 12, marginTop: 6 }}>{formError}</div>}
                    </div>
                  )}

                  {members.length === 0 ? (
                    <div style={{ padding: "20px 18px", color: "#8a978a", fontSize: 13, textAlign: "center" }}>لا يوجد أعضاء</div>
                  ) : (
                    members.map((m: any) => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid #f0f4ef" }}>
                        <span style={{ flex: 1, fontSize: 14, color: "#1a2e1a" }}>
                          {m.externalName ?? (m.userId ? `مستخدم #${m.userId}` : "—")}
                        </span>
                        <span style={{ fontSize: 12, color: "#5a675a", background: "#f4f6f2", padding: "1px 8px", borderRadius: 999 }}>
                          {ROLE_LABELS[m.role] ?? m.role}
                        </span>
                        {m.isVoting && <span style={{ fontSize: 11, color: "#1f7a4d", background: "#e8f2ea", padding: "1px 8px", borderRadius: 999 }}>مصوّت</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
