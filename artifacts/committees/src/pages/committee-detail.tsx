import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import * as api from "@/api/committees";
import type { CommitteeFull } from "@/api/committees";
import { C, SP, Btn, Inp, Sel, Modal, Toast, Badge, EmptyState } from "@/components/shared";

const TYPE_LABEL: Record<string, string> = { external: "خارجية", internal: "داخلية" };
const TYPE_COLOR: Record<string, string> = { external: "#f59e0b", internal: "#0ea5e9" };
const STATUS_LABEL: Record<string, string> = { active: "نشطة", inactive: "غير نشطة", archived: "مؤرشفة" };
const STATUS_COLOR: Record<string, string> = { active: "#10b981", inactive: "#64748b", archived: "#475569" };
const REP_ROLE_LABEL: Record<string, string> = { head: "رئيس", member: "عضو", alternate: "عضو مناوب" };
const SESSION_STATUS_LABEL: Record<string, string> = { scheduled: "مجدولة", completed: "مكتملة", cancelled: "ملغاة" };
const TASK_STATUS_LABEL: Record<string, string> = { open: "مفتوحة", in_progress: "جاري التنفيذ", completed: "مكتملة", cancelled: "ملغاة", on_hold: "متوقفة" };

type Tab = "sessions" | "representatives" | "decisions" | "outgoing" | "tasks";

function AddRepModal({ onAdd, onClose }: { onAdd: (data: Parameters<typeof api.addRepresentative>[1]) => void; onClose: () => void }) {
  const [kind, setKind] = useState<"external" | "internal">("external");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"head" | "member" | "alternate">("member");

  return (
    <Modal title="إضافة ممثل" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:SP.md }}>
        <Sel value={kind} onChange={v => setKind(v as "external" | "internal")}
          options={[["external", "ممثل خارجي (اسم وبريد)"], ["internal", "مستخدم داخلي (معرّف المستخدم)"]]} />
        {kind === "external" ? (
          <>
            <Inp value={name} onChange={setName} placeholder="اسم الممثل" />
            <Inp value={email} onChange={setEmail} placeholder="البريد الإلكتروني (اختياري)" />
          </>
        ) : (
          <Inp value={userId} onChange={setUserId} placeholder="معرّف المستخدم (User ID)" type="number" />
        )}
        <Sel value={role} onChange={v => setRole(v as "head" | "member" | "alternate")}
          options={[["head", "رئيس"], ["member", "عضو"], ["alternate", "عضو مناوب"]]} />
        <Btn onClick={() => {
          if (kind === "external") {
            if (!name.trim()) return;
            onAdd({ externalName: name, externalEmail: email || undefined, role });
          } else {
            const id = parseInt(userId, 10);
            if (isNaN(id)) return;
            onAdd({ userId: id, role });
          }
        }}>إضافة</Btn>
      </div>
    </Modal>
  );
}

function AddSessionModal({ onAdd, onClose }: { onAdd: (data: Parameters<typeof api.addSession>[1]) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingId, setMeetingId] = useState("");

  return (
    <Modal title="إضافة جلسة" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:SP.md }}>
        <Inp value={title} onChange={setTitle} placeholder="عنوان الجلسة" />
        <Inp value={date} onChange={setDate} placeholder="التاريخ (YYYY-MM-DD)" type="date" />
        <Inp value={location} onChange={setLocation} placeholder="الموقع (اختياري)" />
        <Inp value={meetingId} onChange={setMeetingId} placeholder="رقم الاجتماع المرتبط (اختياري)" type="number" />
        <Inp value={notes} onChange={setNotes} placeholder="ملاحظات (اختياري)" rows={3} />
        <Btn onClick={() => {
          if (!title.trim() || !date.trim()) return;
          const mid = meetingId ? parseInt(meetingId, 10) : undefined;
          onAdd({ title, date, location: location || undefined, notes: notes || undefined, meetingId: mid && !isNaN(mid) ? mid : undefined });
        }}>إضافة</Btn>
      </div>
    </Modal>
  );
}

function AddDecisionModal({ sessions, onAdd, onClose }: {
  sessions: CommitteeFull["sessions"];
  onAdd: (data: Parameters<typeof api.addDecision>[1]) => void; onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [notes, setNotes] = useState("");

  return (
    <Modal title="إضافة تكليف/قرار وارد" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:SP.md }}>
        <Inp value={content} onChange={setContent} placeholder="نص التكليف أو القرار" rows={3} />
        <Sel value={sessionId} onChange={setSessionId}
          options={[["", "بدون جلسة محددة"], ...sessions.map(s => [String(s.id), s.title] as [string, string])]} />
        <Inp value={dueDate} onChange={setDueDate} placeholder="تاريخ الاستحقاق (اختياري)" type="date" />
        <Inp value={notes} onChange={setNotes} placeholder="ملاحظات (اختياري)" rows={2} />
        <Btn onClick={() => {
          if (!content.trim()) return;
          onAdd({ content, dueDate: dueDate || undefined, sessionId: sessionId ? parseInt(sessionId, 10) : undefined, notes: notes || undefined });
        }}>إضافة (سيُنشأ مهمة مرتبطة تلقائياً)</Btn>
      </div>
    </Modal>
  );
}

