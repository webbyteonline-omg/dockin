"use client";

import { getSupabaseBrowser } from "./supabase/client";
import { useAuthStore } from "@/store/authStore";

export type ActivityAction =
  | "attendance_marked"
  | "expense_added"
  | "expense_deleted"
  | "income_added"
  | "subject_created"
  | "subject_updated"
  | "subject_deleted"
  | "event_added"
  | "event_deleted"
  | "events_imported"
  | "budget_changed"
  | "friend_added"
  | "friend_removed"
  | "friend_request_sent"
  | "poll_created"
  | "poll_voted"
  | "checkin"
  | "rate_limit_hit"
  | "assignment_added"
  | "assignment_updated"
  | "assignment_deleted"
  | "quiz_added"
  | "quiz_updated"
  | "quiz_deleted"
  | "exam_added"
  | "exam_updated"
  | "exam_deleted"
  | "group_created"
  | "group_updated"
  | "group_deleted"
  | "group_member_added"
  | "group_member_removed"
  | "group_member_role_changed"
  | "group_joined"
  | "group_left";

export const ACTIVITY_META: Record<ActivityAction, { emoji: string; label: string }> = {
  attendance_marked: { emoji: "✅", label: "Attendance" },
  expense_added: { emoji: "💸", label: "Expense" },
  expense_deleted: { emoji: "🗑️", label: "Expense" },
  income_added: { emoji: "💰", label: "Income" },
  subject_created: { emoji: "📚", label: "Subject" },
  subject_updated: { emoji: "✏️", label: "Subject" },
  subject_deleted: { emoji: "🗑️", label: "Subject" },
  event_added: { emoji: "📅", label: "Event" },
  event_deleted: { emoji: "🗑️", label: "Event" },
  events_imported: { emoji: "📥", label: "Calendar import" },
  budget_changed: { emoji: "🎯", label: "Budget" },
  friend_added: { emoji: "👥", label: "Friends" },
  friend_removed: { emoji: "👋", label: "Friends" },
  friend_request_sent: { emoji: "📨", label: "Friends" },
  poll_created: { emoji: "🗳️", label: "Poll" },
  poll_voted: { emoji: "🗳️", label: "Poll" },
  checkin: { emoji: "📝", label: "Check-in" },
  rate_limit_hit: { emoji: "🚫", label: "Rate limit" },
  assignment_added: { emoji: "📄", label: "Assignment" },
  assignment_updated: { emoji: "✏️", label: "Assignment" },
  assignment_deleted: { emoji: "🗑️", label: "Assignment" },
  quiz_added: { emoji: "❓", label: "Quiz" },
  quiz_updated: { emoji: "✏️", label: "Quiz" },
  quiz_deleted: { emoji: "🗑️", label: "Quiz" },
  exam_added: { emoji: "🧾", label: "Exam" },
  exam_updated: { emoji: "✏️", label: "Exam" },
  exam_deleted: { emoji: "🗑️", label: "Exam" },
  group_created: { emoji: "👥", label: "Group" },
  group_updated: { emoji: "✏️", label: "Group" },
  group_deleted: { emoji: "🗑️", label: "Group" },
  group_member_added: { emoji: "➕", label: "Group" },
  group_member_removed: { emoji: "➖", label: "Group" },
  group_member_role_changed: { emoji: "👑", label: "Group" },
  group_joined: { emoji: "🎉", label: "Group" },
  group_left: { emoji: "👋", label: "Group" },
};

/**
 * Fire-and-forget audit logging. Never throws, never blocks the main flow.
 * Logs are immutable server-side (no update/delete RLS policies).
 */
export function logActivity(
  action: ActivityAction,
  entityType: string,
  detail?: {
    entityId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  }
): void {
  const user = useAuthStore.getState().user;
  if (!user) return;
  const supabase = getSupabaseBrowser();
  void supabase
    .from("activity_logs")
    .insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: detail?.entityId ?? null,
      old_value: detail?.oldValue ?? null,
      new_value: detail?.newValue ?? null,
    })
    .then(() => undefined);
}
