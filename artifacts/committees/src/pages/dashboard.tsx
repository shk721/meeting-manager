import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import * as api from "@/api/committees";
import type { Committee } from "@/api/committees";
import { useAuth } from "@/hooks/use-auth";
import { C, SP, Btn, Inp, Sel, Modal, Toast, Badge, EmptyState } from "@/components/shared";

const TYPE_LABEL: Record<string, string> = { external: "خارجية", internal: "داخلية" };
const TYPE_COLOR: Record<string, string> = { external: "#f59e0b", internal: "#0ea5e9" };
const STATUS_LABEL: Record<string, string> = { active: "نشطة", inactive: "غير نشطة", archived: "مؤرشفة" };
const STATUS_COLOR: Record<string, string> = { active: "#10b981", inactive: "#64748b", archived: "#475569" };

function AddCommitteeModal({ onAdd, onClose }: { onAdd: (data: Parameters<typeof api.createCommittee>[0]) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"external" | "internal">("external");
  const [organization, setOrganization] = useState("");
  const [frequency, setFrequency] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Modal title="إضافة لجنة جديدة" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:SP.md }}>
        <Inp value={name} onChange={setName} placeholder="اسم اللجنة" />
        <Sel value={type} onChange={v => setType(v as "external" | "internal")}
          options={[["external", "خارجية"], ["internal", "داخلية"]]} />
        <Inp value={organization} onChange={setOrganization} placeholder="الجهة المشرفة (اختياري)" />
        <Inp value={frequency} onChange={setFrequency} placeholder="دورية الاجتماعات (مثل: شهري، ربع سنوي)" />
        <Inp value={description} onChange={setDescription} placeholder="وصف مختصر (اختياري)" rows={3} />
        <Btn onClick={() => {
          if (!name.trim()) return;
          onAdd({ name, type, organization: organization || undefined, frequency: frequency || undefined, description: description || undefined });
        }}>إضافة</Btn>
      </div>
    </Modal>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "external" | "internal">("all");
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  const showToast = useCallback((msg: string) => setToast({ msg, key: Date.now() }), []);

  useEffect(() => {
    api.listCommittees().then(setCommittees).catch(() => showToast("⚠ فشل تحميل اللجان")).finally(() => setLoading(false));
  }, [showToast]);

  const addCommittee = async (data: Parameters<typeof api.createCommittee>[0]) => {
    try {
      const created = await api.createCommittee(data);
      setCommittees(prev => [...prev, created]);
      setShowAdd(false);
      showToast("✅ تمت إضافة اللجنة");
    } catch { showToast("⚠ فشل إضافة اللجنة"); }
  };

  const removeCommittee = async (id: number) => {
    try {
      await api.deleteCommittee(id);
      setCommittees(prev => prev.filter(c => c.id !== id));
      showToast("🗑 تم حذف اللجنة");
    } catch { showToast("⚠ فشل الحذف"); }
  };

  const visible = filter === "all" ? committees : committees.filter(c => c.type === filter);
  const externalCount = committees.filter(c => c.type === "external").length;
  const internalCount = committees.filter(c => c.type === "internal").length;
  const activeCount = committees.filter(c => c.status === "active").length;

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Cairo',sans-serif", color:C.sub, fontSize:15 }}>
        جارٍ تحميل البيانات…
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'Cairo','Segoe UI',sans-serif", direction:"rtl" }}>

      {/* Header */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"12px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
        position:"sticky", top:0, zIndex:50 }}>
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>🏛️ إدارة اللجان</div>
          <div style={{ fontSize:11, color:C.muted }}>اللجان الداخلية والخارجية وتكليفاتها</div>
        </div>
        <Link href="/portal"><Btn sm variant="ghost">🔎 البوابة الشخصية</Btn></Link>
        <div style={{ display:"flex", alignItems:"center", gap:8, borderRight:`1px solid ${C.border}`, paddingRight:12 }}>
          <span style={{ fontSize:11, color:C.muted }}>👤 {user?.fullName}</span>
          <Btn onClick={logout} sm variant="ghost">خروج</Btn>
        </div>
      </div>

      <div style={{ padding:20, maxWidth:1100, margin:"0 auto" }}>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:SP.md, marginBottom:SP.xl }}>
          {[
            { label:"إجمالي اللجان", value:committees.length, color:C.accent },
            { label:"لجان خارجية", value:externalCount, color:TYPE_COLOR.external },
            { label:"لجان داخلية", value:internalCount, color:TYPE_COLOR.internal },
            { label:"لجان نشطة", value:activeCount, color:STATUS_COLOR.active },
          ].map(k => (
            <div key={k.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.value}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filters + Add */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:SP.md, flexWrap:"wrap", gap:SP.sm }}>
          <div style={{ display:"flex", gap:8 }}>
            <Btn sm active={filter === "all"} onClick={() => setFilter("all")}>الكل</Btn>
            <Btn sm active={filter === "external"} onClick={() => setFilter("external")}>خارجية</Btn>
            <Btn sm active={filter === "internal"} onClick={() => setFilter("internal")}>داخلية</Btn>
          </div>
          <Btn onClick={() => setShowAdd(true)}>+ لجنة جديدة</Btn>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <EmptyState icon="🏛️" title="لا توجد لجان" sub="ابدأ بإضافة أول لجنة" />
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:SP.md }}>
            {visible.map(c => (
              <Link key={c.id} href={`/committees/${c.id}`} style={{ textDecoration:"none" }}>
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16,
                  cursor:"pointer", transition:"border-color .15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{c.name}</div>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); removeCommittee(c.id); }}
                      style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, opacity:.5 }}>✕</button>
                  </div>
                  {c.organization && <div style={{ fontSize:12, color:C.sub, marginTop:4 }}>{c.organization}</div>}
                  <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                    <Badge label={TYPE_LABEL[c.type] ?? c.type} color={TYPE_COLOR[c.type] ?? C.sub} />
                    <Badge label={STATUS_LABEL[c.status] ?? c.status} color={STATUS_COLOR[c.status] ?? C.sub} />
                    {c.frequency && <Badge label={c.frequency} color={C.muted} />}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddCommitteeModal onAdd={addCommittee} onClose={() => setShowAdd(false)} />}
      {toast && <Toast key={toast.key} msg={toast.msg} onDone={() => setToast(null)} />}
    </div>
  );
}
