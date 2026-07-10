import { wrapInBase, escHtml, statusBadge, priorityLabel } from "./base";

const PLAN_STATUS: Record<string, string> = {
  draft: "مسودة", active: "نشطة", in_progress: "جارية",
  on_hold: "معلّقة", overdue: "متأخرة", completed: "مكتملة",
};
const PHASE_STATUS: Record<string, string> = {
  pending: "معلّقة", in_progress: "جارية", completed: "مكتملة",
};
const TASK_STATUS: Record<string, string> = {
  open: "مفتوحة", in_progress: "جارية", completed: "مكتملة",
  on_hold: "معلّقة", cancelled: "ملغاة",
};
const DECISION_STATUS: Record<string, string> = {
  draft: "مسودة", pending_review: "بانتظار المراجعة", approved: "معتمد",
  rejected: "مرفوض", deferred: "مؤجل", cancelled: "ملغى",
};
const PLAN_TYPE: Record<string, string> = {
  operational: "تشغيلية", readiness: "جاهزية",
};

export function generatePlanReportHtml(data: {
  plan: { id: number; title: string; description?: string | null; type: string; status: string; startDate?: string | null; endDate?: string | null; notes?: string | null };
  progress: number;
  phases: { id: number; title: string; status: string; startDate?: string | null; endDate?: string | null; taskCount: number; completedTaskCount: number }[];
  tasks: { title: string; status: string; priority: string; dueDate?: string | null; assigneeName?: string | null; phaseName?: string | null }[];
  decisions: { title?: string | null; content: string; status: string }[];
}): string {
  const { plan, progress, phases, tasks, decisions } = data;

  const progressPct = Math.min(100, Math.max(0, Math.round(progress)));

  const meta = `
<div class="meta-grid">
  <div class="meta-item"><label>نوع الخطة</label><span>${escHtml(PLAN_TYPE[plan.type] ?? plan.type)}</span></div>
  <div class="meta-item"><label>الحالة</label><span>${statusBadge(plan.status, PLAN_STATUS)}</span></div>
  ${plan.startDate ? `<div class="meta-item"><label>تاريخ البداية</label><span>${new Date(plan.startDate + "T00:00:00").toLocaleDateString("ar-SA")}</span></div>` : ""}
  ${plan.endDate ? `<div class="meta-item"><label>تاريخ الانتهاء</label><span>${new Date(plan.endDate + "T00:00:00").toLocaleDateString("ar-SA")}</span></div>` : ""}
  <div class="meta-item"><label>المراحل</label><span>${phases.length}</span></div>
  <div class="meta-item"><label>المهام</label><span>${tasks.length}</span></div>
</div>
<div class="section" style="margin-bottom:20px">
  <div class="section-title">نسبة الإنجاز الإجمالية</div>
  <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
    <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${progressPct}%"></div></div>
    <span style="font-weight:700;color:#1f7a4d;font-size:15px">${progressPct}٪</span>
  </div>
</div>
${plan.description ? `<div class="section"><div class="section-title">وصف الخطة</div><p style="color:#3f5145;line-height:1.8">${escHtml(plan.description)}</p></div>` : ""}`;

  const phasesSection = phases.length > 0 ? `
<div class="section">
  <div class="section-title">المراحل (${phases.length})</div>
  <table>
    <thead><tr><th>#</th><th>المرحلة</th><th>الحالة</th><th>البداية</th><th>النهاية</th><th>المهام</th><th>المكتملة</th></tr></thead>
    <tbody>${phases.map((ph, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(ph.title)}</td>
      <td>${statusBadge(ph.status, PHASE_STATUS)}</td>
      <td>${ph.startDate ? new Date(ph.startDate + "T00:00:00").toLocaleDateString("ar-SA") : "—"}</td>
      <td>${ph.endDate ? new Date(ph.endDate + "T00:00:00").toLocaleDateString("ar-SA") : "—"}</td>
      <td style="text-align:center">${ph.taskCount}</td>
      <td style="text-align:center">${ph.completedTaskCount}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const tasksSection = tasks.length > 0 ? `
<div class="section">
  <div class="section-title">المهام (${tasks.length})</div>
  <table>
    <thead><tr><th>#</th><th>المهمة</th><th>المرحلة</th><th>المكلَّف</th><th>الأولوية</th><th>الاستحقاق</th><th>الحالة</th></tr></thead>
    <tbody>${tasks.map((t, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(t.title)}</td>
      <td>${escHtml(t.phaseName ?? "—")}</td>
      <td>${escHtml(t.assigneeName ?? "—")}</td>
      <td>${escHtml(priorityLabel(t.priority))}</td>
      <td>${t.dueDate ? new Date(t.dueDate + "T00:00:00").toLocaleDateString("ar-SA") : "—"}</td>
      <td>${statusBadge(t.status, TASK_STATUS)}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const decisionsSection = decisions.length > 0 ? `
<div class="section">
  <div class="section-title">القرارات المرتبطة (${decisions.length})</div>
  <table>
    <thead><tr><th>#</th><th>القرار</th><th>الحالة</th></tr></thead>
    <tbody>${decisions.map((d, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(d.title ?? d.content.slice(0, 100))}</td>
      <td>${statusBadge(d.status, DECISION_STATUS)}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const body = meta + phasesSection + tasksSection + decisionsSection;
  return wrapInBase(plan.title, body, "تقرير حالة الخطة");
}
