import { wrapInBase, escHtml, statusBadge } from "./base";

const GOV_STATUS: Record<string, string> = {
  active: "نشطة", suspended: "معلّقة", dissolved: "منحلّة",
};
const GOV_TYPE: Record<string, string> = {
  committee: "لجنة", board: "مجلس", team: "فريق",
  working_group: "مجموعة عمل", task_force: "فرقة مهام", joint: "مشتركة",
};
const MEMBER_ROLE: Record<string, string> = {
  chair: "رئيس", vice_chair: "نائب رئيس", secretary: "أمين سر",
  member: "عضو", observer: "مراقب", alternate: "بديل",
};
const DECISION_STATUS: Record<string, string> = {
  draft: "مسودة", pending_review: "بانتظار المراجعة", approved: "معتمد",
  rejected: "مرفوض", deferred: "مؤجل", cancelled: "ملغى",
};

export function generateGovernanceReportHtml(data: {
  context: {
    id: number; name: string; type: string; scope: string;
    status: string; description?: string | null; mandate?: string | null;
    meetingFrequency?: string | null; quorumPercent: number;
    establishedAt?: string | null;
  };
  members: { fullName: string; email?: string | null; role: string; isVoting: boolean; startDate?: string | null; endDate?: string | null }[];
  decisions: { title?: string | null; content: string; status: string; meetingTitle?: string | null }[];
  linkedMeetings: { title: string; date: string; status: string }[];
}): string {
  const { context, members, decisions, linkedMeetings } = data;

  const votingCount = members.filter(m => m.isVoting).length;
  const quorumNeeded = Math.ceil(votingCount * (context.quorumPercent / 100));

  const meta = `
<div class="meta-grid">
  <div class="meta-item"><label>النوع</label><span>${escHtml(GOV_TYPE[context.type] ?? context.type)}</span></div>
  <div class="meta-item"><label>الحالة</label><span>${statusBadge(context.status, GOV_STATUS)}</span></div>
  <div class="meta-item"><label>النطاق</label><span>${escHtml(context.scope === "internal" ? "داخلي" : context.scope === "external" ? "خارجي" : "مشترك")}</span></div>
  ${context.meetingFrequency ? `<div class="meta-item"><label>دورية الاجتماع</label><span>${escHtml(context.meetingFrequency)}</span></div>` : ""}
  <div class="meta-item"><label>نسبة النصاب</label><span>${context.quorumPercent}٪ (${quorumNeeded} من ${votingCount})</span></div>
  ${context.establishedAt ? `<div class="meta-item"><label>تاريخ التأسيس</label><span>${new Date(context.establishedAt + "T00:00:00").toLocaleDateString("ar-SA")}</span></div>` : ""}
</div>
${context.mandate ? `<div class="section"><div class="section-title">الاختصاصات والصلاحيات</div><p style="color:#3f5145;line-height:1.8;white-space:pre-wrap">${escHtml(context.mandate)}</p></div>` : ""}
${context.description ? `<div class="section"><div class="section-title">الوصف</div><p style="color:#3f5145;line-height:1.8">${escHtml(context.description)}</p></div>` : ""}`;

  const membersSection = members.length > 0 ? `
<div class="section">
  <div class="section-title">الأعضاء (${members.length})</div>
  <table>
    <thead><tr><th>#</th><th>الاسم</th><th>الدور</th><th>عضو تصويتي</th><th>البريد الإلكتروني</th><th>بداية العضوية</th></tr></thead>
    <tbody>${members.map((m, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(m.fullName)}</td>
      <td><span class="badge ${m.role === "chair" ? "badge-green" : m.role === "vice_chair" ? "badge-blue" : "badge-gray"}">${escHtml(MEMBER_ROLE[m.role] ?? m.role)}</span></td>
      <td style="text-align:center">${m.isVoting ? "✓" : "—"}</td>
      <td style="direction:ltr;text-align:left">${escHtml(m.email ?? "—")}</td>
      <td>${m.startDate ? new Date(m.startDate + "T00:00:00").toLocaleDateString("ar-SA") : "—"}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const decisionsSection = decisions.length > 0 ? `
<div class="section">
  <div class="section-title">القرارات (${decisions.length})</div>
  <table>
    <thead><tr><th>#</th><th>القرار</th><th>الاجتماع</th><th>الحالة</th></tr></thead>
    <tbody>${decisions.map((d, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(d.title ?? d.content.slice(0, 100))}</td>
      <td>${escHtml(d.meetingTitle ?? "—")}</td>
      <td>${statusBadge(d.status, DECISION_STATUS)}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const meetingsSection = linkedMeetings.length > 0 ? `
<div class="section">
  <div class="section-title">الاجتماعات المرتبطة (${linkedMeetings.length})</div>
  <table>
    <thead><tr><th>#</th><th>الاجتماع</th><th>التاريخ</th><th>الحالة</th></tr></thead>
    <tbody>${linkedMeetings.map((m, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(m.title)}</td>
      <td>${new Date(m.date + "T00:00:00").toLocaleDateString("ar-SA")}</td>
      <td>${statusBadge(m.status, { scheduled: "مجدول", in_progress: "جارٍ", completed: "مكتمل", postponed: "مؤجل", cancelled: "ملغى" })}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : "";

  const body = meta + membersSection + decisionsSection + meetingsSection;
  return wrapInBase(context.name, body, "تقرير هيئة الحوكمة");
}
