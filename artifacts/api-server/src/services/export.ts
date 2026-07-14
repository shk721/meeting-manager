import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from "docx";

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  status: string;
  location?: string | null;
  objectives?: string | null;
  agendaItems?: string[];
}

interface MinutesData {
  executiveSummary?: string | null;
  discussionItems?: string | null;
  risks?: string | null;
  previousFollowUp?: string | null;
}

interface Task {
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
}

interface Decision {
  content: string;
  outcome?: string | null;
}

interface User {
  fullName: string;
}

export function generateMeetingPDF(
  meeting: Meeting,
  minutes: MinutesData | null,
  tasks: Task[],
  decisions: Decision[],
  attendees: User[]
): Buffer {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  doc.on("data", (chunk) => chunks.push(chunk));

  // Header
  doc.fontSize(20).text(meeting.title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`التاريخ: ${meeting.date}  |  الوقت: ${meeting.time}  |  الحالة: ${meeting.status}`, { align: "center" });
  if (meeting.location) doc.text(`الموقع: ${meeting.location}`, { align: "center" });
  doc.moveDown();

  // Objectives
  if (meeting.objectives) {
    doc.fontSize(14).text("الأهداف:", { underline: true });
    doc.fontSize(11).text(meeting.objectives);
    doc.moveDown();
  }

  // Agenda
  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    doc.fontSize(14).text("جدول الأعمال:", { underline: true });
    meeting.agendaItems.forEach((item, i) => {
      doc.fontSize(11).text(`${i + 1}. ${item}`);
    });
    doc.moveDown();
  }

  // Attendees
  if (attendees.length > 0) {
    doc.fontSize(14).text("المشاركون:", { underline: true });
    doc.fontSize(11).text(attendees.map(a => a.fullName).join("، "));
    doc.moveDown();
  }

  // Minutes
  if (minutes?.executiveSummary) {
    doc.fontSize(14).text("ملخص المحضر:", { underline: true });
    doc.fontSize(11).text(minutes.executiveSummary);
    doc.moveDown();
  }

  // Decisions
  if (decisions.length > 0) {
    doc.fontSize(14).text("القرارات:", { underline: true });
    decisions.forEach((d, i) => {
      doc.fontSize(11).text(`${i + 1}. ${d.content}`);
    });
    doc.moveDown();
  }

  // Action items
  if (tasks.length > 0) {
    doc.fontSize(14).text("بنود العمل:", { underline: true });
    tasks.forEach((t, i) => {
      const due = t.dueDate ? ` (مستحق: ${t.dueDate})` : "";
      doc.fontSize(11).text(`${i + 1}. [${t.status}] ${t.title}${due}`);
    });
  }

  doc.end();

  // Synchronously collect — pdfkit emits synchronously when not piping to a stream
  return Buffer.concat(chunks);
}

