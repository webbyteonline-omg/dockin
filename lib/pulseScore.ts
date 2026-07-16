import { attendancePercent } from "./utils";
import type { Budget, DailyCheckin, Expense, Subject } from "./supabase/types";

export interface PulseBreakdown {
  attendance: number; // /30
  finance: number; // /25
  consistency: number; // /25
  mood: number; // /20
  total: number; // /100
}

// computePulseScore only reads a handful of fields off each row, so callers
// can pass Supabase results selected down to just those columns (cheaper
// queries) instead of the full row type.
type SubjectForScore = Pick<Subject, "total_classes" | "attended_classes">;
type ExpenseForScore = Pick<Expense, "amount">;
type BudgetForScore = Pick<Budget, "amount">;
type CheckinForScore = Pick<DailyCheckin, "mood">;

/** Attendance (30): avg % across subjects. ≥80→30, 75-80→20, 70-75→10, <70→0. */
export function attendanceScore(subjects: SubjectForScore[]): number {
  const tracked = subjects.filter((s) => s.total_classes > 0);
  if (tracked.length === 0) return 0;
  const avg =
    tracked.reduce((sum, s) => sum + attendancePercent(s.attended_classes, s.total_classes), 0) /
    tracked.length;
  if (avg >= 80) return 30;
  if (avg >= 75) return 20;
  if (avg >= 70) return 10;
  return 0;
}

/** Finance (25): spend vs pro-rated budget. Under→25, ≤20% over→15, else 0. */
export function financeScore(expenses: ExpenseForScore[], budgets: BudgetForScore[], dayOfMonth: number, daysInMonth: number): number {
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  if (totalBudget <= 0) return 0;
  const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expected = (totalBudget * dayOfMonth) / daysInMonth;
  if (spent <= expected) return 25;
  if (spent <= expected * 1.2) return 15;
  return 0;
}

/** Consistency (25): daily open/log streak. ≥7→25, 3-6→15, 1-2→5, 0→0. */
export function consistencyScore(streak: number): number {
  if (streak >= 7) return 25;
  if (streak >= 3) return 15;
  if (streak >= 1) return 5;
  return 0;
}

/** Mood (20): weekly average of 1-5 check-ins. ≥4→20, 3-4→12, 2-3→5, <2→0. */
export function moodScore(checkins: CheckinForScore[]): number {
  const moods = checkins.map((c) => c.mood).filter((m): m is number => m !== null);
  if (moods.length === 0) return 0;
  const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
  if (avg >= 4) return 20;
  if (avg >= 3) return 12;
  if (avg >= 2) return 5;
  return 0;
}

export function computePulseScore(input: {
  subjects: SubjectForScore[];
  monthExpenses: ExpenseForScore[];
  monthBudgets: BudgetForScore[];
  weekCheckins: CheckinForScore[];
  streak: number;
  dayOfMonth: number;
  daysInMonth: number;
}): PulseBreakdown {
  const attendance = attendanceScore(input.subjects);
  const finance = financeScore(input.monthExpenses, input.monthBudgets, input.dayOfMonth, input.daysInMonth);
  const consistency = consistencyScore(input.streak);
  const mood = moodScore(input.weekCheckins);
  return { attendance, finance, consistency, mood, total: attendance + finance + consistency + mood };
}

export function scoreColor(score: number): string {
  if (score >= 70) return "#43D98C";
  if (score >= 40) return "#FFB347";
  return "#FF5C5C";
}

export const SCORE_COMPONENTS = [
  { key: "attendance", label: "Attendance", max: 30, emoji: "📚" },
  { key: "finance", label: "Finance", max: 25, emoji: "💰" },
  { key: "consistency", label: "Consistency", max: 25, emoji: "🔥" },
  { key: "mood", label: "Mood", max: 20, emoji: "😊" },
] as const;
