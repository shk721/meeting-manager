import { useState } from "react";
import { Link } from "wouter";
import * as portalApi from "@/api/portal";
import type { PortalSummary } from "@/api/portal";
import { ApiError } from "@/api/client";
import { C, SP, Btn, Inp, Badge, EmptyState } from "@/components/shared";

const TASK_STATUS_LABEL: Record<string, string> = { open: "مفتوحة", in_progress: "جاري التنفيذ", completed: "مكتملة", cancelled: "ملغاة", on_hold: "متوقفة" };
const ROLE_LABEL: Record<string, string> = { admin: "مشرف", manager: "مسؤول", member: "متابع", viewer: "متابع" };
const REP_ROLE_LABEL: Record<string, string> = { head: "رئيس", member: "عضو", alternate: "عضو مناوب" };

function taskSourceLabel(t: portalApi.PortalTask): string {
  if (t.meetingId) return "اجتماع";
  if (t.componentId) return "تحول رقمي";
  if (t.committeeId) return "لجنة";
  return "مباشر";
}

export default function PortalPage() {
  const [username, setUsername] = useState("");
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await portalApi.getPortalSummary(username.trim());
      setSummary(data);
    } catch (e) {
      setSummary(null);
      setError(e instanceof ApiError && e.status === 404 ? "لم يتم العثور على هذا المستخدم" : "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'Cairo','Segoe UI',sans-serif", direction:"rtl" }}>

      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"12px 20px", display:"flex", alignItems:"center", gap:14 }}>
        <Link href="/login"><Btn sm variant="ghost">→ تسجيل الدخول</Btn></Link>
        <div style={{ fontSize:17, fontWeight:800 }}>🔎 البوابة الشخصية</div>
      </div>

      <div style={{ padding:24, maxWidth:760, margin:"0 auto" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:18, marginBottom:SP.xl }}>
          <div style={{ fontSize:13, color:C.sub, marginBottom:SP.md }}>أدخل اسم المستخدم لعرض ملخصك الشخصي — لا حاجة لكلمة مرور</div>
          <div style={{ display:"flex", gap:8 }}>
            <Inp value={username} onChange={setUsername} placeholder="اسم المستخدم" />
            <Btn onClick={search}>{loading ? "..." : "عرض"}</Btn>
          </div>
          {error && (
            <div style={{ marginTop:14, color:"#f87171", fontSize:13, background:"#ef444420",
              padding:"8px 16px", borderRadius:8, border:"1px solid #ef444440" }}>
              {error}
            </div>
          )}
        </div>

        {summary && (
          <div style={{ display:"flex", flexDirection:"column", gap:SP.xl }}>
            {/* Profile */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>{summary.user.fullName}</div>
                <div style={{ fontSize:12, color:C.muted }}>{summary.user.email}{summary.user.department ? ` — ${summary.user.department}` : ""}</div>
              </div>
              <Badge label={ROLE_LABEL[summary.user.role] ?? summary.user.role} color={C.accent} />
            </div>

            {/* Tasks */}
            <Section title={`مهامي (${summary.tasks.length})`}>
              {summary.tasks.length === 0
                ? <EmptyState icon="✅" title="لا توجد مهام مسندة إليك" />
                : summary.tasks
                    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
                    .map(t => (
                      <Row key={t.id}>
                        <div style={{ fontWeight:700, fontSize:13 }}>{t.title}</div>
                        <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                          <Badge label={TASK_STATUS_LABEL[t.status] ?? t.status} color={C.accent} />
                          <Badge label={taskSourceLabel(t)} color={C.muted} />
                          {t.dueDate && <Badge label={`الاستحقاق: ${t.dueDate}`} color={C.amber} />}
                        </div>
                      </Row>
                    ))}
            </Section>

            {/* Committees */}
            <Section title={`لجاني (${summary.committees.length})`}>
              {summary.committees.length === 0
                ? <EmptyState icon="🏛️" title="لست ممثلاً في أي لجنة" />
                : summary.committees.map(c => (
                    <Row key={c.id}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                      <div style={{ display:"flex", gap:6, marginTop:6 }}>
                        <Badge label={REP_ROLE_LABEL[c.myRole] ?? c.myRole} color={C.accent} />
                        <Badge label={c.type === "external" ? "خارجية" : "داخلية"} color={C.muted} />
                      </div>
                    </Row>
                  ))}
            </Section>

            {/* Committee decisions */}
            <Section title={`القرارات المعلّقة على لجاني (${summary.committeeDecisions.length})`}>
              {summary.committeeDecisions.length === 0
                ? <EmptyState icon="📥" title="لا توجد قرارات واردة" />
                : summary.committeeDecisions.map(d => (
                    <Row key={d.id}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{d.content}</div>
                      {d.dueDate && <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>الاستحقاق: {d.dueDate}</div>}
                    </Row>
                  ))}
            </Section>

            {/* DT components */}
            <Section title={`مبادرات التحول الرقمي المرتبطة (${summary.dtComponents.length})`}>
              {summary.dtComponents.length === 0
                ? <EmptyState icon="📊" title="لا توجد مبادرات مرتبطة" />
                : summary.dtComponents.map(c => (
                    <Row key={c.id}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.title}</div>
                      <Badge label={c.priority} color={C.muted} />
                    </Row>
                  ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:SP.md }}>{title}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:SP.sm }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
      {children}
    </div>
  );
}
