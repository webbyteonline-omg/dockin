"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { useAuthStore } from "@/store/authStore";
import type {
  Assignment,
  AssignmentStatus,
  Quiz,
  QuizStatus,
  Exam,
  ExamStatus,
  ExamType,
} from "@/lib/supabase/types";

export const academicWorkKeys = {
  assignments: ["assignments"] as const,
  quizzes: ["quizzes"] as const,
  exams: ["exams"] as const,
};

const ASSIGNMENT_COLUMNS =
  "id,user_id,subject_id,title,description,due_date,status,score,max_score,submitted_at,created_at";
const QUIZ_COLUMNS = "id,user_id,subject_id,title,syllabus,date,status,score,max_score,created_at";
const EXAM_COLUMNS =
  "id,user_id,subject_id,title,exam_type,date,syllabus,status,score,max_score,created_at";

// =========================================================
// Assignments
// =========================================================
export function useAssignments() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: academicWorkKeys.assignments,
    enabled: !!user,
    queryFn: async (): Promise<Assignment[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("assignments")
        .select(ASSIGNMENT_COLUMNS)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface AssignmentInput {
  title: string;
  description: string | null;
  due_date: string;
  subject_id: string | null;
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: AssignmentInput) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("assignments")
        .insert({ ...input, user_id: user.id, status: "pending" as AssignmentStatus });
      if (error) {
        // Logged at the source too (not just the form's catch block) so a
        // failure anywhere this hook is used — not just this one modal —
        // shows the real Postgres error (RLS denial, missing table/column,
        // check-constraint violation) in devtools.
        console.error("assignments insert error:", error);
        throw error;
      }
      logActivity("assignment_added", "assignment", { newValue: { title: input.title } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.assignments }),
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      score,
      max_score,
    }: {
      id: string;
      status: AssignmentStatus;
      score?: number | null;
      max_score?: number | null;
    }) => {
      const supabase = getSupabaseBrowser();
      const patch: Partial<Assignment> = { status };
      if (status === "submitted" || status === "graded") patch.submitted_at = new Date().toISOString();
      if (score !== undefined) patch.score = score;
      if (max_score !== undefined) patch.max_score = max_score;
      const { error } = await supabase.from("assignments").update(patch).eq("id", id);
      if (error) throw error;
      logActivity("assignment_updated", "assignment", { entityId: id, newValue: { status } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.assignments }),
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
      logActivity("assignment_deleted", "assignment", { entityId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.assignments }),
  });
}

// =========================================================
// Quizzes
// =========================================================
export function useQuizzes() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: academicWorkKeys.quizzes,
    enabled: !!user,
    queryFn: async (): Promise<Quiz[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("quizzes")
        .select(QUIZ_COLUMNS)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface QuizInput {
  title: string;
  syllabus: string | null;
  date: string;
  subject_id: string | null;
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: QuizInput) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("quizzes")
        .insert({ ...input, user_id: user.id, status: "upcoming" as QuizStatus });
      if (error) {
        console.error("quizzes insert error:", error);
        throw error;
      }
      logActivity("quiz_added", "quiz", { newValue: { title: input.title } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.quizzes }),
  });
}

export function useUpdateQuizStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      score,
      max_score,
    }: {
      id: string;
      status: QuizStatus;
      score?: number | null;
      max_score?: number | null;
    }) => {
      const supabase = getSupabaseBrowser();
      const patch: Partial<Quiz> = { status };
      if (score !== undefined) patch.score = score;
      if (max_score !== undefined) patch.max_score = max_score;
      const { error } = await supabase.from("quizzes").update(patch).eq("id", id);
      if (error) throw error;
      logActivity("quiz_updated", "quiz", { entityId: id, newValue: { status } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.quizzes }),
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
      logActivity("quiz_deleted", "quiz", { entityId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.quizzes }),
  });
}

// =========================================================
// Exams
// =========================================================
export function useExams() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: academicWorkKeys.exams,
    enabled: !!user,
    queryFn: async (): Promise<Exam[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("exams")
        .select(EXAM_COLUMNS)
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface ExamInput {
  title: string;
  exam_type: ExamType;
  date: string;
  syllabus: string | null;
  subject_id: string | null;
}

export function useCreateExam() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: ExamInput) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("exams")
        .insert({ ...input, user_id: user.id, status: "upcoming" as ExamStatus });
      if (error) {
        console.error("exams insert error:", error);
        throw error;
      }
      logActivity("exam_added", "exam", { newValue: { title: input.title } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.exams }),
  });
}

export function useUpdateExamStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      score,
      max_score,
    }: {
      id: string;
      status: ExamStatus;
      score?: number | null;
      max_score?: number | null;
    }) => {
      const supabase = getSupabaseBrowser();
      const patch: Partial<Exam> = { status };
      if (score !== undefined) patch.score = score;
      if (max_score !== undefined) patch.max_score = max_score;
      const { error } = await supabase.from("exams").update(patch).eq("id", id);
      if (error) throw error;
      logActivity("exam_updated", "exam", { entityId: id, newValue: { status } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.exams }),
  });
}

export function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
      logActivity("exam_deleted", "exam", { entityId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicWorkKeys.exams }),
  });
}
