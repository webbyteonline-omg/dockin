"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PROFILE_COLUMNS, USER_STATS_COLUMNS } from "@/lib/supabase/columns";
import { logActivity } from "@/lib/activityLog";
import { useAuthStore } from "@/store/authStore";
import type { FriendRequest, UserProfile } from "@/lib/supabase/types";

export interface RequestWithProfile extends FriendRequest {
  direction: "incoming" | "outgoing";
  profile: UserProfile | null;
}

export function isRateLimitError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  if (!/rate_limit/i.test(msg)) return null;
  if (msg.includes("polls")) return "You've created 5 polls today — come back tomorrow!";
  if (msg.includes("friend_requests")) return "20 friend requests a day is the limit — try tomorrow.";
  if (msg.includes("expenses")) return "That's 50 expenses today — impressive, but take a break!";
  if (msg.includes("location")) return "Location updates are limited to one every 30 seconds.";
  return "You're doing that too often — try again later.";
}

/** My friends (profiles). */
export function useFriends() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["friends"],
    enabled: !!user,
    queryFn: async (): Promise<UserProfile[]> => {
      const supabase = getSupabaseBrowser();
      const { data: rows, error } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      const ids = rows.map((r) => r.friend_id);
      if (ids.length === 0) return [];
      const { data: profiles, error: e2 } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .in("id", ids);
      if (e2) throw e2;
      return profiles;
    },
  });
}

/** Pending requests (both directions) with sender/receiver profiles. */
export function useFriendRequests() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["friend-requests"],
    enabled: !!user,
    queryFn: async (): Promise<RequestWithProfile[]> => {
      const supabase = getSupabaseBrowser();
      const { data: requests, error } = await supabase
        .from("friend_requests")
        .select("id,sender_id,receiver_id,status,created_at")
        .eq("status", "pending")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`);
      if (error) throw error;
      if (requests.length === 0) return [];
      const otherIds = requests.map((r) =>
        r.sender_id === user!.id ? r.receiver_id : r.sender_id
      );
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .in("id", otherIds);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return requests.map((r) => ({
        ...r,
        direction: r.receiver_id === user!.id ? ("incoming" as const) : ("outgoing" as const),
        profile: byId.get(r.sender_id === user!.id ? r.receiver_id : r.sender_id) ?? null,
      }));
    },
  });
}

/** Username search (excludes self; friends flagged). */
export function useUserSearch(term: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["user-search", term],
    enabled: !!user && term.trim().length >= 2,
    queryFn: async (): Promise<UserProfile[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .ilike("username", `%${term.trim().toLowerCase()}%`)
        .neq("id", user!.id)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (receiverId: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("friend_requests")
        .insert({ sender_id: user!.id, receiver_id: receiverId });
      if (error) throw new Error(isRateLimitError(error) ?? error.message);
      logActivity("friend_request_sent", "friend_request", { entityId: receiverId });
      // Push notification to the receiver — fire and forget
      void fetch("/api/friends/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friend-requests"] }),
  });
}

export function useRespondToRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ request, accept }: { request: FriendRequest; accept: boolean }) => {
      const supabase = getSupabaseBrowser();
      if (accept) {
        const { error } = await supabase.rpc("accept_friend_request", {
          request_id: request.id,
        });
        if (error) throw error;
        logActivity("friend_added", "friendship", { entityId: request.sender_id });
      } else {
        const { error } = await supabase
          .from("friend_requests")
          .update({ status: "rejected" })
          .eq("id", request.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useUnfriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendId: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.rpc("unfriend", { other: friendId });
      if (error) throw error;
      logActivity("friend_removed", "friendship", { entityId: friendId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
}

/** A friend's full profile view: profile + stats + checkin + location area. */
export function useFriendProfile(friendId: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["friend-profile", friendId],
    enabled: !!user && !!friendId,
    queryFn: async () => {
      const supabase = getSupabaseBrowser();
      const [{ data: profile }, { data: stats }, { data: location }, { data: scores }] =
        await Promise.all([
          supabase.from("user_profiles").select(PROFILE_COLUMNS).eq("id", friendId).maybeSingle(),
          supabase.from("user_stats").select(USER_STATS_COLUMNS).eq("user_id", friendId).maybeSingle(),
          supabase
            .from("location_shares")
            .select("user_id,area,encrypted_coords,updated_at")
            .eq("user_id", friendId)
            .maybeSingle(),
          supabase
            .from("pulse_scores")
            .select("id,user_id,date,score,breakdown")
            .eq("user_id", friendId)
            .order("date", { ascending: false })
            .limit(30),
        ]);
      return { profile, stats, location, scores: scores ?? [] };
    },
  });
}
