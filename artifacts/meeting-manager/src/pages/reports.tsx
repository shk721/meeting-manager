import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";

async function fetchDocuments() {
  const res = await fetch("/api/documents", { credentials: "include" });
  if (!res.ok) throw new Error("فشل تحميل التقارير");
  return res.json();
}

const ENTITY_LABEL: Record<string, string> = {
  meeting: "اجتماع",
  plan: "خطة",
  governance: "هيئة حوكمة",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ReportsPage() {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["generated-documents"],
    queryFn: fetchDocuments,
  });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto", fontFamily: "Segoe UI, Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2e1a", marginBottom: 4 }}>
          <FileText size={20} style={{ display: "inline", marginLeft: 8, verticalAlign: "middle" }} />
          أرشيف التقارير
        </h1>
        <p style={{ fontSize: 13, color: "#8a978a" }}>جميع التقارير والوثائق المولَّدة تلقائياً</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>جارٍ التحميل...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8a978a", background: "#f9fbf9", borderRadius: 14, border: "1px solid #e6ece4" }}>
          <FileText size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>لا توجد تقارير بعد</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>استخدم زر "تقرير PDF" في صفحة أي اجتماع أو خطة أو هيئة لتوليد تقرير</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f0f5f2" }}>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#3f5145", borderBottom: "1px solid #e6ece4" }}>العنوان</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#3f5145", borderBottom: "1px solid #e6ece4" }}>النوع</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#3f5145", borderBottom: "1px solid #e6ece4" }}>الصيغة</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#3f5145", borderBottom: "1px solid #e6ece4" }}>تاريخ التوليد</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#3f5145", borderBottom: "1px solid #e6ece4" }}>تحميل</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc: any, i: number) => (
                <tr key={doc.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fbf9" }}>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid #f0f3ee", color: "#1a2e1a", fontWeight: 500 }}>
                    {doc.title}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f3ee" }}>
                    <span style={{ background: "#e8f2ea", color: "#1f7a4d", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                      {ENTITY_LABEL[doc.entityType] ?? doc.entityType}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f3ee", color: "#5a675a", textTransform: "uppercase", fontSize: 11 }}>
                    {doc.format}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f3ee", color: "#8a978a", fontSize: 12 }}>
                    {formatDate(doc.createdAt)}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f0f3ee", textAlign: "center" }}>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: "1px solid #1f7a4d", background: "#e8f2ea", color: "#1f7a4d", fontSize: 12, textDecoration: "none", fontWeight: 600 }}
                    >
                      <Download size={12} /> تحميل
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
