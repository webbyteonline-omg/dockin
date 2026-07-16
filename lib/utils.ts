import type { EventType, ExpenseCategory } from "./supabase/types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Casual Gen-Z "what they're up to" flavor text — no real status data exists
 * in the DB, so this is deterministic per user id (same friend always shows
 * the same vibe within a session) rather than random/fabricated per render. */
const VIBE_STATUSES = [
  "down for FIFA",
  "library grind",
  "gym then mess",
  "exam mode 💀",
  "chai break ☕",
  "netflix & ignore",
  "assignment hell",
  "touch grass rn",
];

export function vibeStatus(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return VIBE_STATUSES[hash % VIBE_STATUSES.length]!;
}

const IST_TZ = "Asia/Kolkata";

/** Today's date in IST as YYYY-MM-DD (all dates stored as dates, displayed IST). */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nowIST(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: IST_TZ }));
}

/** Format YYYY-MM-DD → "Mon, 12 Aug" (IST-safe, no TZ drift). */
export function formatDate(isoDate: string, opts?: { withYear?: boolean }): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(opts?.withYear ? { year: "numeric" } : {}),
  }).format(date);
}

/** Whole days from today (IST) to the given date. 0 = today, negative = past. */
export function daysUntil(isoDate: string): number {
  const [y1, m1, d1] = todayIST().split("-").map(Number);
  const [y2, m2, d2] = isoDate.split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

export function daysLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days} days`;
}

export function greeting(): string {
  const h = nowIST().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** ₹ formatting — Indian digit grouping. */
export function formatINR(amount: number, opts?: { decimals?: boolean }): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.decimals ? 2 : 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function attendancePercent(attended: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((attended / total) * 1000) / 10;
}

export type AttendanceHealth = "good" | "warning" | "danger";

export function attendanceHealth(
  attended: number,
  total: number,
  required: number
): AttendanceHealth {
  const pct = attendancePercent(attended, total);
  if (pct >= required + 5) return "good";
  if (pct >= required) return "warning";
  return "danger";
}

/**
 * Bunk calculator.
 * - canMiss: classes you can skip while staying >= required%
 * - toReach(target): consecutive classes to attend to reach target%
 */
export function bunkStats(attended: number, total: number, required: number) {
  const pct = attendancePercent(attended, total);

  // attended / (total + x) >= required/100  →  x <= attended*100/required - total
  const canMiss =
    total === 0 ? 0 : Math.max(0, Math.floor((attended * 100) / required - total));

  const toReach = (target: number): number => {
    if (total === 0) return 0;
    if (attendancePercent(attended, total) >= target) return 0;
    // (attended + x) / (total + x) >= target/100
    // x >= (target*total - 100*attended) / (100 - target)
    if (target >= 100) return Number.POSITIVE_INFINITY;
    return Math.max(0, Math.ceil((target * total - 100 * attended) / (100 - target)));
  };

  return { pct, canMiss, toReach };
}

export const EVENT_TYPE_META: Record<
  EventType,
  { label: string; color: string; dim: string; emoji: string }
> = {
  exam: { label: "Exam", color: "#FF5C5C", dim: "#FF5C5C26", emoji: "📝" },
  quiz: { label: "Quiz", color: "#FFB347", dim: "#FFB34726", emoji: "❓" },
  assignment: { label: "Assignment", color: "#FF6B35", dim: "#FF6B3526", emoji: "📌" },
  holiday: { label: "Holiday", color: "#2FE0A3", dim: "#2FE0A326", emoji: "🌴" },
  other: { label: "Other", color: "#8888A0", dim: "#8888A026", emoji: "📅" },
};

export const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; color: string; emoji: string }
> = {
  food: { label: "Food", color: "#FF2D78", emoji: "🍔" },
  travel: { label: "Travel", color: "#FF6B35", emoji: "🚕" },
  shopping: { label: "Shopping", color: "#FFB347", emoji: "🛍️" },
  bills: { label: "Bills", color: "#2FE0A3", emoji: "🧾" },
  education: { label: "Education", color: "#4FACFE", emoji: "📚" },
  health: { label: "Health", color: "#FF5C5C", emoji: "💊" },
  entertainment: { label: "Fun", color: "#FF2D78", emoji: "🎬" },
  others: { label: "Others", color: "#8888A0", emoji: "📦" },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

export const SUBJECT_COLORS = [
  "#FF6B35",
  "#FF2D78",
  "#2FE0A3",
  "#FFB347",
  "#4FACFE",
  "#FF7A3D",
] as const;

/** Monday of the current week in IST, as YYYY-MM-DD. */
export function weekStartIST(): string {
  const [y, m, d] = todayIST().split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  const dow = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dow);
  return date.toISOString().slice(0, 10);
}

/** ISO date N days before today (IST). */
export function daysAgoIST(days: number): string {
  const [y, m, d] = todayIST().split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) - days));
  return date.toISOString().slice(0, 10);
}

export function monthLabel(month: number, year: number): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 15))
  );
}

/** Convert a base64 URL-safe VAPID key to Uint8Array for pushManager.subscribe. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) return;
  const first = rows[0];
  if (!first) return;
  const headers = Object.keys(first);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
