"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { nowIST } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { TimetableSlot } from "@/lib/supabase/types";

export function useTimetable() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["timetable"],
    enabled: !!user,
    queryFn: async (): Promise<TimetableSlot[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id,user_id,day_of_week,start_time,end_time,subject_id,room,created_at")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });
}

/** Today's classes (IST weekday), sorted by start time. */
export function useTodayClasses() {
  const query = useTimetable();
  const todayDow = nowIST().getDay(); // 0=Sun
  return {
    ...query,
    data: (query.data ?? []).filter((s) => s.day_of_week === todayDow),
  };
}

export function useAddSlot() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      subject_id: string;
      room: string | null;
    }) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("timetable_slots")
        .insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetable"] }),
  });
}

export function useDeleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetable"] }),
  });
}
