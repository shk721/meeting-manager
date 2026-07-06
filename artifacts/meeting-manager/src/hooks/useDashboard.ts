import { useQuery } from "@tanstack/react-query";

type Period = "day" | "week" | "month";

async function apiFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useMeetingStats(period: Period = "week") {
  return useQuery({
    queryKey: ["dashboard", "meeting-stats", period],
    queryFn: () => apiFetch(`/api/dashboard/meeting-stats?period=${period}`),
  });
}

export function useTaskStats(period: Period = "week") {
  return useQuery({
    queryKey: ["dashboard", "task-stats", period],
    queryFn: () => apiFetch(`/api/dashboard/task-stats?period=${period}`),
  });
}

export function useInsights() {
  return useQuery({
    queryKey: ["dashboard", "insights"],
    queryFn: () => apiFetch("/api/dashboard/insights"),
  });
}

export function useThisWeek() {
  return useQuery({
    queryKey: ["dashboard", "this-week"],
    queryFn: () => apiFetch("/api/dashboard/this-week"),
  });
}

export function usePending() {
  return useQuery({
    queryKey: ["dashboard", "pending"],
    queryFn: () => apiFetch("/api/dashboard/pending"),
  });
}
