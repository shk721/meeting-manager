import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

async function apiFetch(path: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export type FilterCriteria = Record<string, string | number | undefined>;

export function useFilters(type: "meetings" | "tasks") {
  const [criteria, setCriteria] = useState<FilterCriteria>({});
  const [applied, setApplied] = useState<FilterCriteria>({});

  const isActive = Object.keys(applied).length > 0;

  const { data, isLoading } = useQuery({
    queryKey: ["filters", type, applied],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.entries(applied)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      );
      return apiFetch(`/api/filters/${type}?${params}`);
    },
    enabled: isActive,
    staleTime: 15_000,
  });

  const applyFilters = useCallback(() => {
    const active = Object.fromEntries(
      Object.entries(criteria).filter(([, v]) => v !== undefined && v !== "")
    );
    setApplied(active);
  }, [criteria]);

  const clearFilters = useCallback(() => {
    setCriteria({});
    setApplied({});
  }, []);

  const appliedCount = Object.keys(applied).length;

  return {
    criteria,
    setCriteria,
    applyFilters,
    clearFilters,
    results: isActive ? (data?.data ?? null) : null,
    total: data?.pagination?.total ?? 0,
    appliedFilters: data?.appliedFilters ?? {},
    isLoading: isActive && isLoading,
    isActive,
    appliedCount,
  };
}
