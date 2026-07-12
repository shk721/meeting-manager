import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/api/client";

const C = {
  bg: "#f4f6f2", surface: "#ffffff", border: "#e6ece4",
  text: "#1c261c", sub: "#6b7c6b", muted: "#a3b0a3", accent: "#a97918",
  accentDark: "#8a6010", error: "#c0492f", errorBg: "#fbeeea",
};

export default function Login() {
  const { login, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) window.location.href = "/committees/";
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "11px 14px", fontSize: 14, color: C.text,
    outline: "none", boxSizing: "border-box" as const, fontFamily: "'Cairo',sans-serif",
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Cairo',sans-serif", direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏛️</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>إدارة اللجان</h1>
        <p style={{ color: C.muted, marginTop: 6, fontSize: 13 }}>سجّل الدخول للمتابعة</p>
      </div>

      {/* Form card */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "28px 32px", width: "100%", maxWidth: 380,
        boxShadow: "0 2px 12px rgba(28,38,28,0.06)",
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 6 }}>
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.sub, marginBottom: 6 }}>
              كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...inputStyle, paddingLeft: 40 }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: C.muted,
                  fontSize: 15, padding: 0, lineHeight: 1,
                }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: C.errorBg, color: C.error, border: `1px solid ${C.error}30`,
              borderRadius: 8, padding: "9px 14px", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: C.accent, color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1, fontFamily: "'Cairo',sans-serif", marginTop: 4,
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = C.accentDark; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = C.accent; }}
          >
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول ←"}
          </button>
        </form>
      </div>

      <Link href="/portal" style={{ marginTop: 20, color: C.muted, fontSize: 12, textDecoration: "underline" }}>
        🔎 البوابة الشخصية — عرض ملخصي بدون تسجيل دخول
      </Link>
    </div>
  );
}
