export function wrapInBase(title: string, body: string, subtitle?: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escHtml(title)}</title>
<style>
  @import url('data:text/css,');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl;
    color: #1c261c;
    font-size: 13px;
    line-height: 1.7;
    background: #fff;
  }
  .page { padding: 36px 44px; max-width: 800px; margin: 0 auto; }
  /* Header */
  .doc-header {
    border-bottom: 3px solid #1f7a4d;
    padding-bottom: 16px;
    margin-bottom: 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .doc-header-left h1 { font-size: 20px; font-weight: 700; color: #1c261c; }
  .doc-header-left .subtitle { font-size: 12px; color: #5a675a; margin-top: 4px; }
  .doc-header-right { text-align: left; font-size: 11px; color: #8a978a; }
  .doc-header-right .generated-label { font-weight: 600; color: #1f7a4d; }
  /* Section */
  .section { margin-bottom: 24px; }
  .section-title {
    font-size: 13px; font-weight: 700; color: #1f7a4d;
    border-right: 3px solid #1f7a4d;
    padding-right: 10px;
    margin-bottom: 12px;
  }
  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f0f5f2; color: #3f5145; font-weight: 600; padding: 8px 10px; text-align: right; border: 1px solid #e6ece4; }
  td { padding: 7px 10px; border: 1px solid #e6ece4; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fbf9; }
  /* Badge */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #e8f2ea; color: #1f7a4d; }
  .badge-yellow { background: #fbf1dd; color: #a97918; }
  .badge-red { background: #fbeeea; color: #c0492f; }
  .badge-gray { background: #f4f6f2; color: #5a675a; }
  .badge-blue { background: #eff6ff; color: #3b82f6; }
  /* Meta row */
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 20px; }
  .meta-item label { font-size: 11px; color: #8a978a; display: block; }
  .meta-item span { font-size: 13px; font-weight: 600; color: #1c261c; }
  /* Progress bar */
  .progress-bar { background: #e6ece4; border-radius: 999px; height: 8px; overflow: hidden; margin-top: 4px; }
  .progress-fill { height: 100%; background: #1f7a4d; border-radius: 999px; }
  /* Footer */
  .doc-footer {
    margin-top: 36px; padding-top: 12px;
    border-top: 1px solid #e6ece4;
    font-size: 10px; color: #b0bdb0;
    display: flex; justify-content: space-between;
  }
  /* Print */
  @media print {
    .page { padding: 20px 28px; }
    body { font-size: 11px; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="doc-header">
    <div class="doc-header-left">
      <h1>${escHtml(title)}</h1>
      ${subtitle ? `<div class="subtitle">${escHtml(subtitle)}</div>` : ""}
    </div>
    <div class="doc-header-right">
      <div class="generated-label">تقرير رسمي</div>
      <div>تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</div>
      <div>الوقت: ${new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
  </div>
  ${body}
  <div class="doc-footer">
    <span>وثيقة مولَّدة تلقائياً — منصة المتابعة و التنفيذ المؤسسي</span>
    <span>${escHtml(title)}</span>
  </div>
</div>
</body>
</html>`;
}

export function escHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function statusBadge(status: string, labelMap?: Record<string, string>): string {
  const label = labelMap?.[status] ?? status;
  const cls =
    ["approved", "completed", "active", "done", "accepted"].includes(status) ? "badge-green" :
    ["in_progress", "pending_review", "pending"].includes(status) ? "badge-yellow" :
    ["rejected", "overdue", "failed", "cancelled"].includes(status) ? "badge-red" :
    ["draft", "not_started", "deferred"].includes(status) ? "badge-gray" : "badge-blue";
  return `<span class="badge ${cls}">${escHtml(label)}</span>`;
}

export function priorityLabel(p: string): string {
  return { critical: "حرج", high: "عالٍ", medium: "متوسط", low: "منخفض" }[p] ?? p;
}
