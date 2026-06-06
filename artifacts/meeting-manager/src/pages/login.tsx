import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const USERS = [
  { username: "admin",   password: "admin123",   name: "أحمد المنصوري", role: "مدير النظام", roleId: "admin" },
  { username: "manager", password: "manager123", name: "سارة القحطاني", role: "مدير",        roleId: "manager" },
  { username: "member1", password: "member123",  name: "محمد العتيبي",  role: "عضو",         roleId: "member" },
  { username: "viewer",  password: "viewer123",  name: "نورة الشمري",   role: "مراقب",       roleId: "viewer" },
];

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">نظام إدارة الاجتماعات</h1>
        <p className="mt-2 text-muted-foreground">الرجاء اختيار مستخدم لتسجيل الدخول (نسخة تجريبية)</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl w-full">
        {USERS.map((user) => (
          <Card key={user.username} className="hover-elevate-2 transition-all">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <div className="mt-2">
                <Badge variant={user.roleId === "admin" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center pt-4">
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
