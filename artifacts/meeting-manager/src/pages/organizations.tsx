import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active:   { bg: "#e8f2ea", color: "#1f7a4d" },
  inactive: { bg: "#f4f6f2", color: "#5a675a" },
};

function Badge({ value }: { value: string }) {
  const s = STATUS_BADGE[value] ?? { bg: "#f4f6f2", color: "#5a675a" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
      {value === "active" ? "نشط" : value === "inactive" ? "غير نشط" : value}
    </span>
  );
}

const LEVEL_LABEL: Record<number, string> = { 1: "مستوى 1", 2: "مستوى 2", 3: "مستوى 3", 4: "مستوى 4" };

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [showAddDept, setShowAddDept] = useState<number | null>(null);
  const [orgForm, setOrgForm] = useState({ name: "", type: "government", description: "" });
  const [deptForm, setDeptForm] = useState({ name: "", level: 2, parentId: "" });
  const [error, setError] = useState("");

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => apiFetch("/api/organizations"),
  });

  const { data: expandedOrg } = useQuery({
    queryKey: ["organization", expandedId],
    queryFn: () => apiFetch(`/api/organizations/${expandedId}`),
    enabled: expandedId !== null,
  });

  const createOrg = useMutation({
    mutationFn: (body: unknown) => apiFetch("/api/organizations", "POST", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organizations"] }); setShowAddOrg(false); setOrgForm({ name: "", type: "government", description: "" }); setError(""); },
    onError: (e: any) => setError(e.message),
  });

  const patchOrg = useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => apiFetch(`/api/organizations/${id}`, "PATCH", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organizations"] }); qc.invalidateQueries({ queryKey: ["organization", expandedId] }); },
  });

  const createDept = useMutation({
    mutationFn: (body: unknown) => apiFetch("/api/departments", "POST", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organization", showAddDept] }); setShowAddDept(null); setDeptForm({ name: "", level: 2, parentId: "" }); setError(""); },
    onError: (e: any) => setError(e.message),
  });

  const deleteDept = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/departments/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization", expandedId] }),
  });

  const departments: any[] = expandedOrg?.departments ?? [];

  function buildTree(depts: any[], parentId: number | null = null): any[] {
    return depts
      .filter((d: any) => (d.parentId ?? null) === parentId)
      .map((d: any) => ({ ...d, children: buildTree(depts, d.id) }));
  }

  function DeptNode({ dept, depth = 0 }: { dept: any; depth?: number }) {
    return (
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px", paddingRight: 12 + depth * 20,
          borderBottom: "1px solid #f0f4ef",
          background: depth % 2 === 0 ? "#fff" : "#fafcfa",
        }}>
          <span style={{ flex: 1, fontSize: 14, color: "#222" }}>{dept.name}</span>
          <span style={{ fontSize: 11, color: "#8a978a", background: "#f4f6f2", padding: "1px 8px", borderRadius: 999 }}>
            {LEVEL_LABEL[dept.level] ?? `مستوى ${dept.level}`}
          </span>
          <button
            onClick={() => deleteDept.mutate(dept.id)}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#c0492f", fontSize: 16, padding: "0 4px" }}
            title="حذف القسم"
          >×</button>
        </div>
        {dept.children?.map((c: any) => <DeptNode key={c.id} dept={c} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }} dir="rtl">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2e1a", margin: 0 }}>المنظمات والأقسام</h1>
          <p style={{ fontSize: 14, color: "#5a675a", margin: "4px 0 0" }}>إدارة هيكل المنظمات والأقسام التنظيمية</p>
        </div>
        <button
          onClick={() => { setShowAddOrg(true); setError(""); }}
          style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          + إضافة منظمة
        </button>
      </div>

      {/* Add org dialog */}
      {showAddOrg && (
        <div style={{ background: "#fff", border: "1px solid #d8e4d8", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a2e1a" }}>منظمة جديدة</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              placeholder="اسم المنظمة *"
              value={orgForm.name}
              onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))}
              style={{ border: "1px solid #cdd9cc", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }}
            />
            <select
              value={orgForm.type}
              onChange={e => setOrgForm(f => ({ ...f, type: e.target.value }))}
              style={{ border: "1px solid #cdd9cc", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "#fff", outline: "none" }}
            >
              <option value="government">حكومية</option>
              <option value="private">خاصة</option>
              <option value="ngo">غير ربحية</option>
              <option value="academic">أكاديمية</option>
            </select>
            <input
              placeholder="وصف (اختياري)"
              value={orgForm.description}
              onChange={e => setOrgForm(f => ({ ...f, description: e.target.value }))}
              style={{ border: "1px solid #cdd9cc", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }}
            />
            {error && <div style={{ color: "#c0492f", fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowAddOrg(false); setError(""); }} style={{ border: "1px solid #cdd9cc", background: "#fff", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 14 }}>إلغاء</button>
              <button
                onClick={() => createOrg.mutate({ name: orgForm.name, type: orgForm.type, description: orgForm.description || undefined })}
                disabled={!orgForm.name.trim() || createOrg.isPending}
                style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: !orgForm.name.trim() ? 0.5 : 1 }}
              >
                {createOrg.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orgs list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>جارٍ التحميل...</div>
      ) : orgs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>لا توجد منظمات حتى الآن</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orgs.map((org: any) => (
            <div key={org.id} style={{ background: "#fff", border: "1px solid #d8e4d8", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Org row */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", userSelect: "none" }}
                onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
              >
                <span style={{ fontSize: 16, color: "#5a675a" }}>{expandedId === org.id ? "▲" : "▼"}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#1a2e1a" }}>{org.name}</span>
                <span style={{ fontSize: 12, color: "#8a978a", background: "#f4f6f2", padding: "2px 8px", borderRadius: 999 }}>
                  {org.type === "government" ? "حكومية" : org.type === "private" ? "خاصة" : org.type === "ngo" ? "غير ربحية" : org.type === "academic" ? "أكاديمية" : org.type}
                </span>
                <Badge value={org.status ?? "active"} />
                <button
                  onClick={e => { e.stopPropagation(); patchOrg.mutate({ id: org.id, body: { status: org.status === "active" ? "inactive" : "active" } }); }}
                  style={{ border: "1px solid #d8e4d8", background: "#f9fbf9", borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#5a675a" }}
                  title="تغيير الحالة"
                >
                  {org.status === "active" ? "تعطيل" : "تفعيل"}
                </button>
              </div>

              {/* Expanded: departments */}
              {expandedId === org.id && (
                <div style={{ borderTop: "1px solid #e6ece4" }}>
                  <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fbf9" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#5a675a" }}>الأقسام</span>
                    <button
                      onClick={() => { setShowAddDept(org.id); setError(""); }}
                      style={{ border: "1px solid #1f7a4d", background: "#fff", color: "#1f7a4d", borderRadius: 8, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                    >
                      + قسم جديد
                    </button>
                  </div>

                  {/* Add dept inline form */}
                  {showAddDept === org.id && (
                    <div style={{ padding: "12px 18px", background: "#f4f9f5", borderBottom: "1px solid #e6ece4" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input
                          placeholder="اسم القسم *"
                          value={deptForm.name}
                          onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))}
                          style={{ flex: 2, border: "1px solid #cdd9cc", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", minWidth: 140 }}
                        />
                        <select
                          value={deptForm.level}
                          onChange={e => setDeptForm(f => ({ ...f, level: parseInt(e.target.value) }))}
                          style={{ flex: 1, border: "1px solid #cdd9cc", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "#fff", outline: "none", minWidth: 100 }}
                        >
                          <option value={1}>مستوى 1</option>
                          <option value={2}>مستوى 2</option>
                          <option value={3}>مستوى 3</option>
                          <option value={4}>مستوى 4</option>
                        </select>
                        <button
                          onClick={() => createDept.mutate({ organizationId: org.id, name: deptForm.name, level: deptForm.level, parentId: deptForm.parentId ? parseInt(deptForm.parentId) : undefined })}
                          disabled={!deptForm.name.trim() || createDept.isPending}
                          style={{ background: "#1f7a4d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600, opacity: !deptForm.name.trim() ? 0.5 : 1 }}
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => { setShowAddDept(null); setError(""); }}
                          style={{ border: "1px solid #cdd9cc", background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}
                        >
                          إلغاء
                        </button>
                      </div>
                      {error && <div style={{ color: "#c0492f", fontSize: 12, marginTop: 6 }}>{error}</div>}
                    </div>
                  )}

                  {departments.length === 0 ? (
                    <div style={{ padding: "20px 18px", color: "#8a978a", fontSize: 13, textAlign: "center" }}>لا توجد أقسام</div>
                  ) : (
                    buildTree(departments).map((d: any) => <DeptNode key={d.id} dept={d} />)
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
