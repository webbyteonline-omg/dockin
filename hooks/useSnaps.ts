"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PROFILE_COLUMNS } from "@/lib/supabase/columns";
import type { Snap, UserProfile } from "@/lib/supabase/types";
import { useAuthStore } from "@/store/authStore";

export type InboxSnap = Snap & { sender: UserProfile | null };

/** Unviewed, unexpired snaps addressed to me — newest first. */
export function useInboxSnaps() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["snaps", "inbox"],
    enabled: !!user,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<InboxSnap[]> => {
      const supabase = getSupabaseBrowser();
      const nowIso = new Date().toISOString();
      const { data: snaps, error } = await supabase
        .from("snaps")
        .select("*")
        .eq("recipient_id", user!.id)
        .is("viewed_at", null)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!snaps || snaps.length === 0) return [];

      const senderIds = [...new Set(snaps.map((s) => s.sender_id))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .in("id", senderIds);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return snaps.map((s) => ({ ...s, sender: byId.get(s.sender_id) ?? null }));
    },
  });
}

/** Count badge helper. */
export function useUnreadSnapCount() {
  const { data } = useInboxSnaps();
  return data?.length ?? 0;
}

/** Lifetime count of snaps sent by me — for profile stats, not the inbox badge. */
export function useSentSnapCount() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["snaps", "sent-count"],
    enabled: !!user,
    queryFn: async (): Promise<number> => {
      const supabase = getSupabaseBrowser();
      const { count, error } = await supabase
        .from("snaps")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useSendSnap() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipientId,
      file,
      caption,
    }: {
      recipientId: string;
      file: File | Blob;
      caption?: string;
    }) => {
      const supabase = getSupabaseBrowser();
      const ext =
        file instanceof File && file.name.includes(".")
          ? file.name.split(".").pop()
          : "jpg";
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("snaps")
        .upload(path, file, {
          contentType: (file as File).type || "image/jpeg",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("snaps").getPublicUrl(path);
      const { error } = await supabase.from("snaps").insert({
        sender_id: user!.id,
        recipient_id: recipientId,
        image_url: pub.publicUrl,
        caption: caption?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["snaps"] }),
  });
}

export function useMarkSnapViewed() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapId: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("snaps")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", snapId)
        .eq("recipient_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["snaps", "inbox"] }),
  });
}

/** Live-refresh the inbox when a new snap arrives for me. */
export function useSnapRealtime() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`snaps:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "snaps",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["snaps", "inbox"] })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
