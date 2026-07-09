import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/use-auth";
import { User, Bell, Building2, Users, Palette, BarChart2, Check } from "lucide-react";

async function apiFetch(url: string, method = "GET", body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const TABS = [
  { id: "profile",       label: "الملف الشخصي",    icon: User },
  { id: "notifications", label: "الإشعارات",        icon: Bell },
  { id: "organization",  label: "المؤسسة",          icon: Building2 },
  { id: "users",         label: "المستخدمون",       icon: Users },
  { id: "appearance",    label: "المظهر",           icon: Palette },
  { id: "planning",      label: "وحدة التخطيط",     icon: BarChart2 },
] as const;

type TabId = typeof TABS[number]["id"];

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid #f0f3ee" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1c261c" }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: "#8a978a", marginTop: 2 }}>{description}</div>}
      </div>
      <button onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", background: checked ? "#1f7a4d" : "#d0d7d0", transition: "background .2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .2s", left: checked ? 22 : 2 }} />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ font: "700 15px Cairo", color: "#1c261c", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("profile");
  const [saved, setSaved] = useState(false);
  const { profile } = useProfile();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => apiFetch("/api/app-settings"),
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users"),
    enabled: tab === "users",
  });

  const updateSettings = useMutation({
    mutationFn: (body: any) => apiFetch("/api/app-settings", "PUT", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const set = (key: string, value: any) => updateSettings.mutate({ [key]: value });

  const s = appSettings ?? {};

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, font: "800 26px Cairo", color: "#1c261c" }}>الإعدادات</h1>
          <p style={{ margin: "5px 0 0", color: "#8a978a", fontSize: 14 }}>إدارة إعدادات النظام والمؤسسة</p>
        </div>
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#1f7a4d", background: "#e8f2ea", padding: "6px 12px", borderRadius: 20 }}>
            <Check size={14} /> تم الحفظ
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 18 }}>
        {/* Sidebar tabs */}
        <div style={{ width: 190, flexShrink: 0 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: active ? 700 : 500, textAlign: "right", marginBottom: 2, background: active ? "#e8f2ea" : "transparent", color: active ? "#1f7a4d" : "#5a675a", transition: "background .15s" }}>
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* ─── Profile ─── */}
          {tab === "profile" && (
            <Section title="الملف الشخصي">
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f0f3ee" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1f7a4d", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>
                  {user?.fullName?.substring(0, 2) ?? "م"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1c261c" }}>{user?.fullName}</div>
                  <div style={{ fontSize: 12.5, color: "#8a978a", marginTop: 2 }}>@{user?.username}</div>
                  <div style={{ fontSize: 11.5, marginTop: 4, padding: "2px 10px", background: "#e8f2ea", color: "#1f7a4d", borderRadius: 10, display: "inline-block" }}>
                    {{ admin: "مدير النظام", manager: "مدير", member: "عضو", viewer: "مشاهد" }[user?.role ?? ""] ?? user?.role}
                  </div>
                </div>
              </div>
              {[
                { label: "الاسم الكامل", value: user?.fullName ?? "—" },
                { label: "اسم المستخدم", value: `@${user?.username ?? "—"}` },
                { label: "البريد الإلكتروني", value: user?.email ?? "—" },
                { label: "تاريخ الانضمام", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("ar-SA") : "—" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f3ee", fontSize: 14 }}>
                  <span style={{ color: "#8a978a" }}>{row.label}</span>
                  <span style={{ color: "#1c261c", fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </Section>
          )}

          {/* ─── Notifications ─── */}
          {tab === "notifications" && (
            <Section title="إعدادات الإشعارات">
              <Toggle checked={s.notifUpcomingMeetings ?? true} onChange={v => set("notifUpcomingMeetings", v)} label="الاجتماعات القادمة" description="تنبيه قبل بدء الاجتماع" />
              <Toggle checked={s.notifDueTasks ?? true} onChange={v => set("notifDueTasks", v)} label="المهام المستحقة" description="تذكير بمهام تقترب من موعد الاستحقاق" />
              <Toggle checked={s.notifPendingDecisions ?? true} onChange={v => set("notifPendingDecisions", v)} label="القرارات المعلّقة" description="إشعار بقرارات بانتظار اتخاذ إجراء" />
              <Toggle checked={s.notifPlanUpdates ?? true} onChange={v => set("notifPlanUpdates", v)} label="تحديثات الخطط" description="إشعار عند تغيير حالة الخطة أو تحديث التقدّم" />
              <Toggle checked={s.notifWeeklyDigest ?? false} onChange={v => set("notifWeeklyDigest", v)} label="ملخص أسبوعي" description="تقرير أسبوعي بمجريات النظام" />
            </Section>
          )}

          {/* ─── Organization ─── */}
          {tab === "organization" && (
            <Section title="إعدادات المؤسسة">
              {[
                { key: "orgName", label: "اسم الجهة", placeholder: "أدخل اسم المؤسسة", type: "text" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} defaultValue={s[f.key] ?? ""} placeholder={f.placeholder}
                    onBlur={e => set(f.key, e.target.value)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 4 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>النطاق الزمني</label>
                  <select value={s.timezone ?? "Asia/Riyadh"} onChange={e => set("timezone", e.target.value)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit" }}>
                    <option value="Asia/Riyadh">توقيت الرياض (GMT+3)</option>
                    <option value="Asia/Dubai">توقيت دبي (GMT+4)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>نظام التقويم</label>
                  <select value={s.calendarSystem ?? "gregorian"} onChange={e => set("calendarSystem", e.target.value)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit" }}>
                    <option value="gregorian">ميلادي</option>
                    <option value="hijri">هجري</option>
                    <option value="both">كلاهما</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>اللغة</label>
                  <select value={s.language ?? "ar"} onChange={e => set("language", e.target.value)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit" }}>
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 6 }}>دورة اعتماد المحاضر</label>
                  <select value={s.minutesCycle ?? "single"} onChange={e => set("minutesCycle", e.target.value)}
                    style={{ width: "100%", border: "1px solid #e6ece4", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit" }}>
                    <option value="single">اعتماد مفرد</option>
                    <option value="dual">اعتماد مزدوج</option>
                    <option value="committee">لجنة اعتماد</option>
                  </select>
                </div>
              </div>
            </Section>
          )}

          {/* ─── Users ─── */}
          {tab === "users" && (
            <Section title="المستخدمون والصلاحيات">
              {usersData.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "#8a978a" }}>جارٍ التحميل...</div>
              ) : (
                usersData.map((u: any) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f0f3ee" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e8f2ea", color: "#1f7a4d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                      {u.fullName?.substring(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.fullName}</div>
                      <div style={{ fontSize: 12, color: "#8a978a" }}>@{u.username}</div>
                    </div>
                    <span style={{ fontSize: 11.5, padding: "2px 10px", borderRadius: 10, background: u.role === "admin" ? "#fbeeea" : u.role === "manager" ? "#fbf1dd" : "#e8f2ea", color: u.role === "admin" ? "#c0492f" : u.role === "manager" ? "#a97918" : "#1f7a4d" }}>
                      {{ admin: "مدير النظام", manager: "مدير", member: "عضو", viewer: "مشاهد" }[u.role] ?? u.role}
                    </span>
                  </div>
                ))
              )}
            </Section>
          )}

          {/* ─── Appearance ─── */}
          {tab === "appearance" && (
            <Section title="إعدادات المظهر">
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 10 }}>السمة</label>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { value: "light", label: "فاتح", bg: "#f4f6f2", border: "#e6ece4" },
                    { value: "dark", label: "داكن", bg: "#1c261c", border: "#2f3e2f" },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => set("themeMode", opt.value)}
                      style={{ width: 100, borderRadius: 10, border: `2px solid ${s.themeMode === opt.value ? "#1f7a4d" : "#e6ece4"}`, overflow: "hidden", cursor: "pointer" }}>
                      <div style={{ height: 60, background: opt.bg, borderBottom: `1px solid ${opt.border}` }} />
                      <div style={{ padding: "7px", textAlign: "center", fontSize: 12.5, fontWeight: s.themeMode === opt.value ? 700 : 400, color: s.themeMode === opt.value ? "#1f7a4d" : "#5a675a" }}>{opt.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#3f5145", display: "block", marginBottom: 10 }}>كثافة العرض</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { value: "compact", label: "مضغوط" },
                    { value: "standard", label: "عادي" },
                    { value: "comfortable", label: "مريح" },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => set("displayDensity", opt.value)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${s.displayDensity === opt.value ? "#1f7a4d" : "#e6ece4"}`, background: s.displayDensity === opt.value ? "#e8f2ea" : "#fff", color: s.displayDensity === opt.value ? "#1f7a4d" : "#5a675a", fontSize: 13, cursor: "pointer", fontWeight: s.displayDensity === opt.value ? 700 : 400 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ─── Planning ─── */}
          {tab === "planning" && (
            <Section title="إعدادات وحدة التخطيط">
              <Toggle
                checked={s.planningAutoProgress ?? true}
                onChange={v => set("planningAutoProgress", v)}
                label="حساب التقدّم تلقائياً"
                description="يُحسب تقدّم الخطة من المهام صعوداً (ADR-003) — لا يُدخَل يدوياً"
              />
              <Toggle
                checked={s.planningMilestonesLayer ?? false}
                onChange={v => set("planningMilestonesLayer", v)}
                label="تفعيل طبقة المعالم"
                description="عرض المعالم الرئيسية على الخط الزمني للخطة"
              />
              <Toggle
                checked={s.planningMandatoryImpact ?? false}
                onChange={v => set("planningMandatoryImpact", v)}
                label="إلزامية تحديد أثر القرار"
                description="يجب تحديد نوع الأثر عند إضافة قرار مرتبط بخطة (ADR-004)"
              />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
