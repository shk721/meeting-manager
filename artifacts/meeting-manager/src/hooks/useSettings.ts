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

export interface Preferences {
  id: number;
  userId: number;
  notificationsEmail: boolean;
  notificationsPush: boolean;
  notificationsSms: boolean;
  emailDigest: "daily" | "weekly" | "none";
  twoFactorEnabled: boolean;
  twoFactorMethod: "email" | "sms" | null;
  showInDirectory: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useSettings() {
  const qc = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery<Preferences>({
    queryKey: ["settings", "preferences"],
    queryFn: () => apiFetch("/api/settings/preferences").then(d => d.preferences),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Preferences>) =>
      apiFetch("/api/settings/preferences", "PUT", data).then(d => d.preferences),
    onSuccess: (updated) => {
      qc.setQueryData(["settings", "preferences"], updated);
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: (method: "email" | "sms") =>
      apiFetch("/api/settings/two-factor/enable", "POST", { method }),
  });

  const verify2FAMutation = useMutation({
    mutationFn: (code: string) =>
      apiFetch("/api/settings/two-factor/verify", "POST", { code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "preferences"] });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: () => apiFetch("/api/settings/two-factor/disable", "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "preferences"] });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    enable2FA: enable2FAMutation.mutateAsync,
    verify2FA: verify2FAMutation.mutateAsync,
    disable2FA: disable2FAMutation.mutateAsync,
    is2FAPending: enable2FAMutation.isPending || verify2FAMutation.isPending || disable2FAMutation.isPending,
  };
}
