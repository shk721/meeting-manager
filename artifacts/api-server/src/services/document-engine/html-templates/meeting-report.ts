import { wrapInBase, escHtml, statusBadge, priorityLabel } from "./base";

const MEETING_STATUS: Record<string, string> = {
  scheduled: "مجدول", in_progress: "جارٍ", completed: "مكتمل",
  postponed: "مؤجل", cancelled: "ملغى",
};
const DECISION_STATUS: Record<string, string> = {
  draft: "مسودة", pending_review: "بانتظار المراجعة", approved: "معتمد",
  rejected: "مرفوض", deferred: "مؤجل", cancelled: "ملغى",
};
const TASK_STATUS: Record<string, string> = {
  open: "مفتوحة", in_progress: "جارية", completed: "مكتملة",
  on_hold: "معلّقة", cancelled: "ملغاة",
};

export function generateMeetingReportHtml(data: {
  meeting: { id: number; title: string; date: string; time: string; status: string; location?: string | null; project?: string | null; objectives?: string | null };
  minutes?: { executiveSummary?: string | null; discussionItems?: string | null } | null;
  attendees: { fullName: string; email?: string | null }[];
  decisions: { title?: string | null; content: string; status: string }[];
  tasks: { title: string; status: string; priority: string; dueDate?: string | null; assigneeName?: string | null }[];
}): string {
  const { meeting, minutes, attendees, decisions, tasks } = data;

  const meta = `
<div class="meta-grid">
  <div class="meta-item"><label>التاريخ</label><span>${new Date(meeting.date + "T00:00:00").toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
  <div class="meta-item"><label>الوقت</label><span>${escHtml(meeting.time)}</span></div>
  ${meeting.location ? `<div class="meta-item"><label>المكان</label><span>${escHtml(meeting.location)}</span></div>` : ""}
  ${meeting.project ? `<div class="meta-item"><label>المشروع</label><span>${escHtml(meeting.project)}</span></div>` : ""}
  <div class="meta-item"><label>الحالة</label><span>${statusBadge(meeting.status, MEETING_STATUS)}</span></div>
  <div class="meta-item"><label>عدد الحضور</label><span>${attendees.length}</span></div>
</div>
${meeting.objectives ? `<div class="section"><div class="section-title">أهداف الاجتماع</div><p style="color:#3f5145;line-height:1.8">${escHtml(meeting.objectives)}</p></div>` : ""}`;

  const summarySection = minutes?.executiveSummary ? `
<div class="section">
  <div class="section-title">الملخص التنفيذي</div>
  <p style="color:#3f5145;line-height:1.8;white-space:pre-wrap">${escHtml(minutes.executiveSummary)}</p>
</div>` : "";

  const attendeesSection = attendees.length > 0 ? `
<div class="section">
  <div class="section-title">قائمة الحضور (${attendees.length})</div>
  <table>
    <thead><tr><th>#</th><th>الاسم</th><th>البريد الإلكتروني</th></tr></thead>
    <tbody>${attendees.map((a, i) => `<tr><td>${i + 1}</td><td>${escHtml(a.fullName)}</td><td style="direction:ltr;text-align:left">${escHtml(a.email ?? "—")}</td></tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const decisionsSection = decisions.length > 0 ? `
<div class="section">
  <div class="section-title">القرارات (${decisions.length})</div>
  <table>
    <thead><tr><th>#</th><th>القرار</th><th>الحالة</th></tr></thead>
    <tbody>${decisions.map((d, i) => `<tr><td>${i + 1}</td><td>${escHtml(d.title ?? d.content.slice(0, 100))}</td><td>${statusBadge(d.status, DECISION_STATUS)}</td></tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const tasksSection = tasks.length > 0 ? `
<div class="section">
  <div class="section-title">المهام (${tasks.length})</div>
  <table>
    <thead><tr><th>#</th><th>المهمة</th><th>المكلَّف</th><th>الأولوية</th><th>الاستحقاق</th><th>الحالة</th></tr></thead>
    <tbody>${tasks.map((t, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(t.title)}</td>
      <td>${escHtml(t.assigneeName ?? "—")}</td>
      <td>${escHtml(priorityLabel(t.priority))}</td>
      <td>${t.dueDate ? new Date(t.dueDate + "T00:00:00").toLocaleDateString("ar-SA") : "—"}</td>
      <td>${statusBadge(t.status, TASK_STATUS)}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const body = meta + summarySection + attendeesSection + decisionsSection + tasksSection;
  return wrapInBase(meeting.title, body, "محضر اجتماع");
}
