import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

async function apiFetch(url: string, method = "GET", body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface Phase { title: string; description: string }

export default function NewPlanPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"readiness" | "operational">("operational");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // Step 2 fields
  const [phases, setPhases] = useState<Phase[]>([{ title: "", description: "" }]);

  const { data: templates = [] } = useQuery({
    queryKey: ["plan-templates"],
    queryFn: () => apiFetch("/api/plan-templates"),
  });

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplate(tpl.id);
    if (tpl.phases && tpl.phases.length > 0) {
      setPhases(tpl.phases.map((t: string) => ({ title: t, description: "" })));
    }
    if (tpl.type) setType(tpl.type);
  };

  const addPhase = () => setPhases(prev => [...prev, { title: "", description: "" }]);
  const removePhase = (i: number) => setPhases(prev => prev.filter((_, idx) => idx !== i));
  const updatePhase = (i: number, field: keyof Phase, value: string) => {
    setPhases(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("عنوان الخطة مطلوب"); return; }
    setSaving(true);
    setError("");
    try {
      const plan = await apiFetch("/api/plans", "POST", {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status: "draft",
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        templateId: selectedTemplate ?? undefined,
      });

      // Create phases (if not already created by templateId)
      if (!selectedTemplate) {
        for (let i = 0; i < phases.length; i++) {
          const ph = phases[i];
          if (ph.title.trim()) {
            await apiFetch(`/api/plans/${plan.id}/phases`, "POST", {
              title: ph.title.trim(),
              description: ph.description.trim() || undefined,
              orderIndex: i,
            });
          }
        }
      }

      navigate(`/planning/plans/${plan.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#5a675a", marginBottom: 20 }}>
        <a href="/planning/plans" style={{ color: "#5a675a", textDecoration: "none" }}>الخطط</a>
        <ChevronLeft size={14} />
        <span style={{ color: "#1c261c", fontWeight: 600 }}>خطة جديدة</span>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {[1, 2].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14,
              background: step >= s ? "#1f7a4d" : "#eef2ec",
              color: step >= s ? "#fff" : "#8a978a",
            }}>{s}</div>
            <span style={{ fontSize: 13, fontWeight: step === s ? 700 : 400, color: step === s ? "#1c261c" : "#8a978a" }}>
              {s === 1 ? "بيانات الخطة" : "تعريف المراحل"}
            </span>
            {s < 2 && <ChevronLeft size={14} style={{ color: "#c2ccc2" }} />}
          </div>
        ))}
      </div>

      {error && <div style={{ background: "#fbeeea", color: "#c0492f", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Step 1 */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 22 }}>
            <div style={{ font: "700 15px Cairo", marginBottom: 16 }}>بيانات الخطة الأساسية</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>عنوان الخطة *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="أدخل عنوان الخطة"
                  style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>الوصف</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف مختصر للخطة" rows={3}
                  style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>نوع الخطة</label>
                  <select value={type} onChange={e => setType(e.target.value as any)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit" }}>
                    <option value="operational">تشغيلية</option>
                    <option value="readiness">جاهزية</option>
                  </select>
                </div>
                <div />
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>تاريخ البدء</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>تاريخ الانتهاء</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Templates */}
          <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 22 }}>
            <div style={{ font: "700 15px Cairo", marginBottom: 4 }}>استخدام قالب جاهز (اختياري)</div>
            <div style={{ fontSize: 12.5, color: "#8a978a", marginBottom: 14 }}>اختر قالباً لتهيئة المراحل تلقائياً</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {templates.map((tpl: any) => (
                <div key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  style={{
                    border: `1.5px solid ${selectedTemplate === tpl.id ? "#1f7a4d" : "#e6ece4"}`,
                    background: selectedTemplate === tpl.id ? "#e8f2ea" : "#f7f9f6",
                    borderRadius: 10, padding: 12, cursor: "pointer",
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1c261c" }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: "#8a978a", marginTop: 3 }}>{tpl.description}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: 10.5, padding: "1px 7px", borderRadius: 10, background: tpl.type === "readiness" ? "#e8f2ea" : "#fbf1dd", color: tpl.type === "readiness" ? "#1f7a4d" : "#a97918" }}>
                      {tpl.type === "readiness" ? "جاهزية" : "تشغيلية"}
                    </span>
                    <span style={{ fontSize: 10.5, color: "#8a978a" }}>{tpl.phaseCount} مراحل</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => { if (!title.trim()) { setError("عنوان الخطة مطلوب"); return; } setError(""); setStep(2); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#1f7a4d", color: "#fff", padding: "10px 20px", borderRadius: 9, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>
              التالي: تعريف المراحل <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ font: "700 15px Cairo" }}>تعريف المراحل الرئيسية</div>
              {selectedTemplate && (
                <span style={{ fontSize: 11.5, color: "#1f7a4d", background: "#e8f2ea", padding: "2px 10px", borderRadius: 10 }}>من قالب</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {phases.map((ph, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1f7a4d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 8 }}>{i + 1}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <input value={ph.title} onChange={e => updatePhase(i, "title", e.target.value)} placeholder={`اسم المرحلة ${i + 1}`}
                      style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "8px 12px", fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                    <input value={ph.description} onChange={e => updatePhase(i, "description", e.target.value)} placeholder="وصف المرحلة (اختياري)"
                      style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  {phases.length > 1 && (
                    <button onClick={() => removePhase(i)}
                      style={{ border: "none", background: "transparent", color: "#c0492f", cursor: "pointer", padding: "8px 4px" }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addPhase}
              style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, border: "1.5px dashed #c2ccc2", background: "transparent", borderRadius: 9, padding: "8px 14px", fontSize: 13, color: "#5a675a", cursor: "pointer", width: "100%", justifyContent: "center" }}>
              <Plus size={14} /> إضافة مرحلة
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e6ece4", background: "#fff", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, color: "#5a675a", cursor: "pointer" }}>
              <ChevronLeft size={16} /> رجوع
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 8, background: saving ? "#9fbeaf" : "#1f7a4d", color: "#fff", padding: "10px 20px", borderRadius: 9, fontSize: 14, fontWeight: 600, border: "none", cursor: saving ? "default" : "pointer" }}>
              {saving ? "جارٍ الحفظ..." : "إنشاء الخطة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
