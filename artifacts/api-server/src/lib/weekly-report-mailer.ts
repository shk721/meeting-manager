import { eq, inArray } from "drizzle-orm";
import { db, reportSubscriptionsTable, usersTable, meetingAttendeesTable, meetingsTable, tasksTable } from "@workspace/db";
import { generateWeeklyReportPDF } from "../services/export";
import { logger } from "./logger";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isSunday() {
  return new Date().getDay() === 0;
}

function isFirstOfMonth() {
  return new Date().getDate() === 1;
}

function weekStartStr() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

// Dynamic import so this compiles without nodemailer in dev node_modules
// (Railway installs it via nixpacks.toml --no-frozen-lockfile before build)
async function buildTransport(): Promise<unknown | null> {
  const host = process.env["SMTP_HOST"];
  const port = Number(process.env["SMTP_PORT"] ?? "587");
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (!host || !user || !pass) return null;
  const nodemailer = await import("nodemailer" as string) as { default: { createTransport: (...a: unknown[]) => unknown } };
  return nodemailer.default.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

async function sendReportForUser(
  transport: { sendMail: (opts: unknown) => Promise<unknown> },
  userId: number,
  email: string,
) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const today = todayStr();
  const weekStart = weekStartStr();

  const attendeeRows = await db.select({ meetingId: meetingAttendeesTable.meetingId })
    .from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.userId, userId));
  const meetingIds = attendeeRows.map(r => r.meetingId);

  const meetings = meetingIds.length > 0
    ? (await db.select().from(meetingsTable).where(inArray(meetingsTable.id, meetingIds)))
        .filter(m => m.date >= weekStart && m.date <= today)
    : [];

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));

  const pdfBuffer = generateWeeklyReportPDF(user.fullName, meetings, tasks, today);

  await transport.sendMail({
    from: process.env["SMTP_FROM"] ?? process.env["SMTP_USER"],
    to: email,
    subject: `تقريرك الأسبوعي — ${today}`,
    text: `مرحباً ${user.fullName}، يرجى الاطلاع على تقريرك الأسبوعي المرفق.`,
    attachments: [{ filename: `weekly-report-${today}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
  });
}

async function runWeeklyReports() {
  const today = todayStr();
  const transport = await buildTransport();

  if (!transport) {
    logger.debug("Weekly report mailer: SMTP not configured — skipping");
    return;
  }

  const subs = await db.select().from(reportSubscriptionsTable);
  const weekly = subs.filter(s => s.frequency === "weekly" && isSunday());
  const monthly = subs.filter(s => s.frequency === "monthly" && isFirstOfMonth());
  const due = [...weekly, ...monthly];

  if (due.length === 0) return;

  let sent = 0;
  for (const sub of due) {
    try {
      await sendReportForUser(transport as { sendMail: (opts: unknown) => Promise<unknown> }, sub.userId, sub.email);
      sent++;
    } catch (err) {
      logger.error({ err, userId: sub.userId, email: sub.email }, "Failed to send weekly report");
    }
  }

  if (sent > 0) logger.info({ sent, date: today }, "Weekly reports sent");
}

export function startWeeklyReportMailer() {
  runWeeklyReports().catch(err => logger.error({ err }, "Weekly report run failed"));
  // Check every 6 hours; sends only on Sunday (weekly) or 1st of month (monthly)
  setInterval(() => {
    runWeeklyReports().catch(err => logger.error({ err }, "Weekly report run failed"));
  }, 6 * 60 * 60 * 1000);
}
