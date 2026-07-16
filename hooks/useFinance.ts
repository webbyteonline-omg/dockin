"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isNetworkError, queueInsert } from "@/lib/outbox";
import { logActivity } from "@/lib/activityLog";
import { isRateLimitError } from "./useFriends";
import { useAuthStore } from "@/store/authStore";
import type { Budget, Expense, ExpenseCategory, ExpenseSource } from "@/lib/supabase/types";

export const financeKeys = {
  expenses: (month: number, year: number) => ["expenses", year, month] as const,
  allExpenses: ["expenses"] as const,
  budgets: (month: number, year: number) => ["budgets", year, month] as const,
};

function monthRange(month: number, year: number): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export function useExpenses(month: number, year: number) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: financeKeys.expenses(month, year),
    enabled: !!user,
    queryFn: async (): Promise<Expense[]> => {
      const supabase = getSupabaseBrowser();
      const { start, end } = monthRange(month, year);
      const { data, error } = await supabase
        .from("expenses")
        .select("id,user_id,amount,merchant,category,note,date,source,transaction_type,created_at")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllExpenses() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: [...financeKeys.allExpenses, "all"],
    enabled: !!user,
    queryFn: async (): Promise<Expense[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("expenses")
        .select("id,user_id,amount,merchant,category,note,date,source,transaction_type,created_at")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useBudgets(month: number, year: number) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: financeKeys.budgets(month, year),
    enabled: !!user,
    queryFn: async (): Promise<Budget[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("budgets")
        .select("id,user_id,month,year,category,amount")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });
}

export interface AddExpenseInput {
  amount: number;
  category: ExpenseCategory;
  merchant: string | null;
  note: string | null;
  date: string;
  source: ExpenseSource;
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: AddExpenseInput) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const row = { transaction_type: "expense" as const, ...input, user_id: user.id };
      try {
        const { error } = await supabase.from("expenses").insert(row);
        if (error) throw new Error(isRateLimitError(error) ?? error.message);
        logActivity("expense_added", "expense", {
          newValue: { amount: input.amount, merchant: input.merchant ?? undefined },
        });
      } catch (err) {
        if (isNetworkError(err)) {
          await queueInsert("expenses", row, `Expense ₹${input.amount}`);
          return;
        }
        throw err;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.allExpenses }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      logActivity("expense_deleted", "expense", { entityId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.allExpenses }),
  });
}

export function useSetBudget(month: number, year: number) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async ({ category, amount }: { category: string; amount: number }) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("budgets")
        .upsert(
          { user_id: user.id, month, year, category, amount },
          { onConflict: "user_id,month,year,category" }
        );
      if (error) throw error;
      logActivity("budget_changed", "budget", { newValue: { category, amount } });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: financeKeys.budgets(month, year) }),
  });
}
