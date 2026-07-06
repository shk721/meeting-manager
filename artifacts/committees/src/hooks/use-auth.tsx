import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getMe, login as apiLogin, logout as apiLogout, type AuthUser } from "@/api/auth";
import { ApiError } from "@/api/client";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((e) => { if (e instanceof ApiError && e.status === 401) setUser(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const { user: u } = await apiLogin(username, password);
    setUser(u);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center",
        fontFamily:"Cairo,sans-serif", background:"#0f172a", color:"#94a3b8", fontSize:16 }}>
        جارٍ التحقق...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
