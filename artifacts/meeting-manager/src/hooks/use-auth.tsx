import { createContext, useContext, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useGetCurrentUser, useLogin, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation(); // used by handleLogout
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
      queryKey: getGetCurrentUserQueryKey(),
    }
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const handleLogin = async (username: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ data: { username, password } });
      await queryClient.refetchQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast({ title: "تم تسجيل الدخول بنجاح" });
      // Navigation is handled by Login page's useEffect watching `user`,
      // so we avoid a ProtectedRoute bounce before AuthProvider re-renders.
    } catch (e: any) {
      const status = e?.status ?? 0;
      const serverMsg = e?.data?.error ?? e?.message ?? "";
      const description = status === 401
        ? "اسم المستخدم أو كلمة المرور غير صحيحة."
        : status === 500
        ? `خطأ في الخادم: ${serverMsg || "Session save failed"}`
        : serverMsg || "تعذّر الاتصال بالخادم.";
      toast({
        title: "فشل تسجيل الدخول",
        description,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
      toast({ title: "تم تسجيل الخروج" });
      setLocation("/login");
    } catch (e) {
      toast({ title: "فشل تسجيل الخروج", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
