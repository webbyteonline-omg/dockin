"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PROFILE_COLUMNS } from "@/lib/supabase/columns";
import { logActivity } from "@/lib/activityLog";
import { computePulseScore, type PulseBreakdown } from "@/lib/pulseScore";
import {
  attendancePercent,
  daysAgoIST,
  nowIST,
  todayIST,
  weekStartIST,
} from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { DailyCheckin, UserProfile } from "@/lib/supabase/types";

export function useMyProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["profile"],
    enabled: !!user,
    queryFn: async (): Promise<UserProfile | null> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/** Today's check-in (mood + steps). */
export function useTodayCheckin() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["checkin", todayIST()],
    enabled: !!user,
    queryFn: async (): Promise<DailyCheckin | null> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .eq("date", todayIST())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWeekCheckins() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["checkins-week"],
    enabled: !!user,
    queryFn: async (): Promise<DailyCheckin[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", weekStartIST())
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Upserts today's check-in row. Accepts a *partial* patch so callers can
 * update just one field (e.g. only `mood`, or only `steps`) without
 * clobbering whatever else was already logged today — used by both the
 * dashboard-era mood+steps card and the Health page's per-metric log sheet
 * (steps / water_ml / calories / sleep_minutes / mood / journal).
 */
export function useSaveCheckin() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (
      patch: Partial<Pick<DailyCheckin, "mood" | "steps" | "water_ml" | "calories" | "sleep_minutes" | "journal">>
    ) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("daily_checkins")
        .upsert(
          { user_id: user!.id, date: todayIST(), ...patch },
          { onConflict: "user_id,date" }
        );
      if (error) throw error;
      logActivity("checkin", "daily_checkin", { newValue: { ...patch, journal: undefined } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin"] });
      queryClient.invalidateQueries({ queryKey: ["checkins-week"] });
    },
  });
}

/** My pulse score history (last 30 days). */
export function usePulseHistory() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["pulse-history"],
    enabled: !!user,
    queryFn: async () => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("pulse_scores")
        .select("id,user_id,date,score,breakdown")
        .eq("user_id", user!.id)
        .gte("date", daysAgoIST(30))
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Provisional pulse score for *today*, computed client-side from live data.
 * The cron writes the canonical daily record; this keeps the gauge current.
 */
export function useLivePulseScore(): { breakdown: PulseBreakdown | null; loading: boolean } {
  const user = useAuthStore((s) => s.user);
  const query = useQuery({
    queryKey: ["pulse-live"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<PulseBreakdown> => {
      const supabase = getSupabaseBrowser();
      const now = nowIST();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const mm = String(month).padStart(2, "0");
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

      const [{ data: subjects }, { data: expenses }, { data: budgets }, { data: checkins }, { data: stats }] =
        await Promise.all([
          supabase.from("subjects").select("id,total_classes,attended_classes,required_percentage"),
          supabase
            .from("expenses")
            .select("id,amount,category,date")
            .eq("transaction_type", "expense")
            .gte("date", `${year}-${mm}-01`)
            .lte("date", `${year}-${mm}-${lastDay}`),
          supabase.from("budgets").select("id,category,amount").eq("month", month).eq("year", year),
          supabase
            .from("daily_checkins")
            .select("id,date,mood,steps")
            .eq("user_id", user!.id)
            .gte("date", weekStartIST()),
          supabase.from("user_stats").select("streak").eq("user_id", user!.id).maybeSingle(),
        ]);

      return computePulseScore({
        subjects: subjects ?? [],
        monthExpenses: expenses ?? [],
        monthBudgets: budgets ?? [],
        weekCheckins: checkins ?? [],
        streak: stats?.streak ?? 0,
        dayOfMonth: now.getDate(),
        daysInMonth: lastDay,
      });
    },
  });
  return { breakdown: query.data ?? null, loading: query.isLoading };
}

/**
 * On app open: maintain the daily-open streak and push fresh aggregate stats
 * to user_stats (leaderboard source). Runs once per session.
 */
export function useStatsSync(): void {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const key = `pulse-stats-sync-${todayIST()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const run = async () => {
      const supabase = getSupabaseBrowser();
      const today = todayIST();
      const yesterday = daysAgoIST(1);
      const now = nowIST();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const mm = String(month).padStart(2, "0");
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

      const { data: stats } = await supabase
        .from("user_stats")
        .select("streak,last_open")
        .eq("user_id", user.id)
        .maybeSingle();

      // Streak: +1 if last open was yesterday, reset to 1 if older
      let streak = 1;
      if (stats?.last_open === today) streak = stats.streak;
      else if (stats?.last_open === yesterday) streak = stats.streak + 1;

      const [{ data: subjects }, { data: expenses }, { data: budgets }, { data: checkins }] =
        await Promise.all([
          supabase.from("subjects").select("id,total_classes,attended_classes,required_percentage"),
          supabase
            .from("expenses")
            .select("id,amount,date")
            .eq("transaction_type", "expense")
            .gte("date", `${year}-${mm}-01`)
            .lte("date", `${year}-${mm}-${lastDay}`),
          supabase.from("budgets").select("id,amount").eq("month", month).eq("year", year),
          supabase
            .from("daily_checkins")
            .select("id,mood,steps")
            .eq("user_id", user.id)
            .gte("date", weekStartIST()),
        ]);

      const tracked = (subjects ?? []).filter((s) => s.total_classes > 0);
      const attendancePct =
        tracked.length > 0
          ? tracked.reduce((sum, s) => sum + attendancePercent(s.attended_classes, s.total_classes), 0) / tracked.length
          : null;
      const totalBudget = (budgets ?? []).reduce((sum, b) => sum + Number(b.amount), 0);
      const spent = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
      const budgetRemainingPct =
        totalBudget > 0 ? Math.max(0, ((totalBudget - spent) / totalBudget) * 100) : null;
      const stepsWeek = (checkins ?? []).reduce((sum, c) => sum + (c.steps ?? 0), 0);
      const moods = (checkins ?? []).map((c) => c.mood).filter((m): m is number => m !== null);
      const moodAvg = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

      const breakdown = computePulseScore({
        subjects: subjects ?? [],
        monthExpenses: expenses ?? [],
        monthBudgets: budgets ?? [],
        weekCheckins: checkins ?? [],
        streak,
        dayOfMonth: now.getDate(),
        daysInMonth: lastDay,
      });

      await supabase.from("user_stats").upsert({
        user_id: user.id,
        steps_week: stepsWeek,
        mood_avg_week: moodAvg,
        attendance_pct: attendancePct,
        budget_remaining_pct: budgetRemainingPct,
        pulse_score: breakdown.total,
        streak,
        last_open: today,
        week_start: weekStartIST(),
        updated_at: new Date().toISOString(),
      });
      await supabase
        .from("user_profiles")
        .update({ pulse_score: breakdown.total })
        .eq("id", user.id);

      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    };

    void run().catch(() => sessionStorage.removeItem(key));
  }, [user, queryClient]);
}