function AddOutgoingModal({ sessions, onAdd, onClose }: {
  sessions: CommitteeFull["sessions"];
  onAdd: (data: Parameters<typeof api.addOutgoing>[1]) => void; onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [sentDate, setSentDate] = useState("");

  return (
    <Modal title="إضافة معلومة صادرة" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:SP.md }}>
        <Inp value={subject} onChange={setSubject} placeholder="الموضوع" />
        <Inp value={content} onChange={setContent} placeholder="المحتوى (اختياري)" rows={3} />
        <Sel value={sessionId} onChange={setSessionId}
          options={[["", "بدون جلسة محددة"], ...sessions.map(s => [String(s.id), s.title] as [string, string])]} />
        <Inp value={sentDate} onChange={setSentDate} placeholder="تاريخ الإرسال (اختياري)" type="date" />
        <Btn onClick={() => {
          if (!subject.trim()) return;
          onAdd({ subject, content: content || undefined, sessionId: sessionId ? parseInt(sessionId, 10) : undefined, sentDate: sentDate || undefined });
        }}>إضافة</Btn>
      </div>
    </Modal>
  );
}

export default function CommitteeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [committee, setCommittee] = useState<CommitteeFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("sessions");
  const [modal, setModal] = useState<Tab | null>(null);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  const showToast = useCallback((msg: string) => setToast({ msg, key: Date.now() }), []);

  const reload = useCallback(() => {
    api.getCommittee(id).then(setCommittee).catch(() => showToast("⚠ فشل تحميل اللجنة")).finally(() => setLoading(false));
  }, [id, showToast]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Cairo',sans-serif", color:C.sub, fontSize:15 }}>
        جارٍ تحميل البيانات…
      </div>
    );
  }

  if (!committee) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Cairo',sans-serif", color:C.red, fontSize:15 }}>
        تعذّر تحميل اللجنة.
      </div>
    );
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "sessions", label: "الجلسات", count: committee.sessions.length },
    { key: "representatives", label: "الممثلون", count: committee.representatives.length },
    { key: "decisions", label: "القرارات/التكليفات", count: committee.decisions.length },
    { key: "outgoing", label: "المعلومات الصادرة", count: committee.outgoing.length },
    { key: "tasks", label: "المهام المرتبطة", count: committee.tasks.length },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'Cairo','Segoe UI',sans-serif", direction:"rtl" }}>

      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"12px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
        position:"sticky", top:0, zIndex:50 }}>
        <Link href="/"><Btn sm variant="ghost">→ رجوع</Btn></Link>
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{committee.name}</div>
          <div style={{ fontSize:11, color:C.muted }}>{committee.organization ?? ""}</div>
        </div>
        <Badge label={TYPE_LABEL[committee.type] ?? committee.type} color={TYPE_COLOR[committee.type] ?? C.sub} />
        <Badge label={STATUS_LABEL[committee.status] ?? committee.status} color={STATUS_COLOR[committee.status] ?? C.sub} />
      </div>

      <div style={{ padding:20, maxWidth:1100, margin:"0 auto" }}>
        {committee.description && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:SP.lg, fontSize:13, color:C.sub }}>
            {committee.description}
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:SP.lg, flexWrap:"wrap" }}>
          {TABS.map(t => (
            <Btn key={t.key} sm active={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label} ({t.count})
            </Btn>
          ))}
        </div>

        {tab === "sessions" && (
          <Section title="الجلسات" onAdd={() => setModal("sessions")}>
            {committee.sessions.length === 0
              ? <EmptyState icon="🗓️" title="لا توجد جلسات" />
              : committee.sessions.map(s => (
                <Row key={s.id} onDelete={() => api.deleteSession(s.id).then(reload).catch(() => showToast("⚠ فشل الحذف"))}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{s.title}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.date} {s.location ? `— ${s.location}` : ""}</div>
                  <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
                    <Badge label={SESSION_STATUS_LABEL[s.status] ?? s.status} color={C.accent} />
                    {s.meetingId && <Badge label={`اجتماع #${s.meetingId}`} color={C.green} />}
                  </div>
                </Row>
              ))}
          </Section>
        )}

        {tab === "representatives" && (
          <Section title="الممثلون" onAdd={() => setModal("representatives")}>
            {committee.representatives.length === 0
              ? <EmptyState icon="👥" title="لا يوجد ممثلون" />
              : committee.representatives.map(r => (
                <Row key={r.id} onDelete={() => api.deleteRepresentative(r.id).then(reload).catch(() => showToast("⚠ فشل الحذف"))}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{r.user?.fullName ?? r.externalName ?? "—"}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{r.user?.email ?? r.externalEmail ?? ""}</div>
                  <Badge label={REP_ROLE_LABEL[r.role] ?? r.role} color={C.accent} />
                </Row>
              ))}
          </Section>
        )}

        {tab === "decisions" && (
          <Section title="القرارات/التكليفات الواردة" onAdd={() => setModal("decisions")}>
            {committee.decisions.length === 0
              ? <EmptyState icon="📥" title="لا توجد قرارات واردة" />
              : committee.decisions.map(d => (
                <Row key={d.id} onDelete={() => api.deleteDecision(d.id).then(reload).catch(() => showToast("⚠ فشل الحذف"))}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{d.content}</div>
                  {d.dueDate && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>الاستحقاق: {d.dueDate}</div>}
                  {d.notes && <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{d.notes}</div>}
                </Row>
              ))}
          </Section>
        )}

        {tab === "outgoing" && (
          <Section title="المعلومات الصادرة" onAdd={() => setModal("outgoing")}>
            {committee.outgoing.length === 0
              ? <EmptyState icon="📤" title="لا توجد معلومات صادرة" />
              : committee.outgoing.map(o => (
                <Row key={o.id} onDelete={() => api.deleteOutgoing(o.id).then(reload).catch(() => showToast("⚠ فشل الحذف"))}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{o.subject}</div>
                  {o.content && <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{o.content}</div>}
                  {o.sentDate && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>أُرسلت: {o.sentDate}</div>}
                </Row>
              ))}
          </Section>
        )}

        {tab === "tasks" && (
          <Section title="المهام المرتبطة">
            {committee.tasks.length === 0
              ? <EmptyState icon="✅" title="لا توجد مهام مرتبطة" />
              : committee.tasks.map(t => (
                <Row key={t.id}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{t.title}</div>
                  <div style={{ display:"flex", gap:8, marginTop:6, alignItems:"center", flexWrap:"wrap" }}>
                    <Sel value={t.status} onChange={async v => {
                      await api.updateTaskStatus(t.id, v).catch(() => showToast("⚠ فشل تحديث الحالة"));
                      reload();
                      showToast("✅ تم تحديث الحالة");
                    }} options={Object.entries(TASK_STATUS_LABEL).map(([k, lbl]) => [k, lbl] as [string, string])} />
                    {t.dueDate && <Badge label={`الاستحقاق: ${t.dueDate}`} color={C.amber} />}
                  </div>
                </Row>
              ))}
          </Section>
        )}
      </div>

      {modal === "representatives" && <AddRepModal
        onAdd={data => api.addRepresentative(id, data).then(() => { setModal(null); reload(); showToast("✅ تمت الإضافة"); }).catch(() => showToast("⚠ فشل الإضافة"))}
        onClose={() => setModal(null)} />}
      {modal === "sessions" && <AddSessionModal
        onAdd={data => api.addSession(id, data).then(() => { setModal(null); reload(); showToast("✅ تمت الإضافة"); }).catch(() => showToast("⚠ فشل الإضافة"))}
        onClose={() => setModal(null)} />}
      {modal === "decisions" && <AddDecisionModal sessions={committee.sessions}
        onAdd={data => api.addDecision(id, data).then(() => { setModal(null); reload(); showToast("✅ تمت الإضافة وإنشاء مهمة مرتبطة"); }).catch(() => showToast("⚠ فشل الإضافة"))}
        onClose={() => setModal(null)} />}
      {modal === "outgoing" && <AddOutgoingModal sessions={committee.sessions}
        onAdd={data => api.addOutgoing(id, data).then(() => { setModal(null); reload(); showToast("✅ تمت الإضافة"); }).catch(() => showToast("⚠ فشل الإضافة"))}
        onClose={() => setModal(null)} />}
      {toast && <Toast key={toast.key} msg={toast.msg} onDone={() => setToast(null)} />}
    </div>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:SP.md }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{title}</div>
        {onAdd && <Btn sm onClick={onAdd}>+ إضافة</Btn>}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:SP.sm }}>{children}</div>
    </div>
  );
}

function Row({ children, onDelete }: { children: React.ReactNode; onDelete?: () => void }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14,
      display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
      <div style={{ flex:1 }}>{children}</div>
      {onDelete && <button onClick={onDelete}
        style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, opacity:.5 }}>✕</button>}
    </div>
  );
}
