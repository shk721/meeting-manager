import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function apiFetch(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return null;
  if (res.status === 204) return null;
  return res.json();
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId: number | null;
  relatedType: string | null;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  expiresAt: string | null;
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiFetch("/api/notifications/unread-count"),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/api/notifications?limit=20"),
    staleTime: 15_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/notifications/${id}/read`, "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/notifications/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