export function generateWeeklyReportPDF(
  userName: string,
  meetings: Meeting[],
  tasks: Task[],
  week: string
): Buffer {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(20).text(`التقرير الأسبوعي — ${week}`, { align: "center" });
  doc.fontSize(14).text(`المستخدم: ${userName}`, { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text("الاجتماعات:", { underline: true });
  if (meetings.length === 0) {
    doc.fontSize(11).text("لا توجد اجتماعات هذا الأسبوع.");
  } else {
    meetings.forEach(m => {
      doc.fontSize(11).text(`• ${m.date} — ${m.title} (${m.status})`);
    });
  }
  doc.moveDown();

  doc.fontSize(14).text("المهام:", { underline: true });
  const open = tasks.filter(t => t.status !== "completed");
  const done = tasks.filter(t => t.status === "completed");
  doc.fontSize(11).text(`مكتملة: ${done.length}  |  مفتوحة: ${open.length}`);
  tasks.forEach(t => {
    doc.fontSize(10).text(`  • [${t.status}] ${t.title}`);
  });

  doc.end();
  return Buffer.concat(chunks);
}

export function generateMeetingICalString(meeting: Meeting, attendees: User[]): string {
  const dtStart = meeting.date.replace(/-/g, "") + "T" + meeting.time.replace(":", "") + "00";
  const uid = `meeting-${meeting.id}@meeting-manager`;
  const attendeeLines = attendees.map(a => `ATTENDEE;CN=${a.fullName}:MAILTO:noreply@meeting-manager`).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meeting Manager//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `SUMMARY:${meeting.title}`,
    meeting.location ? `LOCATION:${meeting.location}` : "",
    meeting.objectives ? `DESCRIPTION:${meeting.objectives.replace(/\n/g, "\\n")}` : "",
    attendeeLines,
    `STATUS:${meeting.status.toUpperCase()}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function generateMeetingsCSV(meetings: Meeting[]): string {
  const header = "id,title,date,time,status,location";
  const rows = meetings.map(m =>
    [m.id, `"${m.title}"`, m.date, m.time, m.status, `"${m.location ?? ""}"`].join(",")
  );
  return [header, ...rows].join("\n");
}

export function generateActionItemsCSV(tasks: Array<Task & { id: number; assigneeId?: number | null }>): string {
  const header = "id,title,status,priority,dueDate,assigneeId";
  const rows = tasks.map(t =>
    [t.id, `"${t.title}"`, t.status, t.priority, t.dueDate ?? "", t.assigneeId ?? ""].join(",")
  );
  return [header, ...rows].join("\n");
}

export function generateExcelBuffer(meetings: Meeting[]): Buffer {
  const data = meetings.map(m => ({
    ID: m.id,
    Title: m.title,
    Date: m.date,
    Time: m.time,
    Status: m.status,
    Location: m.location ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Meetings");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

interface PlanPhase {
  title: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface PlanDecision {
  title?: string | null;
  content: string;
  status: string;
  createdAt: string;
}

interface PlanTask {
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  completionPercent: number;
  assigneeName?: string | null;
}

interface PlanData {
  title: string;
  description?: string | null;
  type: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  progress: number;
  phases: PlanPhase[];
  tasks: PlanTask[];
  decisions: PlanDecision[];
}

export function generatePlanPDF(plan: PlanData): Buffer {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(22).text(plan.title, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(12).text(
    `النوع: ${plan.type === "readiness" ? "جاهزية" : "تشغيلية"}  |  الحالة: ${plan.status}  |  التقدم: ${plan.progress}%`,
    { align: "center" }
  );
  if (plan.startDate || plan.endDate) {
    doc.text(`الفترة: ${plan.startDate ?? "—"} ← ${plan.endDate ?? "—"}`, { align: "center" });
  }
  doc.moveDown();

  if (plan.description) {
    doc.fontSize(14).text("الوصف:", { underline: true });
    doc.fontSize(11).text(plan.description);
    doc.moveDown();
  }

  if (plan.phases.length > 0) {
    doc.fontSize(14).text("المراحل:", { underline: true });
    plan.phases.forEach((ph, i) => {
      const dates = [ph.startDate, ph.endDate].filter(Boolean).join(" → ");
      doc.fontSize(11).text(`${i + 1}. ${ph.title} [${ph.status}]${dates ? "  |  " + dates : ""}`);
    });
    doc.moveDown();
  }

  if (plan.tasks.length > 0) {
    doc.fontSize(14).text("المهام:", { underline: true });
    plan.tasks.forEach((t, i) => {
      const due = t.dueDate ? ` (${t.dueDate})` : "";
      const pct = t.completionPercent > 0 ? ` — ${t.completionPercent}%` : "";
      doc.fontSize(11).text(`${i + 1}. [${t.status}] ${t.title}${due}${pct}`);
    });
    doc.moveDown();
  }

  if (plan.decisions.length > 0) {
    doc.fontSize(14).text("القرارات:", { underline: true });
    plan.decisions.forEach((d, i) => {
      doc.fontSize(11).text(`${i + 1}. [${d.status}] ${d.title ?? d.content.slice(0, 80)}`);
    });
  }

  doc.end();
  return Buffer.concat(chunks);
}

export function generatePlanExcel(plan: PlanData): Buffer {
  const wb = XLSX.utils.book_new();

  const overview = [
    { الحقل: "العنوان", القيمة: plan.title },
    { الحقل: "النوع", القيمة: plan.type === "readiness" ? "جاهزية" : "تشغيلية" },
    { الحقل: "الحالة", القيمة: plan.status },
    { الحقل: "التقدم", القيمة: `${plan.progress}%` },
    { الحقل: "تاريخ البداية", القيمة: plan.startDate ?? "" },
    { الحقل: "تاريخ النهاية", القيمة: plan.endDate ?? "" },
    { الحقل: "الوصف", القيمة: plan.description ?? "" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overview), "ملخص");

  const phasesData = plan.phases.map((ph, i) => ({
    "#": i + 1,
    العنوان: ph.title,
    الحالة: ph.status,
    "تاريخ البداية": ph.startDate ?? "",
    "تاريخ النهاية": ph.endDate ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(phasesData.length ? phasesData : [{}]), "المراحل");

  const tasksData = plan.tasks.map((t, i) => ({
    "#": i + 1,
    العنوان: t.title,
    الحالة: t.status,
    الأولوية: t.priority,
    "تاريخ الاستحقاق": t.dueDate ?? "",
    "الإنجاز%": t.completionPercent,
    المكلّف: t.assigneeName ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData.length ? tasksData : [{}]), "المهام");

  const decisionsData = plan.decisions.map((d, i) => ({
    "#": i + 1,
    العنوان: d.title ?? d.content.slice(0, 80),
    الحالة: d.status,
    التاريخ: d.createdAt.slice(0, 10),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(decisionsData.length ? decisionsData : [{}]), "القرارات");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── Word (docx) export for plans ────────────────────────────────────────────

interface PlanWorkstream {
  title: string;
  tasks: Array<{ title: string; status: string; assigneeName?: string | null; completionPercent: number; dueDate?: string | null }>;
}

export interface PlanDocxData {
  title: string;
  description?: string | null;
  notes?: string | null;
  type: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  ownerName?: string;
  progress: number;
  phases: Array<{ title: string; status: string; startDate?: string | null; endDate?: string | null }>;
  workstreams: PlanWorkstream[];
  tasks: Array<{ title: string; status: string; priority: string; dueDate?: string | null; completionPercent: number; assigneeName?: string | null }>;
  decisions: Array<{ title?: string | null; content: string; status: string }>;
}

const STATUS_LABELS_AR: Record<string, string> = {
  draft: "مسودة", active: "نشطة", in_progress: "قيد التنفيذ",
  on_hold: "معلّقة", overdue: "متأخرة", completed: "مكتملة", pending: "قيد الانتظار",
  cancelled: "ملغاة", approved: "معتمد",
};

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generatePlanDocx(data: PlanDocxData): Buffer {
  const typeLabel = data.type === "readiness" ? "جاهزية" : "تشغيلية";
  const statusLabel = STATUS_LABELS_AR[data.status] ?? data.status;

  const metaRows = [
    `<tr><th>النوع</th><td>${escHtml(typeLabel)}</td></tr>`,
    `<tr><th>الحالة</th><td>${escHtml(statusLabel)}</td></tr>`,
    `<tr><th>التقدم</th><td>${data.progress}%</td></tr>`,
    data.ownerName ? `<tr><th>المسؤول</th><td>${escHtml(data.ownerName)}</td></tr>` : "",
    data.startDate ? `<tr><th>تاريخ البداية</th><td>${escHtml(data.startDate)}</td></tr>` : "",
    data.endDate ? `<tr><th>تاريخ النهاية</th><td>${escHtml(data.endDate)}</td></tr>` : "",
  ].filter(Boolean).join("\n");

  const summary = data.description ?? data.notes;
  const descSection = summary
    ? `<h2>الوصف</h2><p>${escHtml(summary).replace(/\n/g, "<br>")}</p>`
    : "";

  const phasesSection = data.phases.length > 0 ? `
    <h2>المراحل</h2>
    <table>
      <thead><tr><th>المرحلة</th><th>الحالة</th><th>البداية</th><th>النهاية</th></tr></thead>
      <tbody>
        ${data.phases.map(ph => `<tr>
          <td>${escHtml(ph.title)}</td>
          <td>${escHtml(STATUS_LABELS_AR[ph.status] ?? ph.status)}</td>
          <td>${escHtml(ph.startDate ?? "—")}</td>
          <td>${escHtml(ph.endDate ?? "—")}</td>
        </tr>`).join("\n")}
      </tbody>
    </table>` : "";

  const tasksSection = data.tasks.length > 0 ? `
    <h2>المهام</h2>
    <table>
      <thead><tr><th>المهمة</th><th>الحالة</th><th>الإنجاز</th><th>المكلّف</th><th>الاستحقاق</th></tr></thead>
      <tbody>
        ${data.tasks.map(t => `<tr>
          <td>${escHtml(t.title)}</td>
          <td>${escHtml(STATUS_LABELS_AR[t.status] ?? t.status)}</td>
          <td>${t.completionPercent}%</td>
          <td>${escHtml(t.assigneeName ?? "—")}</td>
          <td>${escHtml(t.dueDate ?? "—")}</td>
        </tr>`).join("\n")}
      </tbody>
    </table>` : "";

  const decisionsSection = data.decisions.length > 0 ? `
    <h2>القرارات</h2>
    <ol>
      ${data.decisions.map(d => {
        const label = d.title ?? d.content.slice(0, 120);
        return `<li>[${escHtml(STATUS_LABELS_AR[d.status] ?? d.status)}] ${escHtml(label)}</li>`;
      }).join("\n")}
    </ol>` : "";

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${escHtml(data.title)}</title>
<style>
  body { font-family: Arial, "Geeza Pro", sans-serif; direction: rtl; margin: 40px 50px; font-size: 12pt; color: #222; }
  h1 { font-size: 22pt; text-align: center; color: #1f7a4d; margin-bottom: 4px; }
  .subtitle { text-align: center; color: #666; font-size: 10pt; margin-bottom: 24px; }
  h2 { font-size: 14pt; color: #1f7a4d; border-bottom: 2px solid #1f7a4d; padding-bottom: 3px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11pt; }
  th { background: #e8f2ea; color: #1f7a4d; padding: 7px 10px; border: 1px solid #b8d4bc; text-align: right; font-weight: bold; }
  td { padding: 6px 10px; border: 1px solid #ccc; }
  .meta-table th { width: 120px; }
  ol, ul { padding-right: 20px; padding-left: 0; }
  li { margin-bottom: 6px; }
  .footer { text-align: center; color: #aaa; font-size: 9pt; margin-top: 48px; border-top: 1px solid #eee; padding-top: 8px; }
</style>
</head>
<body>
<h1>${escHtml(data.title)}</h1>
<p class="subtitle">وثيقة مولَّدة تلقائياً — ${new Date().toLocaleDateString("ar-SA")}</p>
<h2>معلومات الخطة</h2>
<table class="meta-table"><tbody>${metaRows}</tbody></table>
${descSection}
${phasesSection}
${tasksSection}
${decisionsSection}
<p class="footer">منصة المتابعة والتنفيذ المؤسسي</p>
</body>
</html>`;

  return Buffer.from(html, "utf-8");
}

// ─── Word (docx) export for meeting minutes ───────────────────────────────────

function rtlPara(text: string, opts?: { bold?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: [
      new TextRun({ text, bold: opts?.bold ?? false, size: opts?.size ?? 24, rightToLeft: true, font: "Arial" }),
    ],
  });
}

function sectionHeader(title: string): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1f7a4d", space: 4 } },
    children: [
      new TextRun({ text: title, bold: true, size: 28, color: "1f7a4d", rightToLeft: true, font: "Arial" }),
    ],
  });
}

