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

export interface SavedView {
  id: number;
  userId: number;
  name: string;
  type: "meetings" | "tasks";
  filters: Record<string, unknown>;
  createdAt: string;
}

export function useViews() {
  const qc = useQueryClient();

  const { data: views = [] } = useQuery<SavedView[]>({
    queryKey: ["views"],
    queryFn: () => apiFetch("/api/views").then(d => d ?? []),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (body: { name: string; type: "meetings" | "tasks"; filters: Record<string, unknown> }) =>
      apiFetch("/api/views", "POST", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["views"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/views/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["views"] }),
  });

  return { views, create, remove };
}
