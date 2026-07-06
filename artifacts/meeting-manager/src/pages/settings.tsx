import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Bell, Shield, Settings2, User, Check, Smartphone, Mail } from "lucide-react";

type Tab = "notifications" | "security" | "preferences" | "account";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "security",      label: "الأمان",     icon: Shield },
  { id: "preferences",   label: "التفضيلات",  icon: Settings2 },
  { id: "account",       label: "الحساب",     icon: User },
];

export default function SettingsPage() {
  const { preferences, isLoading, update, is2FAPending, enable2FA, verify2FA, disable2FA } = useSettings();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<Tab>("notifications");
  const [saved, setSaved] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaSetup, setTwoFaSetup] = useState<{ secret_key: string; method: string } | null>(null);
  const [apiError, setApiError] = useState("");

  const handleUpdate = async (data: any) => {
    setApiError("");
    try {
      await update(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setApiError(e.message); }
  };

  const handleEnable2FA = async (method: "email" | "sms") => {
    setApiError("");
    try {
      const res = await enable2FA(method);
      setTwoFaSetup({ secret_key: res.secret_key, method });
    } catch (e: any) { setApiError(e.message); }
  };

  const handleVerify2FA = async () => {
    if (!twoFaCode) return;
    setApiError("");
    try {
      await verify2FA(twoFaCode);
      setTwoFaSetup(null);
      setTwoFaCode("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setApiError(e.message); }
  };

  const handleDisable2FA = async () => {
    setApiError("");
    try {
      await disable2FA();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setApiError(e.message); }
  };

  const handleThemeChange = async (theme: string) => {
    try { await update({ theme } as any); } catch {}
  };

  const handleLanguageChange = async (language: string) => {
    try { await update({ language } as any); } catch {}
  };

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;
  if (!preferences) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        {saved && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" /> تم الحفظ
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {apiError && <p className="text-sm text-destructive px-1">{apiError}</p>}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>قنوات الإشعارات</CardTitle>
              <CardDescription>اختر كيف تريد تلقي الإشعارات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "notificationsEmail" as const, label: "إشعارات البريد الإلكتروني", icon: Mail },
                { key: "notificationsPush"  as const, label: "إشعارات الموقع (Push)", icon: Bell },
                { key: "notificationsSms"   as const, label: "إشعارات SMS", icon: Smartphone },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor={key}>{label}</Label>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key]}
                    onCheckedChange={v => handleUpdate({ [key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>ملخص البريد</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="emailDigest">تلقي ملخص دوري بـ</Label>
                <Select value={preferences.emailDigest} onValueChange={v => handleUpdate({ emailDigest: v })}>
                  <SelectTrigger id="emailDigest" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="none">معطّل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المصادقة الثنائية (2FA)</CardTitle>
              <CardDescription>أضف طبقة حماية إضافية لحسابك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">الحالة</p>
                  <p className="text-xs text-muted-foreground">
                    {preferences.twoFactorEnabled ? `مفعّلة عبر ${preferences.twoFactorMethod === "email" ? "البريد" : "SMS"}` : "غير مفعّلة"}
                  </p>
                </div>
                <Badge variant={preferences.twoFactorEnabled ? "success" : "secondary"}>
                  {preferences.twoFactorEnabled ? "مفعّلة" : "معطّلة"}
                </Badge>
              </div>

              {!preferences.twoFactorEnabled && !twoFaSetup && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => handleEnable2FA("email")} disabled={is2FAPending}>
                    <Mail className="h-4 w-4 ml-2" /> تفعيل عبر البريد
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEnable2FA("sms")} disabled={is2FAPending}>
                    <Smartphone className="h-4 w-4 ml-2" /> تفعيل عبر SMS
                  </Button>
                </div>
              )}

              {twoFaSetup && (
                <div className="space-y-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">أدخل الرمز للتحقق</p>
                  <p className="text-xs text-muted-foreground">
                    رمز التحقق: <span className="font-mono font-bold">{twoFaSetup.secret_key}</span>
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      value={twoFaCode}
                      onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                      className="w-32 font-mono"
                    />
                    <Button size="sm" onClick={handleVerify2FA} disabled={twoFaCode.length !== 6 || is2FAPending}>
                      تحقق
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setTwoFaSetup(null); setTwoFaCode(""); }}>إلغاء</Button>
                  </div>
                </div>
              )}

              {preferences.twoFactorEnabled && (
                <Button size="sm" variant="destructive" onClick={handleDisable2FA} disabled={is2FAPending}>
                  تعطيل المصادقة الثنائية
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>المظهر واللغة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>السمة</Label>
                <Select value={profile?.theme ?? "auto"} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتح</SelectItem>
                    <SelectItem value="dark">داكن</SelectItem>
                    <SelectItem value="auto">تلقائي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>اللغة</Label>
                <Select value={profile?.language ?? "ar"} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>الخصوصية</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showInDirectory">الظهور في دليل المستخدمين</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">اسمح للآخرين بالعثور على ملفك الشخصي</p>
                </div>
                <Switch
                  id="showInDirectory"
                  checked={preferences.showInDirectory}
                  onCheckedChange={v => handleUpdate({ showInDirectory: v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>معلومات الحساب</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">اسم المستخدم</span>
                <span dir="ltr">@{profile?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ التسجيل</span>
                <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("ar-SA") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الدور</span>
                <span>{profile?.role}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>تصدير البيانات</CardTitle>
              <CardDescription>تنزيل نسخة من بياناتك الشخصية</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => {
                const data = { profile, preferences };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "my-data.json"; a.click();
                URL.revokeObjectURL(url);
              }}>
                تصدير بياناتي
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
