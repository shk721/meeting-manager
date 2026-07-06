import { apiFetch } from "./client";

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string | null;
}

export function getMe(): Promise<AuthUser> {
  return apiFetch("/api/auth/me");
}

export function login(username: string, password: string): Promise<{ user: AuthUser }> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<void> {
  return apiFetch("/api/auth/logout", { method: "POST" });
}
