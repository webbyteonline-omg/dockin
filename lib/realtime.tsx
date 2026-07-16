"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";

interface RealtimeContextValue {
  /** User ids currently online (Supabase Presence). */
  onlineIds: Set<string>;
}

const RealtimeContext = createContext<RealtimeContextValue>({ onlineIds: new Set() });

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}

export function useIsOnline(userId: string | null | undefined): boolean {
  const { onlineIds } = useRealtime();
  return !!userId && onlineIds.has(userId);
}

/**
 * Single realtime hub. Subscribes once on login:
 * - presence channel → online friends indicator
 * - friend_requests inserts/updates → bell badge + lists update instantly
 * - polls / poll_votes changes → live vote results
 * - user_stats / user_profiles changes → leaderboard + pulse scores live
 * Everything is event-driven; no polling. Supabase client auto-reconnects.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnlineIds(new Set());
      return;
    }
    const supabase = getSupabaseBrowser();

    // --- Presence -----------------------------------------------------------
    const presence = supabase.channel("pulse-online", {
      config: { presence: { key: user.id } },
    });
    presence
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(presence.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void presence.track({ at: Date.now() });
        }
      });

    // --- Postgres changes ----------------------------------------------------
    const invalidate = (...keys: string[]) => {
      for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] });
    };

    const changes = supabase
      .channel("pulse-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${user.id}` },
        () => invalidate("friend-requests", "friends")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `sender_id=eq.${user.id}` },
        () => invalidate("friend-requests", "friends")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships", filter: `user_id=eq.${user.id}` },
        () => invalidate("friends", "leaderboard")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "polls" },
        () => invalidate("polls")
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poll_votes" },
        () => invalidate("polls", "poll-votes")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_stats" },
        () => invalidate("leaderboard", "friend-profile")
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_profiles" },
        () => invalidate("friend-profile", "profile", "leaderboard")
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(presence);
      void supabase.removeChannel(changes);
    };
  }, [user, queryClient]);

  const value = useMemo(() => ({ onlineIds }), [onlineIds]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