function bodyPara(text: string): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, rightToLeft: true, font: "Arial" })],
  });
}

export async function generateMinutesDocx(
  meeting: Meeting,
  minutes: MinutesData | null,
  tasks: Task[],
  decisions: Decision[],
  attendees: User[]
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // ── Title ──
  children.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: meeting.title, bold: true, size: 40, rightToLeft: true, font: "Arial" })],
    })
  );

  // ── Meta ──
  children.push(rtlPara(`التاريخ: ${meeting.date}   |   الوقت: ${meeting.time}`, { size: 22 }));
  if (meeting.location) children.push(rtlPara(`المكان: ${meeting.location}`, { size: 22 }));
  children.push(new Paragraph({ children: [new TextRun("")] }));

  // ── Attendees ──
  if (attendees.length > 0) {
    children.push(sectionHeader("الحضور"));
    children.push(rtlPara(attendees.map(a => a.fullName).join("  ،  "), { size: 22 }));
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  // ── Executive Summary ──
  if (minutes?.executiveSummary) {
    children.push(sectionHeader("الملخص التنفيذي"));
    for (const line of minutes.executiveSummary.split("\n").filter(Boolean)) {
      children.push(bodyPara(line));
    }
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  // ── Discussion Items ──
  if (minutes?.discussionItems) {
    children.push(sectionHeader("بنود النقاش"));
    for (const line of minutes.discussionItems.split("\n").filter(Boolean)) {
      children.push(bodyPara(line));
    }
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  // ── Previous Follow-up ──
  if (minutes?.previousFollowUp) {
    children.push(sectionHeader("متابعة ما سبق"));
    for (const line of minutes.previousFollowUp.split("\n").filter(Boolean)) {
      children.push(bodyPara(line));
    }
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  // ── Decisions ──
  if (decisions.length > 0) {
    children.push(sectionHeader("القرارات"));
    decisions.forEach((d, i) => {
      children.push(
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22, rightToLeft: true, font: "Arial" }),
            new TextRun({ text: d.content, size: 22, rightToLeft: true, font: "Arial" }),
          ],
        })
      );
    });
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  // ── Tasks table ──
  if (tasks.length > 0) {
    children.push(sectionHeader("المهام والإجراءات"));
    const statusMap: Record<string, string> = {
      pending: "معلّقة", in_progress: "جارية", completed: "مكتملة", cancelled: "ملغاة",
    };
    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "المهمة", bold: true, size: 20, rightToLeft: true, font: "Arial" })] })], shading: { type: ShadingType.SOLID, color: "e8f2ea" }, width: { size: 50, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "الحالة", bold: true, size: 20, rightToLeft: true, font: "Arial" })] })], shading: { type: ShadingType.SOLID, color: "e8f2ea" }, width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "تاريخ الاستحقاق", bold: true, size: 20, rightToLeft: true, font: "Arial" })] })], shading: { type: ShadingType.SOLID, color: "e8f2ea" }, width: { size: 25, type: WidthType.PERCENTAGE } }),
      ],
    });
    const dataRows = tasks.map(t => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text: t.title, size: 20, rightToLeft: true, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: statusMap[t.status] ?? t.status, size: 20, rightToLeft: true, font: "Arial" })] })] }),
        new TableCell({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: t.dueDate ?? "—", size: 20, rightToLeft: true, font: "Arial" })] })] }),
      ],
    }));
    children.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  // ── Risks ──
  if (minutes?.risks) {
    children.push(sectionHeader("المخاطر والملاحظات"));
    for (const line of minutes.risks.split("\n").filter(Boolean)) {
      children.push(bodyPara(line));
    }
    children.push(new Paragraph({ children: [new TextRun("")] }));
  }

  // ── Footer ──
  children.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [new TextRun({ text: "وثيقة مولَّدة تلقائياً — منصة المتابعة و التنفيذ المؤسسي", size: 18, color: "a3b0a3", rightToLeft: true, font: "Arial" })],
    })
  );

  const doc = new Document({
    sections: [{ properties: { bidi: true } as any, children }],
  });

  return Packer.toBuffer(doc);
}
