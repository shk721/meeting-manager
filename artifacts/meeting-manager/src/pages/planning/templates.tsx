import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, ArrowLeft } from "lucide-react";

async function apiFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function TemplatesPage() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["plan-templates"],
    queryFn: () => apiFetch("/api/plan-templates"),
  });

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, font: "800 26px Cairo", color: "#1c261c" }}>قوالب الخطط</h1>
          <p style={{ margin: "5px 0 0", color: "#8a978a", fontSize: 14 }}>ابدأ بقالب جاهز لتوفير الوقت</p>
        </div>
        <Link href="/planning/plans/new">
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1f7a4d", color: "#fff", padding: "10px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={16} /> خطة من الصفر
          </div>
        </Link>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8a978a" }}>جارٍ التحميل...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {templates.map((tpl: any) => (
            <div key={tpl.id} style={{ background: "#fff", border: "1px solid #e6ece4", borderRight: `3px solid ${tpl.type === "readiness" ? "#1f7a4d" : "#d6b23e"}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ font: "700 15px Cairo", lineHeight: 1.5, color: "#1c261c" }}>{tpl.name}</div>
                  <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 10, background: tpl.type === "readiness" ? "#e8f2ea" : "#fbf1dd", color: tpl.type === "readiness" ? "#1f7a4d" : "#a97918", flexShrink: 0 }}>
                    {tpl.type === "readiness" ? "جاهزية" : "تشغيلية"}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "#8a978a", marginTop: 5 }}>{tpl.description}</div>
              </div>

              {/* Phases */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(tpl.phases ?? []).map((ph: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#5a675a" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#eef2ec", color: "#1f7a4d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    {ph}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f0f3ee" }}>
                <span style={{ fontSize: 11.5, color: "#8a978a" }}>{tpl.phaseCount} مراحل · استُخدم {tpl.usageCount} مرة</span>
                <Link href={`/planning/plans/new?template=${tpl.id}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#1f7a4d", fontWeight: 600, cursor: "pointer" }}>
                    استخدم القالب <ArrowLeft size={13} />
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
