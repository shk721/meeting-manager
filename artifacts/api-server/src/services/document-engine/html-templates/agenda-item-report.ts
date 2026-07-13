import { wrapInBase, escHtml, statusBadge, priorityLabel } from "./base";

type AgendaItemReportData = Awaited<ReturnType<typeof import("../data-providers/agenda-item").getAgendaItemReportData>>;

const outcomeLabels: Record<string, string> = {
  pending: "معلّق",
  discussed: "نوقش",
  decided: "تم اتخاذ قرار",
  deferred: "مؤجَّل",
  cancelled: "ملغى",
};

const statusLabels: Record<string, string> = {
  pending: "معلّق",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
  deferred: "مؤجَّل",
  approved: "معتمد",
  rejected: "مرفوض",
  active: "نشط",
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

export function generateAgendaItemReportHtml(data: NonNullable<AgendaItemReportData>): string {
  const { item, meeting, decisions, tasks, deliverables, comments } = data;

  const subtitle = meeting
    ? `${meeting.title} — ${formatDate(meeting.date)}`
    : undefined;

  let body = "";

  // Meta info
  body += `<div class="meta-grid">
    <div class="meta-item"><label>رقم البند</label><span>${item.orderIndex + 1}</span></div>
    <div class="meta-item"><label>المدة المقدّرة</label><span>${item.durationMin ? item.durationMin + " دقيقة" : "—"}</span></div>
    <div class="meta-item"><label>الحالة</label><span>${statusBadge(item.status, statusLabels)}</span></div>
    <div class="meta-item"><label>نتيجة المناقشة</label><span>${statusBadge(item.outcomeStatus, outcomeLabels)}</span></div>
  </div>`;

  // Discussion notes
  if (item.discussionNotes) {
    body += `<div class="section">
      <div class="section-title">ملاحظات المناقشة</div>
      <p style="white-space:pre-wrap;line-height:1.8">${escHtml(item.discussionNotes)}</p>
    </div>`;
  }

  // General notes
  if (item.notes) {
    body += `<div class="section">
      <div class="section-title">ملاحظات عامة</div>
      <p style="white-space:pre-wrap;line-height:1.8">${escHtml(item.notes)}</p>
    </div>`;
  }

  // Decisions
  if (decisions.length > 0) {
    const rows = decisions.map(d => `<tr>
      <td>${escHtml(d.title ?? d.content)}</td>
      <td>${escHtml(d.content)}</td>
      <td>${statusBadge(d.status, statusLabels)}</td>
      <td>${formatDate(d.dueDate)}</td>
    </tr>`).join("");
    body += `<div class="section">
      <div class="section-title">القرارات (${decisions.length})</div>
      <table><thead><tr><th>العنوان</th><th>المحتوى</th><th>الحالة</th><th>تاريخ التنفيذ</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
  }

  // Tasks
  if (tasks.length > 0) {
    const rows = tasks.map(t => `<tr>
      <td>${escHtml(t.title)}</td>
      <td>${statusBadge(t.status, statusLabels)}</td>
      <td>${escHtml(priorityLabel(t.priority))}</td>
      <td>${escHtml(t.assigneeName ?? "—")}</td>
      <td>${formatDate(t.dueDate)}</td>
      <td>
        <div>${t.completionPercent}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${t.completionPercent}%"></div></div>
      </td>
    </tr>`).join("");
    body += `<div class="section">
      <div class="section-title">المهام (${tasks.length})</div>
      <table><thead><tr><th>المهمة</th><th>الحالة</th><th>الأولوية</th><th>المكلَّف</th><th>الاستحقاق</th><th>الإنجاز</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
  }

  // Deliverables
  if (deliverables.length > 0) {
    const rows = deliverables.map(d => `<tr>
      <td>${escHtml(d.title)}</td>
      <td>${statusBadge(d.status, statusLabels)}</td>
      <td>${formatDate(d.dueDate)}</td>
      <td>
        <div>${d.progressPercent}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${d.progressPercent}%"></div></div>
      </td>
    </tr>`).join("");
    body += `<div class="section">
      <div class="section-title">المخرجات (${deliverables.length})</div>
      <table><thead><tr><th>المخرج</th><th>الحالة</th><th>الاستحقاق</th><th>التقدم</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
  }

  // Comments
  if (comments.length > 0) {
    const items = comments.map(c => `<div style="border-right:3px solid #e6ece4;padding-right:12px;margin-bottom:12px">
      <div style="font-size:11px;color:#8a978a;margin-bottom:4px">
        ${escHtml(c.authorName ?? "مجهول")} &bull; ${formatDate(c.createdAt)}
      </div>
      <div style="white-space:pre-wrap">${escHtml(c.content)}</div>
    </div>`).join("");
    body += `<div class="section">
      <div class="section-title">التعليقات (${comments.length})</div>
      ${items}
    </div>`;
  }

  return wrapInBase(item.title, body, subtitle);
}
