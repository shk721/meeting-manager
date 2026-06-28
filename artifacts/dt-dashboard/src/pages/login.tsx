import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/api/client";

const USERS = [
  { username: "admin",    password: "admin123",   name: "أحمد المنصوري", role: "مدير النظام" },
  { username: "manager1", password: "manager123", name: "سارة القحطاني", role: "مدير" },
  { username: "member1",  password: "member123",  name: "محمد العتيبي",  role: "عضو" },
];

const C = {
  bg: "#0f172a", surface: "#1e293b", border: "#334155",
  text: "#f1f5f9", sub: "#cbd5e1", muted: "#64748b", accent: "#6366f1",
};

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleLogin = async (username: string, password: string) => {
    setError(null);
    setLoading(username);
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof ApiError ? "بيانات الدخول غير صحيحة" : "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'Cairo',sans-serif", direction:"rtl",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>

      <div style={{ marginBottom:32, textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
        <h1 style={{ fontSize:26, fontWeight:800, color:C.text, margin:0 }}>لوحة التحول الرقمي</h1>
        <p style={{ color:C.muted, marginTop:6, fontSize:13 }}>اختر مستخدماً لتسجيل الدخول</p>
      </div>

      <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center", maxWidth:700 }}>
        {USERS.map(u => (
          <div key={u.username}
            style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
              padding:"24px 28px", minWidth:180, textAlign:"center",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading && loading !== u.username ? 0.5 : 1,
              transition:"border-color .15s, transform .15s" }}
            onClick={() => !loading && handleLogin(u.username, u.password)}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = C.accent; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`${C.accent}22`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, margin:"0 auto 12px" }}>👤</div>
            <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{u.name}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{u.role}</div>
            {loading === u.username && (
              <div style={{ fontSize:11, color:C.accent, marginTop:8 }}>جارٍ الدخول...</div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginTop:20, color:"#f87171", fontSize:13, background:"#ef444420",
          padding:"8px 16px", borderRadius:8, border:"1px solid #ef444440" }}>
          {error}
        </div>
      )}
    </div>
  );
}
