import { wrapInBase, escHtml } from "./base";
import type { MeetingParticipantListData } from "../data-providers/meeting-participant-list";

export function generateMeetingParticipantListHtml(data: MeetingParticipantListData): string {
  const dateLabel = new Date(data.meeting.date + "T00:00:00").toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric",
  });

  const rows = data.participants.map(p => `
    <tr>
      <td style="text-align:center;color:#8a978a;font-size:11px">${p.rowNum}</td>
      <td><strong style="font-size:13px">${escHtml(p.name)}</strong></td>
      <td style="font-size:11px;direction:ltr;text-align:left">${escHtml(p.email ?? "—")}</td>
      <td style="width:80px;border-bottom:1px dashed #c8dcc8">&nbsp;</td>
    </tr>`).join("");

  const body = `
    <div class="section">
      <div class="section-title">بيانات الاجتماع</div>
      <div class="meta-grid">
        <div class="meta-item"><label>عنوان الاجتماع</label><span>${escHtml(data.meeting.title)}</span></div>
        <div class="meta-item"><label>إجمالي المشاركين</label><span>${data.totalCount} مشارك</span></div>
        <div class="meta-item"><label>التاريخ</label><span>${dateLabel}</span></div>
        <div class="meta-item"><label>الوقت</label><span>${escHtml(data.meeting.time)}</span></div>
        ${data.meeting.location ? `<div class="meta-item"><label>المكان</label><span>${escHtml(data.meeting.location)}</span></div>` : ""}
        <div class="meta-item"><label>تاريخ التوليد</label><span>${new Date(data.generatedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">قائمة المشاركين</div>
      ${data.participants.length === 0 ? `
        <div style="text-align:center;padding:32px;color:#8a978a;border:1px dashed #e6ece4;border-radius:8px">
          لا يوجد مشاركون مسجّلون في هذا الاجتماع
        </div>` : `
        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>التوقيع</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`}
    </div>

    <div style="margin-top:32px;padding:16px;border:1px solid #e6ece4;border-radius:8px;background:#f9fbf9">
      <div style="font-size:11px;color:#5a675a;font-weight:600;margin-bottom:10px">اعتماد القائمة</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">مُعِدّ القائمة</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">رئيس الاجتماع</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">الاعتماد النهائي</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
      </div>
    </div>`;

  return wrapInBase(
    `قائمة مشاركي الاجتماع — ${data.meeting.title}`,
    body,
    `Meeting Attendance Sheet · ${data.totalCount} مشارك · ${dateLabel}`
  );
}
