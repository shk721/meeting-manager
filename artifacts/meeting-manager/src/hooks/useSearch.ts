import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

async function apiFetch(path: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export interface SearchResult<T> {
  data: T[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

export function useSearch<T = unknown>(type: "meetings" | "tasks") {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debounced.length >= 2;

  const { data, isLoading } = useQuery<SearchResult<T> | null>({
    queryKey: ["search", type, debounced],
    queryFn: () => apiFetch(`/api/search/${type}?q=${encodeURIComponent(debounced)}&limit=50`),
    enabled,
    staleTime: 10_000,
  });

  const clear = useCallback(() => { setQuery(""); setDebounced(""); }, []);

  return {
    query,
    setQuery,
    results: enabled ? (data?.data ?? null) : null,
    total: data?.pagination.total ?? 0,
    isLoading: enabled && isLoading,
    isActive: enabled,
    clear,
  };
}
