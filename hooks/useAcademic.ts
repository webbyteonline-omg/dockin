"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { useAuthStore } from "@/store/authStore";
import type { AcademicEvent, EventType } from "@/lib/supabase/types";
import type { ParsedCalendarEvent } from "@/lib/schemas";

export const academicKeys = {
  events: ["academic-events"] as const,
};

export function useEvents() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: academicKeys.events,
    enabled: !!user,
    queryFn: async (): Promise<AcademicEvent[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("academic_events")
        .select(
          "id,user_id,title,event_type,date,description,subject_id,notified_3day,notified_1day,created_at"
        )
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface EventInput {
  title: string;
  event_type: EventType;
  date: string;
  subject_id: string | null;
  description: string | null;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: EventInput) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("academic_events")
        .insert({ ...input, user_id: user.id });
      if (error) throw error;
      logActivity("event_added", "academic_event", { newValue: { title: input.title } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicKeys.events }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("academic_events").delete().eq("id", id);
      if (error) throw error;
      logActivity("event_deleted", "academic_event", { entityId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicKeys.events }),
  });
}

/** Bulk import events parsed from an academic calendar PDF. */
export function useImportEvents() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (events: ParsedCalendarEvent[]) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const rows = events.map((e) => ({
        user_id: user.id,
        title: e.title,
        event_type: e.type,
        date: e.date,
        description: e.description ?? null,
        subject_id: null,
      }));
      // Insert in chunks of 100 to stay under payload limits
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from("academic_events").insert(rows.slice(i, i + 100));
        if (error) throw error;
      }
      logActivity("events_imported", "academic_event", { newValue: { count: rows.length } });
      return rows.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicKeys.events }),
  });
}
