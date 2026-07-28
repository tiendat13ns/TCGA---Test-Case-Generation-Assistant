import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { StudioTestCaseItem } from "../components/TestCaseStudio";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/* ── Query Keys ─────────────────────────────────────────── */
export const testCaseKeys = {
  all: ["testCases"] as const,
  list: (filters: Record<string, any>) => ["testCases", "list", filters] as const,
};

/* ── Fetchers ───────────────────────────────────────────── */
async function fetchTestCases(filters: Record<string, any>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.append(key, String(value));
  }

  const r = await fetch(`${API_BASE}/api/v1/test-cases?${params.toString()}`);
  if (!r.ok) throw new Error("Failed to load test cases");
  const d = await r.json();
  return {
    test_cases: d.test_cases || [],
    total_test_cases: d.total_test_cases || 0,
  };
}

async function updateTestCaseAPI(payload: { id: string; data: Partial<StudioTestCaseItem> }): Promise<StudioTestCaseItem> {
  const r = await fetch(`${API_BASE}/api/v1/test-cases/${payload.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload.data),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.detail || "Failed to update test case.");
  return d;
}

/* ── Hooks ──────────────────────────────────────────────── */

export function useTestCases(filters: Record<string, any>, enabled: boolean = true) {
  return useQuery({
    queryKey: testCaseKeys.list(filters),
    queryFn: () => fetchTestCases(filters),
    enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });
}

export function useUpdateTestCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTestCaseAPI,
    onSuccess: (updatedTC) => {
      // Invalidate the testCases cache so it fetches fresh data
      queryClient.invalidateQueries({ queryKey: testCaseKeys.all });
    },
  });
}
