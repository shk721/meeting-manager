import { wrapInBase, escHtml } from "./base";
import type { ParticipantListData } from "../data-providers/participant-list";

const EMP_BADGE: Record<string, string> = {
  secondment:    "badge-yellow",
  assignment:    "badge-blue",
  regular_hours: "badge-green",
};

function activeFiltersNote(filters: ParticipantListData["filters"]): string {
  const parts: string[] = [];
  if (filters.status)     parts.push(`الحالة: ${filters.status}`);
  if (filters.location)   parts.push(`الموقع: ${filters.location}`);
  if (filters.department) parts.push(`القسم: ${filters.department}`);
  return parts.length ? `(فلاتر مطبّقة: ${parts.join(" · ")})` : "";
}

export function generateParticipantListHtml(data: ParticipantListData): string {
  const filterNote = activeFiltersNote(data.filters);

  const rows = data.participants.map(p => `
    <tr>
      <td style="text-align:center;color:#8a978a;font-size:11px">${p.rowNum}</td>
      <td>
        <strong style="font-size:13px">${escHtml(p.name)}</strong>
        ${p.isExternal ? `<span class="badge badge-gray" style="margin-right:6px;font-size:9px">خارجي</span>` : ""}
      </td>
      <td>${escHtml(p.role)}</td>
      <td>${escHtml(p.specialty ?? "—")}</td>
      <td><span class="badge ${EMP_BADGE[p.employmentStatus] ?? "badge-gray"}">${escHtml(p.employmentStatusLabel)}</span></td>
      <td>${escHtml(p.workLocation ?? "—")}</td>
      <td>${escHtml(p.department ?? "—")}</td>
      <td style="font-size:11px;direction:ltr;text-align:left">${escHtml(p.phone ?? p.email ?? "—")}</td>
      <td style="width:80px;border-bottom:1px dashed #c8dcc8">&nbsp;</td>
    </tr>`).join("");

  const body = `
    <div class="section">
      <div class="section-title">بيانات الخطة</div>
      <div class="meta-grid">
        <div class="meta-item"><label>اسم الخطة</label><span>${escHtml(data.plan.title)}</span></div>
        <div class="meta-item"><label>إجمالي المشاركين</label><span>${data.totalCount} مشارك</span></div>
        <div class="meta-item"><label>تاريخ التوليد</label><span>${new Date(data.generatedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</span></div>
        ${filterNote ? `<div class="meta-item"><label>الفلاتر المطبّقة</label><span style="font-size:11px;color:#5a675a">${escHtml(filterNote)}</span></div>` : ""}
      </div>
    </div>

    <div class="section">
      <div class="section-title">قائمة المشاركين والكوادر البشرية</div>
      ${data.participants.length === 0 ? `
        <div style="text-align:center;padding:32px;color:#8a978a;border:1px dashed #e6ece4;border-radius:8px">
          لا يوجد مشاركون مطابقون للفلاتر المحددة
        </div>` : `
        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>الاسم</th>
              <th>الدور</th>
              <th>التخصص</th>
              <th>الحالة الوظيفية</th>
              <th>موقع العمل</th>
              <th>القسم</th>
              <th>التواصل</th>
              <th>التوقيع</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`}
    </div>

    ${data.participants.length > 0 ? `
    <div class="section" style="margin-top:24px">
      <div class="section-title">ملخص الكوادر</div>
      <div class="meta-grid">
        <div class="meta-item">
          <label>خلال الدوام الرسمي</label>
          <span>${data.participants.filter(p => p.employmentStatus === "regular_hours").length}</span>
        </div>
        <div class="meta-item">
          <label>انتداب</label>
          <span>${data.participants.filter(p => p.employmentStatus === "secondment").length}</span>
        </div>
        <div class="meta-item">
          <label>تكليف</label>
          <span>${data.participants.filter(p => p.employmentStatus === "assignment").length}</span>
        </div>
        <div class="meta-item">
          <label>كوادر خارجية</label>
          <span>${data.participants.filter(p => p.isExternal).length}</span>
        </div>
      </div>
    </div>` : ""}

    <div style="margin-top:32px;padding:16px;border:1px solid #e6ece4;border-radius:8px;background:#f9fbf9">
      <div style="font-size:11px;color:#5a675a;font-weight:600;margin-bottom:10px">اعتماد القائمة</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">مُعِدّ القائمة</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">مدير الخطة</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">الاعتماد النهائي</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
      </div>
    </div>`;

  return wrapInBase(
    `قائمة مشاركي الخطة — ${data.plan.title}`,
    body,
    `Resource Deployment Worksheet · ${data.totalCount} مشارك`
  );
}
