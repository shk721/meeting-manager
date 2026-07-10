import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowRight, CalendarDays, CheckSquare, Shield, TrendingUp, User, Clock, FileText } from "lucide-react";

async function fetchDecision(id: string) {
  const res = await fetch(`/api/decisions/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  draft:          { label: "مسودة",           bg: "#f4f6f2", color: "#5a675a" },
  pending_review: { label: "بانتظار المراجعة", bg: "#fbf1dd", color: "#a97918" },
  approved:       { label: "معتمد",            bg: "#e8f2ea", color: "#1f7a4d" },
  rejected:       { label: "مرفوض",           bg: "#fbeeea", color: "#c0492f" },
  deferred:       { label: "مؤجل",            bg: "#f0f0fb", color: "#5b5bbf" },
  cancelled:      { label: "ملغى",            bg: "#f4f4f4", color: "#8a978a" },
};

const TYPE_LABEL: Record<string, string> = {
  strategic:   "استراتيجي",
  operational: "تشغيلي",
  procedural:  "إجرائي",
  financial:   "مالي",
  hr:          "موارد بشرية",
  other:       "أخرى",
};

const TASK_STATUS: Record<string, { label: string; color: string }> = {
  open:        { label: "مفتوحة",    color: "#3b82f6" },
  in_progress: { label: "جارية",    color: "#f59e0b" },
  completed:   { label: "مكتملة",   color: "#1f7a4d" },
  done:        { label: "منجزة",    color: "#1f7a4d" },
  on_hold:     { label: "معلّقة",   color: "#8b5cf6" },
  overdue:     { label: "متأخرة",   color: "#c0492f" },
  cancelled:   { label: "ملغاة",    color: "#8a978a" },
};

interface Props { id: string }

export default function DecisionDetail({ id }: Props) {
  const [, navigate] = useLocation();
  const { data: decision, isLoading, isError } = useQuery({
    queryKey: ["decision", id],
    queryFn: () => fetchDecision(id),
  });

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>جارٍ التحميل...</div>;
  }
  if (isError || !decision) {
    return <div style={{ textAlign: "center", padding: 60, color: "#c0492f" }}>لم يتم العثور على القرار</div>;
  }

  const status = STATUS_STYLE[decision.status] ?? STATUS_STYLE.approved;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#8a978a" }}>
        {decision.meeting ? (
          <>
            <Link href="/meetings" style={{ color: "#8a978a", textDecoration: "none" }}>الاجتماعات</Link>
            <ArrowRight size={13} />
            <Link href={`/meetings/${decision.meeting.id}`} style={{ color: "#8a978a", textDecoration: "none" }}>{decision.meeting.title}</Link>
          </>
        ) : decision.governanceContext ? (
          <>
            <Link href="/governance" style={{ color: "#8a978a", textDecoration: "none" }}>الحوكمة</Link>
            <ArrowRight size={13} />
            <span>{decision.governanceContext.name}</span>
          </>
        ) : (
          <span>القرارات</span>
        )}
        <ArrowRight size={13} />
        <span style={{ color: "#1c261c" }}>تفاصيل القرار</span>
      </div>

      {/* Header card */}
      <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: status.bg, color: status.color, fontWeight: 600 }}>
                {status.label}
              </span>
              {decision.decisionType && (
                <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: "#f4f6f2", color: "#5a675a" }}>
                  {TYPE_LABEL[decision.decisionType] ?? decision.decisionType}
                </span>
              )}
            </div>
            <h1 style={{ margin: 0, font: "700 22px Cairo", color: "#1c261c", lineHeight: 1.4 }}>
              {decision.title ?? decision.content.slice(0, 80)}
            </h1>
            {decision.agendaItem && (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#8a978a" }}>بند جدول الأعمال: {decision.agendaItem}</p>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#8a978a", flexShrink: 0, textAlign: "left" }}>
            {new Date(decision.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Decision content */}
          <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 20 }}>
            <h2 style={{ margin: "0 0 12px", font: "700 14px Cairo", color: "#1c261c" }}>نص القرار</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#3f5145", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{decision.content}</p>
          </div>

          {/* Rationale */}
          {decision.rationale && (
            <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 20 }}>
              <h2 style={{ margin: "0 0 12px", font: "700 14px Cairo", color: "#1c261c" }}>المبررات والأسباب</h2>
              <p style={{ margin: 0, fontSize: 14, color: "#3f5145", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{decision.rationale}</p>
            </div>
          )}

          {/* Notes */}
          {decision.notes && (
            <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 20 }}>
              <h2 style={{ margin: "0 0 12px", font: "700 14px Cairo", color: "#1c261c" }}>ملاحظات</h2>
              <p style={{ margin: 0, fontSize: 14, color: "#3f5145", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{decision.notes}</p>
            </div>
          )}

          {/* Related tasks */}
          {decision.tasks?.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 20 }}>
              <h2 style={{ margin: "0 0 14px", font: "700 14px Cairo", color: "#1c261c" }}>
                المهام المرتبطة
                <span style={{ marginRight: 8, fontSize: 12, fontWeight: 400, padding: "2px 8px", borderRadius: 10, background: "#f4f6f2", color: "#5a675a" }}>
                  {decision.tasks.length}
                </span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {decision.tasks.map((t: any) => {
                  const ts = TASK_STATUS[t.status] ?? { label: t.status, color: "#8a978a" };
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "#f7f9f6", border: "1px solid #eef2ec" }}>
                      <CheckSquare size={15} style={{ color: ts.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#1c261c" }}>{t.title}</span>
                      <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 10, background: "#fff", color: ts.color, border: `1px solid ${ts.color}22` }}>{ts.label}</span>
                      {t.dueDate && (
                        <span style={{ fontSize: 11.5, color: "#8a978a" }}>
                          {new Date(t.dueDate + "T00:00:00").toLocaleDateString("ar-SA")}
                        </span>
                      )}
                      {t.completionPercent > 0 && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1f7a4d" }}>{t.completionPercent}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Meta card */}
          <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 16 }}>
            <h3 style={{ margin: "0 0 14px", font: "600 13px Cairo", color: "#8a978a" }}>معلومات القرار</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {decision.dueDate && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Clock size={15} style={{ color: "#8a978a", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#8a978a" }}>تاريخ التنفيذ</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1c261c" }}>
                      {new Date(decision.dueDate + "T00:00:00").toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                </div>
              )}

              {decision.assignee && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <User size={15} style={{ color: "#8a978a", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#8a978a" }}>المكلّف بالتنفيذ</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1c261c" }}>{decision.assignee.fullName}</div>
                  </div>
                </div>
              )}

              {decision.approver && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <User size={15} style={{ color: "#1f7a4d", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#8a978a" }}>المعتمِد</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1c261c" }}>{decision.approver.fullName}</div>
                  </div>
                </div>
              )}

              {decision.meeting && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CalendarDays size={15} style={{ color: "#1f7a4d", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#8a978a" }}>مصدر القرار</div>
                    <Link href={`/meetings/${decision.meeting.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#1f7a4d", textDecoration: "none" }}>
                      {decision.meeting.title}
                    </Link>
                  </div>
                </div>
              )}

              {decision.governanceContext && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Shield size={15} style={{ color: "#a97918", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#8a978a" }}>هيئة الحوكمة</div>
                    <Link href="/governance" style={{ fontSize: 13, fontWeight: 600, color: "#a97918", textDecoration: "none" }}>
                      {decision.governanceContext.name}
                    </Link>
                  </div>
                </div>
              )}

              {decision.plan && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TrendingUp size={15} style={{ color: "#6d28d9", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#8a978a" }}>الخطة المرتبطة</div>
                    <Link href={`/planning/plans/${decision.plan.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#6d28d9", textDecoration: "none" }}>
                      {decision.plan.title}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => decision.meeting ? navigate(`/meetings/${decision.meeting.id}`) : navigate("/meetings")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", borderRadius: 10, border: "1px solid #e6ece4", background: "#fff", cursor: "pointer", fontSize: 13, color: "#5a675a" }}
          >
            <ArrowRight size={14} />
            العودة
          </button>
        </div>
      </div>
    </div>
  );
}
