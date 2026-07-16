"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PROFILE_COLUMNS } from "@/lib/supabase/columns";
import type { DirectMessage, UserProfile } from "@/lib/supabase/types";
import { useAuthStore } from "@/store/authStore";

export type Conversation = {
  friend: UserProfile;
  lastMessage: DirectMessage;
  unread: number;
};

/** One row per person you've chatted with — latest message + unread count. */
export function useConversations() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["chats", "conversations"],
    enabled: !!user,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Conversation[]> => {
      const supabase = getSupabaseBrowser();
      const uid = user!.id;
      const { data: msgs, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!msgs || msgs.length === 0) return [];

      const latest = new Map<string, DirectMessage>();
      const unread = new Map<string, number>();
      for (const m of msgs) {
        const other = m.sender_id === uid ? m.recipient_id : m.sender_id;
        if (!latest.has(other)) latest.set(other, m);
        if (m.recipient_id === uid && !m.read_at) {
          unread.set(other, (unread.get(other) ?? 0) + 1);
        }
      }

      const ids = [...latest.keys()];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return ids
        .map((id) => {
          const friend = byId.get(id);
          const lastMessage = latest.get(id)!;
          if (!friend) return null;
          return { friend, lastMessage, unread: unread.get(id) ?? 0 };
        })
        .filter((c): c is Conversation => c !== null)
        .sort((a, b) => b.lastMessage.created_at.localeCompare(a.lastMessage.created_at));
    },
  });
}

export function useTotalUnreadChats() {
  const { data } = useConversations();
  return (data ?? []).reduce((sum, c) => sum + c.unread, 0);
}

/** Messages in a single 1:1 thread, oldest first. */
export function useThread(friendId: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["chats", "thread", friendId],
    enabled: !!user && !!friendId,
    queryFn: async (): Promise<DirectMessage[]> => {
      const supabase = getSupabaseBrowser();
      const uid = user!.id;
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${uid},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${uid})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSendMessage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipientId, body }: { recipientId: string; body: string }) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user!.id,
        recipient_id: recipientId,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chats", "thread", vars.recipientId] });
      queryClient.invalidateQueries({ queryKey: ["chats", "conversations"] });
    },
  });
}

export function useMarkThreadRead() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendId: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", friendId)
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats", "conversations"] }),
  });
}

/** Live-refresh chats when any message involving me changes. */
export function useChatRealtime(friendId?: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`dm:${user.id}:${friendId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chats", "conversations"] });
          if (friendId) queryClient.invalidateQueries({ queryKey: ["chats", "thread", friendId] });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, friendId, queryClient]);
}
