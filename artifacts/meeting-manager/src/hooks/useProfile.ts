import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function apiFetch(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string | null;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  timezone: string;
  theme: string;
  language: string;
  createdAt: string;
}

export interface PublicProfile {
  id: number;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  department: string | null;
  role: string;
}

export function useProfile() {
  const qc = useQueryClient();

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiFetch("/api/profile").then(d => d.user),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => apiFetch("/api/profile", "PUT", data).then(d => d.user),
    onSuccess: (updated) => {
      qc.setQueryData(["profile"], updated);
    },
  });

  return {
    profile,
    isLoading,
    error,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}

export function usePublicProfile(userId: number | undefined) {
  const { data, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ["profile", userId],
    queryFn: () => apiFetch(`/api/profile/${userId}`).then(d => d.user),
    enabled: !!userId,
    staleTime: 120_000,
  });
  return { profile: data, isLoading, error };
}
