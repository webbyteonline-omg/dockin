"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PROFILE_COLUMNS } from "@/lib/supabase/columns";
import { useAuthStore } from "@/store/authStore";
import type { UserProfile } from "@/lib/supabase/types";

export type LeaderboardPeriod = "week" | "month" | "all";

export interface GroupLeaderboardEntry {
  rank: number;
  userId: string;
  profile: UserProfile | null;
  score: number;
  isYou: boolean;
}

/**
 * Group leaderboard, ranked by each member's real Pulse Score
 * (user_profiles.pulse_score — the same score shown on Dashboard/Profile
 * everywhere else in the app).
 *
 * NOTE on `period`: RLS only lets a client read its OWN subjects,
 * assignments, and expenses — not a group-mate's — so a genuinely
 * time-windowed, per-member recomputed score isn't something the client
 * can produce for anyone but the signed-in user. `period` is accepted and
 * threaded through for the UI's This Week/This Month/All Time chips, but
 * currently always ranks by the same live `pulse_score` regardless of
 * value; a true historical breakdown would need a server-side job (e.g.
 * the existing pulse_scores history table) to serve per-period snapshots
 * for every member, not just yourself.
 */
export function useGroupLeaderboard(groupId: string | undefined, _period: LeaderboardPeriod = "week") {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["group-leaderboard", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupLeaderboardEntry[]> => {
      const supabase = getSupabaseBrowser();
      const { data: members, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId!);
      if (error) throw error;
      if (!members || members.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .in(
          "id",
          members.map((m) => m.user_id)
        );
      if (pErr) throw pErr;

      const sorted = [...(profiles ?? [])].sort((a, b) => b.pulse_score - a.pulse_score);

      return sorted.map((profile, i) => ({
        rank: i + 1,
        userId: profile.id,
        profile,
        score: profile.pulse_score,
        isYou: profile.id === user?.id,
      }));
    },
  });
}
