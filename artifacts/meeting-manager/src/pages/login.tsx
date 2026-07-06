import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

const USERS = [
  { username: "admin",    password: "admin123",   name: "أحمد المنصوري", role: "مدير النظام", roleId: "admin" },
  { username: "manager1", password: "manager123", name: "سارة القحطاني", role: "مدير",        roleId: "manager" },
  { username: "member1",  password: "member123",  name: "محمد العتيبي",  role: "عضو",         roleId: "member" },
];

const roleColors: Record<string, string> = {
  admin:   "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  manager: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  member:  "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Building2 className="h-7 w-7" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary">نظام إدارة الاجتماعات</h1>
        <p className="mt-2 text-muted-foreground">الرجاء اختيار مستخدم لتسجيل الدخول (نسخة تجريبية)</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-3xl w-full">
        {USERS.map((user) => (
          <Card key={user.username} className="hover-elevate-2 transition-all shadow-sm hover:shadow-md">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-3">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${roleColors[user.roleId] ?? "bg-muted text-muted-foreground"}`}>
                  {user.name.substring(0, 2)}
                </div>
              </div>
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <div className="mt-1">
                <Badge variant={user.roleId === "admin" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center pt-2 pb-5">
              <Button onClick={() => login(user.username, user.password)} className="w-full">
                تسجيل الدخول
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
