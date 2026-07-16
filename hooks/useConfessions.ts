"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Confession } from "@/lib/supabase/types";
import { useAuthStore } from "@/store/authStore";

/** Recent anonymous confessions, newest first. */
export function useConfessions(limit = 50) {
  return useQuery({
    queryKey: ["confessions"],
    queryFn: async (): Promise<Confession[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePostConfession() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("confessions")
        .insert({ author_id: user!.id, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["confessions"] }),
  });
}

/** Live feed refresh on new confessions. */
export function useConfessionRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("confessions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "confessions" },
        () => queryClient.invalidateQueries({ queryKey: ["confessions"] })
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
