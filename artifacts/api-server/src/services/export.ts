import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

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
