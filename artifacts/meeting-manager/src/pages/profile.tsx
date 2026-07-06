import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Pencil, X, Check, User } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "مدير النظام", manager: "مدير", member: "عضو", viewer: "مشاهد",
};

export default function ProfilePage() {
  const { profile, isLoading, update, isUpdating, updateError } = useProfile();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    fullName: "", bio: "", phone: "", avatar: "", timezone: "UTC",
  });
  const [validationError, setValidationError] = useState("");

  const startEdit = () => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName,
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
      avatar: profile.avatar ?? "",
      timezone: profile.timezone,
    });
    setEditing(true);
    setSaved(false);
    setValidationError("");
  };

  const cancelEdit = () => { setEditing(false); setValidationError(""); };

  const handleSave = async () => {
    if (!form.fullName.trim()) { setValidationError("الاسم الكامل مطلوب"); return; }
    if (form.avatar && !form.avatar.startsWith("http")) { setValidationError("رابط الصورة يجب أن يبدأ بـ http"); return; }
    setValidationError("");
    try {
      await update({
        fullName: form.fullName.trim(),
        bio: form.bio || null,
        phone: form.phone || null,
        avatar: form.avatar || null,
        timezone: form.timezone || "UTC",
      } as any);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* error shown via updateError */ }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Spinner /></div>;
  }

  if (!profile) return null;

  const initials = profile.fullName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الملف الشخصي</h1>
          <p className="text-muted-foreground mt-1">معلوماتك الشخصية وإعدادات حسابك</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" /> تم الحفظ
          </div>
        )}
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2">
                {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.fullName} />}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 text-center sm:text-right space-y-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-2xl font-bold">{profile.fullName}</h2>
                <Badge variant="secondary">{roleLabels[profile.role] ?? profile.role}</Badge>
              </div>
              <p className="text-muted-foreground">@{profile.username}</p>
              {profile.department && <p className="text-sm text-muted-foreground">{profile.department}</p>}
              {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
              {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit} className="gap-2">
                <Pencil className="h-4 w-4" /> تعديل
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" /> تعديل الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">الاسم الكامل *</Label>
              <Input id="fullName" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="avatar">رابط الصورة الشخصية</Label>
              <Input id="avatar" placeholder="https://example.com/photo.jpg" value={form.avatar}
                onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">النبذة الشخصية</Label>
              <Textarea id="bio" placeholder="اكتب نبذة قصيرة عنك…" value={form.bio} rows={3}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" placeholder="+966 5x xxx xxxx" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="timezone">المنطقة الزمنية</Label>
              <Input id="timezone" placeholder="UTC" value={form.timezone}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} />
            </div>

            {(validationError || updateError) && (
              <p className="text-sm text-destructive">
                {validationError || (updateError as Error)?.message}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
                {isUpdating ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                حفظ التغييرات
              </Button>
              <Button variant="outline" onClick={cancelEdit} className="gap-2">
                <X className="h-4 w-4" /> إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">كيف يظهر ملفك للآخرين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
            <Avatar className="h-10 w-10">
              {profile.avatar && <AvatarImage src={profile.avatar} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{profile.fullName}</p>
              {profile.bio && <p className="text-xs text-muted-foreground">{profile.bio}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">معلومات الحساب</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">البريد الإلكتروني</span><span>{profile.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">اسم المستخدم</span><span dir="ltr">@{profile.username}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">المنطقة الزمنية</span><span>{profile.timezone}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">تاريخ التسجيل</span>
            <span>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("ar-SA") : "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
