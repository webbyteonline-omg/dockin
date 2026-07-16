"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isNetworkError, queueInsert } from "@/lib/outbox";
import { logActivity } from "@/lib/activityLog";
import { todayIST } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { AttendanceLog, AttendanceStatus, Subject } from "@/lib/supabase/types";

export const attendanceKeys = {
  subjects: ["subjects"] as const,
  subject: (id: string) => ["subjects", id] as const,
  logs: (subjectId: string, month: string) => ["attendance-logs", subjectId, month] as const,
};

export function useSubjects() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: attendanceKeys.subjects,
    enabled: !!user,
    queryFn: async (): Promise<Subject[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("subjects")
        .select(
          "id,user_id,name,color,total_classes,attended_classes,required_percentage,created_at"
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSubject(id: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: attendanceKeys.subject(id),
    enabled: !!user && !!id,
    queryFn: async (): Promise<Subject | null> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("subjects")
        .select(
          "id,user_id,name,color,total_classes,attended_classes,required_percentage,created_at"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Attendance logs for a subject in a given month ("YYYY-MM"). */
export function useAttendanceLogs(subjectId: string, month: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: attendanceKeys.logs(subjectId, month),
    enabled: !!user && !!subjectId,
    queryFn: async (): Promise<AttendanceLog[]> => {
      const supabase = getSupabaseBrowser();
      const start = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const end = new Date(Date.UTC(y ?? 2026, m ?? 1, 0)).getUTCDate();
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("id,user_id,subject_id,date,status,created_at")
        .eq("subject_id", subjectId)
        .gte("date", start)
        .lte("date", `${month}-${String(end).padStart(2, "0")}`)
        .order("date");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: { name: string; color: string; required_percentage: number }) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("subjects")
        .insert({ ...input, user_id: user.id });
      if (error) throw error;
      logActivity("subject_created", "subject", { newValue: { name: input.name } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.subjects }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<Pick<Subject, "name" | "color" | "required_percentage">>) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("subjects").update(updates).eq("id", id);
      if (error) throw error;
      logActivity("subject_updated", "subject", { entityId: id, newValue: { ...updates } });
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.subjects });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.subject(vars.id) });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
      logActivity("subject_deleted", "subject", { entityId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.subjects }),
  });
}

/**
 * Mark today's class present/absent: updates counters (optimistically) and
 * writes an attendance_logs row. Works offline via the outbox.
 */
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ subject, status }: { subject: Subject; status: AttendanceStatus }) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const updates = {
        total_classes: subject.total_classes + 1,
        attended_classes: subject.attended_classes + (status === "present" ? 1 : 0),
      };
      const log = {
        user_id: user.id,
        subject_id: subject.id,
        date: todayIST(),
        status,
      };

      try {
        const { error: e1 } = await supabase
          .from("subjects")
          .update(updates)
          .eq("id", subject.id);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("attendance_logs").insert(log);
        if (e2) throw e2;
        logActivity("attendance_marked", "attendance_log", {
          entityId: subject.id,
          newValue: { status, subject: subject.name },
        });
      } catch (err) {
        if (isNetworkError(err)) {
          // Queue the log for background sync; counters will refetch on reconnect.
          await queueInsert("attendance_logs", log);
          return;
        }
        throw err;
      }
    },
    onMutate: async ({ subject, status }) => {
      await queryClient.cancelQueries({ queryKey: attendanceKeys.subjects });
      const previous = queryClient.getQueryData<Subject[]>(attendanceKeys.subjects);
      queryClient.setQueryData<Subject[]>(attendanceKeys.subjects, (old) =>
        (old ?? []).map((s) =>
          s.id === subject.id
            ? {
                ...s,
                total_classes: s.total_classes + 1,
                attended_classes: s.attended_classes + (status === "present" ? 1 : 0),
              }
            : s
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(attendanceKeys.subjects, context.previous);
      }
    },
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.subjects });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.subject(vars.subject.id) });
      queryClient.invalidateQueries({ queryKey: ["attendance-logs", vars.subject.id] });
    },
  });
}
