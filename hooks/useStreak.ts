"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { daysAgoIST, todayIST } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

/** Real daily-open streak, read from user_stats.streak. */
export function useMyStreak() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["streak"],
    enabled: !!user,
    queryFn: async (): Promise<number> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("user_stats")
        .select("streak")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.streak ?? 0;
    },
  });
}

/**
 * Maintains the daily-open streak: +1 if you last opened yesterday, reset to
 * 1 if it's been longer, unchanged if already logged today. Runs once per
 * browser session (not once per navigation) so it's cheap and idempotent.
 */
export function useStreakSync(): void {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const key = `dockin-streak-sync-${todayIST()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const run = async () => {
      const supabase = getSupabaseBrowser();
      const today = todayIST();
      const yesterday = daysAgoIST(1);

      const { data: existing } = await supabase
        .from("user_stats")
        .select("streak,last_open")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.last_open === today) return; // already logged today

      const streak = existing?.last_open === yesterday ? existing.streak + 1 : 1;

      await supabase.from("user_stats").upsert({
        user_id: user.id,
        streak,
        last_open: today,
        updated_at: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ["streak"] });
    };

    void run().catch(() => sessionStorage.removeItem(key));
  }, [user, queryClient]);
}
