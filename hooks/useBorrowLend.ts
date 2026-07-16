"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { todayIST } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { BorrowLend, BorrowLendType } from "@/lib/supabase/types";

export function useBorrowLend() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["borrow-lend"],
    enabled: !!user,
    queryFn: async (): Promise<BorrowLend[]> => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("borrow_lend")
        .select(
          "id,user_id,type,person_name,person_user_id,amount,reason,date,due_date,status,settled_at,notified_overdue,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export interface BorrowLendSummary {
  toReceive: number;
  toPay: number;
  net: number;
  pendingCount: number;
}

export function summarize(entries: BorrowLend[]): BorrowLendSummary {
  const pending = entries.filter((e) => e.status === "pending");
  const toReceive = pending
    .filter((e) => e.type === "lent")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const toPay = pending
    .filter((e) => e.type === "borrowed")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  return { toReceive, toPay, net: toReceive - toPay, pendingCount: pending.length };
}

export function isOverdue(entry: BorrowLend): boolean {
  return entry.status === "pending" && !!entry.due_date && entry.due_date < todayIST();
}

export function useAddBorrowLend() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: {
      type: BorrowLendType;
      person_name: string;
      person_user_id: string | null;
      amount: number;
      reason: string | null;
      due_date: string | null;
    }) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("borrow_lend").insert({
        ...input,
        user_id: user!.id,
        date: todayIST(),
      });
      if (error) throw error;
      logActivity("expense_added", "borrow_lend", {
        newValue: { amount: input.amount, merchant: input.person_name },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["borrow-lend"] }),
  });
}

export function useSettle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("borrow_lend")
        .update({ status: "settled", settled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["borrow-lend"] }),
  });
}

export function useDeleteBorrowLend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("borrow_lend").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["borrow-lend"] }),
  });
}
