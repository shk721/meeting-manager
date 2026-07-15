import { wrapInBase, escHtml } from "./base";
import type { GovernanceParticipantListData } from "../data-providers/governance-participant-list";

export function generateGovernanceParticipantListHtml(data: GovernanceParticipantListData): string {
  const rows = data.members.map(m => `
    <tr>
      <td style="text-align:center;color:#8a978a;font-size:11px">${m.rowNum}</td>
      <td>
        <strong style="font-size:13px">${escHtml(m.name)}</strong>
        ${m.isExternal ? `<span class="badge badge-gray" style="margin-right:6px;font-size:9px">خارجي</span>` : ""}
      </td>
      <td><span class="badge badge-blue">${escHtml(m.roleLabel)}</span></td>
      <td style="text-align:center">
        ${m.isVoting
          ? `<span class="badge badge-green">مصوّت</span>`
          : `<span class="badge badge-gray">غير مصوّت</span>`}
      </td>
      <td style="font-size:11px;direction:ltr;text-align:left">${escHtml(m.email ?? "—")}</td>
      <td style="width:80px;border-bottom:1px dashed #c8dcc8">&nbsp;</td>
    </tr>`).join("");

  const body = `
    <div class="section">
      <div class="section-title">بيانات الهيئة</div>
      <div class="meta-grid">
        <div class="meta-item"><label>اسم الهيئة</label><span>${escHtml(data.context.name)}</span></div>
        <div class="meta-item"><label>النوع</label><span>${escHtml(data.context.typeLabel)}</span></div>
        <div class="meta-item"><label>إجمالي الأعضاء</label><span>${data.totalCount} عضو</span></div>
        <div class="meta-item"><label>الأعضاء المصوّتون</label><span>${data.votingCount} عضو</span></div>
        <div class="meta-item"><label>نسبة النصاب</label><span>${data.context.quorumPercent}%</span></div>
        <div class="meta-item"><label>النصاب المطلوب</label><span>${data.quorumCount} عضو مصوّت</span></div>
        <div class="meta-item"><label>تاريخ التوليد</label><span>${new Date(data.generatedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">قائمة الأعضاء</div>
      ${data.members.length === 0 ? `
        <div style="text-align:center;padding:32px;color:#8a978a;border:1px dashed #e6ece4;border-radius:8px">
          لا يوجد أعضاء مسجّلون في هذه الهيئة
        </div>` : `
        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>الاسم</th>
              <th>الدور</th>
              <th>صوت</th>
              <th>التواصل</th>
              <th>التوقيع</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`}
    </div>

    ${data.members.length > 0 ? `
    <div class="section" style="margin-top:24px">
      <div class="section-title">ملخص التشكيل</div>
      <div class="meta-grid">
        <div class="meta-item"><label>إجمالي الأعضاء</label><span>${data.totalCount}</span></div>
        <div class="meta-item"><label>أعضاء مصوّتون</label><span>${data.votingCount}</span></div>
        <div class="meta-item"><label>أعضاء غير مصوّتين</label><span>${data.totalCount - data.votingCount}</span></div>
        <div class="meta-item"><label>النصاب المطلوب لاتخاذ القرار</label><span>${data.quorumCount} مصوّت (${data.context.quorumPercent}%)</span></div>
        <div class="meta-item"><label>أعضاء خارجيون</label><span>${data.members.filter(m => m.isExternal).length}</span></div>
      </div>
    </div>` : ""}

    <div style="margin-top:32px;padding:16px;border:1px solid #e6ece4;border-radius:8px;background:#f9fbf9">
      <div style="font-size:11px;color:#5a675a;font-weight:600;margin-bottom:10px">اعتماد القائمة</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">أمين السر</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">رئيس الهيئة</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#8a978a;margin-bottom:24px">الاعتماد النهائي</div>
          <div style="border-top:1px solid #1f7a4d;padding-top:6px;font-size:10px;color:#5a675a">التوقيع</div>
        </div>
      </div>
    </div>`;

  return wrapInBase(
    `قائمة أعضاء الهيئة — ${data.context.name}`,
    body,
    `Governance Membership Sheet · ${data.context.typeLabel} · ${data.totalCount} عضو`
  );
}
