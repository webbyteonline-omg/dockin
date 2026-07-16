"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PROFILE_COLUMNS } from "@/lib/supabase/columns";
import { useFriends } from "./useFriends";
import type { LocationArea } from "@/lib/supabase/types";

export interface FriendLocation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
  area: LocationArea | null;
  updatedAt: string;
}

const FRESH_MS = 30 * 60 * 1000; // hide friends not seen in 30 min

/**
 * Friends' approximate positions for the campus map. RLS only returns rows
 * for friends with privacy_location enabled; coordinates are the ~100m
 * rounded ones (exact coords stay E2E-encrypted).
 */
export function useFriendLocations() {
  const { data: friends } = useFriends();
  const ids = (friends ?? []).map((f) => f.id);

  return useQuery({
    queryKey: ["friend-locations", ids],
    enabled: ids.length > 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<FriendLocation[]> => {
      const supabase = getSupabaseBrowser();
      const { data: shares } = await supabase
        .from("location_shares")
        .select("user_id,area,approx_lat,approx_lng,updated_at")
        .in("user_id", ids);
      if (!shares || shares.length === 0) return [];

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .in("id", shares.map((s) => s.user_id));
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const now = Date.now();
      return shares
        .filter(
          (s) =>
            s.approx_lat !== null &&
            s.approx_lng !== null &&
            now - new Date(s.updated_at).getTime() < FRESH_MS
        )
        .map((s) => {
          const profile = profileById.get(s.user_id);
          return {
            userId: s.user_id,
            name: profile?.display_name ?? profile?.username ?? "Friend",
            avatarUrl: profile?.avatar_url ?? null,
            lat: Number(s.approx_lat),
            lng: Number(s.approx_lng),
            area: s.area,
            updatedAt: s.updated_at,
          };
        });
    },
  });
}
