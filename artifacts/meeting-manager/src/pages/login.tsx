import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const USERS = [
  { username: "admin",    password: "admin123",   name: "أحمد المنصوري", role: "مدير النظام", roleId: "admin" },
  { username: "manager1", password: "manager123", name: "سارة القحطاني", role: "مدير",        roleId: "manager" },
  { username: "member1",  password: "member123",  name: "محمد العتيبي",  role: "عضو",         roleId: "member" },
];

const avatarColors: Record<string, { bg: string; text: string }> = {
  admin:   { bg: "#e8f2ea", text: "#1f7a4d" },
  manager: { bg: "#fbf1dd", text: "#a97918" },
  member:  { bg: "#eef2ec", text: "#5a675a" },
};

export default function Login() {
  const { login } = useAuth();

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center p-6"
      style={{ background: "#f4f6f2" }}
      dir="rtl"
    >
      <div className="w-full max-w-xl">
        {/* Brand block */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div
            className="flex items-center justify-center rounded-2xl text-white font-bold text-2xl"
            style={{ width: 56, height: 56, background: "linear-gradient(150deg,#1f7a4d,#2f9e6b)" }}
          >
            م
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: "#1c261c" }}>نظام إدارة الاجتماعات</h1>
            <p className="text-sm mt-1" style={{ color: "#8a978a" }}>اختر مستخدماً لتسجيل الدخول (نسخة تجريبية)</p>
          </div>
        </div>

        {/* User cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {USERS.map((user) => {
            const colors = avatarColors[user.roleId] ?? { bg: "#eef2ec", text: "#5a675a" };
            return (
              <div
                key={user.username}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer transition-all"
                style={{ background: "#fff", border: "1px solid #e6ece4" }}
                onClick={() => login(user.username, user.password)}
              >
                <div
                  className="flex items-center justify-center rounded-full text-lg font-bold"
                  style={{ width: 56, height: 56, background: colors.bg, color: colors.text }}
                >
                  {user.name.substring(0, 2)}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm" style={{ color: "#1c261c" }}>{user.name}</p>
                  <span
                    className="inline-block text-xs px-2.5 py-0.5 rounded-full mt-1"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: "#1f7a4d" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#155c39")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#1f7a4d")}
                  onClick={(e) => { e.stopPropagation(); login(user.username, user.password); }}
                >
                  تسجيل الدخول
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
