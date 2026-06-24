import nodemailer from "nodemailer";

const enabled =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS;

const transporter = enabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function send(to: string, subject: string, html: string) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[mailer] failed to send email:", err);
  }
}

export async function sendTaskAssignedEmail(opts: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  assignerName: string;
}) {
  await send(
    opts.toEmail,
    `تم تعيين مهمة جديدة لك: ${opts.taskTitle}`,
    `<p>مرحباً ${opts.toName}،</p>
<p>قام <strong>${opts.assignerName}</strong> بتعيين المهمة التالية لك:</p>
<p><strong>${opts.taskTitle}</strong></p>
<p>يرجى الاطلاع على المهمة في نظام إدارة الاجتماعات.</p>`,
  );
}

export async function sendMinutesApprovedEmail(opts: {
  toEmails: string[];
  meetingTitle: string;
  approverName: string;
}) {
  const html = `<p>تم اعتماد محضر اجتماع <strong>${opts.meetingTitle}</strong> بواسطة <strong>${opts.approverName}</strong>.</p>
<p>يمكنك الاطلاع على المحضر المعتمد في نظام إدارة الاجتماعات.</p>`;

  for (const email of opts.toEmails) {
    await send(email, `تم اعتماد محضر اجتماع: ${opts.meetingTitle}`, html);
  }
}
