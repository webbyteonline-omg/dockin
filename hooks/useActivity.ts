"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import type { ActivityLog } from "@/lib/supabase/types";

export const PAGE_SIZE = 20;

export interface ActivityFilter {
  type: string | null; // action prefix filter
  from: string | null; // YYYY-MM-DD
  to: string | null;
}

export function useActivityLog(page: number, filter: ActivityFilter) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["activity", page, filter],
    enabled: !!user,
    queryFn: async (): Promise<{ rows: ActivityLog[]; total: number }> => {
      const supabase = getSupabaseBrowser();
      let query = supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (filter.type) query = query.like("action", `${filter.type}%`);
      if (filter.from) query = query.gte("created_at", `${filter.from}T00:00:00+05:30`);
      if (filter.to) query = query.lte("created_at", `${filter.to}T23:59:59+05:30`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });
}
