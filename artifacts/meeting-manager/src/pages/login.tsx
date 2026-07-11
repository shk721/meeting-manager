import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, CheckCircle, CalendarDays, FileText } from "lucide-react";

const FEATURES = [
  { icon: CalendarDays, text: "جدولة الاجتماعات وإدارة المواعيد بكل سهولة" },
  { icon: CheckCircle,  text: "تتبع المهام وقرارات الاجتماعات في الوقت الفعلي" },
  { icon: FileText,     text: "محاضر رقمية معتمدة وتقارير تحليلية متقدمة" },
];

export default function Login() {
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (user) setLocation("/");
  }, [user]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* Right panel — brand / promotional */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ background: "linear-gradient(150deg, #1a6640 0%, #1f7a4d 60%, #2f9e6b 100%)" }}
      >
        {/* Logo + system name */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-2xl text-white font-bold text-2xl flex-shrink-0"
            style={{ width: 52, height: 52, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            م
          </div>
          <span className="text-lg font-semibold opacity-90">نظام إدارة الاجتماعات</span>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-snug mb-4">
              إدارة اجتماعاتك<br />ومهامك في مكان واحد
            </h1>
            <p className="text-lg opacity-75">
              منصة متكاملة لتنظيم الاجتماعات وتتبع القرارات وقياس الإنتاجية
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)" }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="opacity-90">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm opacity-50">
          © {new Date().getFullYear()} نظام إدارة الاجتماعات — جميع الحقوق محفوظة
        </p>
      </div>

      {/* Left panel — login form */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12"
        style={{ background: "#f4f6f2" }}
      >
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center gap-2 mb-10 lg:hidden">
            <div
              className="flex items-center justify-center rounded-2xl text-white font-bold text-2xl"
              style={{ width: 56, height: 56, background: "linear-gradient(150deg,#1f7a4d,#2f9e6b)" }}
            >
              م
            </div>
            <h1 className="text-xl font-bold" style={{ color: "#1c261c" }}>نظام إدارة الاجتماعات</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold" style={{ color: "#1c261c" }}>مرحباً بعودتك</h2>
            <p className="mt-1 text-sm" style={{ color: "#8a978a" }}>سجّل الدخول للمتابعة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: "#3a4a3a" }}>
                البريد الإلكتروني أو اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: "#fff",
                  border: "1px solid #d6ddd4",
                  color: "#1c261c",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#1f7a4d")}
                onBlur={e => (e.currentTarget.style.borderColor = "#d6ddd4")}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: "#3a4a3a" }}>
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    background: "#fff",
                    border: "1px solid #d6ddd4",
                    color: "#1c261c",
                    paddingLeft: "2.75rem",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#1f7a4d")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#d6ddd4")}
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#8a978a" }}
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="rounded" style={{ accentColor: "#1f7a4d" }} />
                <span className="text-sm" style={{ color: "#5a675a" }}>تذكّرني على هذا الجهاز</span>
              </label>
              <button
                type="button"
                className="text-sm font-medium transition-colors"
                style={{ color: "#1f7a4d" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#155c39")}
                onMouseLeave={e => (e.currentTarget.style.color = "#1f7a4d")}
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm rounded-lg px-4 py-2.5" style={{ background: "#fbeeea", color: "#c0492f" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-70"
              style={{ background: "#1f7a4d" }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#155c39"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#1f7a4d"; }}
            >
              {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول ←"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm" style={{ color: "#8a978a" }}>
            ليس لديك حساب؟{" "}
            <span className="font-medium" style={{ color: "#5a675a" }}>تواصل مع المسؤول</span>
          </p>
        </div>
      </div>
    </div>
  );
}
