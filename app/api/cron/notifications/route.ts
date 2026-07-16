import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendPushToUser, type PushPayload } from "@/lib/notifications/webpush";
import { sendDigestEmail, type NotificationItem } from "@/lib/notifications/email";
import { computePulseScore } from "@/lib/pulseScore";
import { attendancePercent, formatDate, nowIST, todayIST, weekStartIST } from "@/lib/utils";
import type { EventType } from "@/lib/supabase/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function addDaysIST(days: number): string {
  const [y, m, d] = todayIST().split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + days));
  return date.toISOString().slice(0, 10);
}

const EVENT_EMOJI: Record<EventType, string> = {
  exam: "📝",
  quiz: "❓",
  assignment: "📌",
  holiday: "🌴",
  other: "📅",
};

/**
 * Daily notification cron (Vercel: 2:30 UTC = 8:00 AM IST).
 * For every user: events in 3 days / tomorrow, subjects below 76%,
 * budgets at 80%+. Sends push + email, marks notified flags.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const in1 = addDaysIST(1);
  const in3 = addDaysIST(3);
  const today = todayIST();

  // ---- Gather everything in bulk ------------------------------------------
  const [{ data: events3 }, { data: events1 }, { data: subjects }] = await Promise.all([
    admin.from("academic_events").select("*").eq("date", in3).eq("notified_3day", false),
    admin.from("academic_events").select("*").eq("date", in1).eq("notified_1day", false),
    admin.from("subjects").select("*").gt("total_classes", 0),
  ]);

  // Per-user notification items
  const itemsByUser = new Map<string, NotificationItem[]>();
  const pushByUser = new Map<string, PushPayload[]>();

  const add = (userId: string, item: NotificationItem, push: PushPayload) => {
    itemsByUser.set(userId, [...(itemsByUser.get(userId) ?? []), item]);
    pushByUser.set(userId, [...(pushByUser.get(userId) ?? []), push]);
  };

  // ---- Events: 3 days out --------------------------------------------------
  for (const event of events3 ?? []) {
    const type = event.event_type ?? "other";
    add(
      event.user_id,
      {
        emoji: EVENT_EMOJI[type],
        title: `${event.title} in 3 days`,
        detail: formatDate(event.date, { withYear: true }),
      },
      {
        title: `${EVENT_EMOJI[type]} ${event.title} — 3 days to go`,
        body: `On ${formatDate(event.date)}. Time to start preparing.`,
        url: "/academic",
        tag: `event-3d-${event.id}`,
      }
    );
  }

  // ---- Events: tomorrow ----------------------------------------------------
  for (const event of events1 ?? []) {
    const type = event.event_type ?? "other";
    const isHoliday = type === "holiday";
    add(
      event.user_id,
      {
        emoji: EVENT_EMOJI[type],
        title: isHoliday ? `Holiday tomorrow — ${event.title}` : `${event.title} is tomorrow`,
        detail: formatDate(event.date, { withYear: true }),
      },
      {
        title: isHoliday
          ? `🌴 Holiday tomorrow — ${event.title}`
          : `⏰ Tomorrow: ${event.title}`,
        body: isHoliday ? "Enjoy the day off!" : "Last day to prepare — you've got this.",
        url: "/academic",
        tag: `event-1d-${event.id}`,
      }
    );
  }

  // ---- Attendance below 76% -----------------------------------------------
  for (const subject of subjects ?? []) {
    const pct = attendancePercent(subject.attended_classes, subject.total_classes);
    if (pct < 76) {
      add(
        subject.user_id,
        {
          emoji: "⚠️",
          title: `${subject.name} at ${pct}%`,
          detail: `Below the ${subject.required_percentage}% requirement — attend the next classes.`,
        },
        {
          title: `⚠️ ${subject.name} attendance at ${pct}%`,
          body: "Attend your next classes to stay safe.",
          url: `/attendance/${subject.id}`,
          tag: `att-${subject.id}`,
        }
      );
    }
  }

  // ---- Send push + email per user -------------------------------------------
  const userIds = [...new Set([...itemsByUser.keys()])];
  let pushCount = 0;
  let emailCount = 0;

  for (const userId of userIds) {
    const pushes = pushByUser.get(userId) ?? [];
    for (const payload of pushes) {
      await sendPushToUser(admin, userId, payload);
      pushCount++;
    }

    const items = itemsByUser.get(userId) ?? [];
    if (items.length > 0) {
      const { data: userRes } = await admin.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      const name =
        ((userRes?.user?.user_metadata as { name?: string } | null)?.name ?? "there");
      if (email) {
        await sendDigestEmail(email, name, items);
        emailCount++;
      }
    }
  }

  // ---- Mark notified flags ----------------------------------------------------
  const ids3 = (events3 ?? []).map((e) => e.id);
  const ids1 = (events1 ?? []).map((e) => e.id);
  if (ids3.length > 0) {
    await admin.from("academic_events").update({ notified_3day: true }).in("id", ids3);
  }
  if (ids1.length > 0) {
    await admin.from("academic_events").update({ notified_1day: true }).in("id", ids1);
  }

  // ---- Daily pulse score for every user ----------------------------------------
  const scoresWritten = await computeDailyPulseScores();

  // ---- Monday: archive last week's leaderboard champions ------------------------
  const isMonday = nowIST().getDay() === 1;
  if (isMonday) {
    await archiveLeaderboardChampions();
  }

  // ---- Housekeeping --------------------------------------------------------------
  await admin.rpc("cleanup_rate_limits");

  return NextResponse.json({
    ok: true,
    users: userIds.length,
    pushes: pushCount,
    emails: emailCount,
    events3: ids3.length,
    events1: ids1.length,
    pulseScores: scoresWritten,
    leaderboardReset: isMonday,
  });
}

/** Compute + persist today's pulse score for every user (canonical record). */
async function computeDailyPulseScores(): Promise<number> {
  const admin = getSupabaseAdmin();
  const today = todayIST();
  const now = nowIST();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${year}-${mm}-01`;
  const monthEnd = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const weekStart = weekStartIST();

  const [{ data: allStats }, { data: allSubjects }, { data: allExpenses }, { data: allBudgets }, { data: allCheckins }] =
    await Promise.all([
      admin.from("user_stats").select("*"),
      admin.from("subjects").select("*"),
      admin.from("expenses").select("*").eq("transaction_type", "expense").gte("date", monthStart).lte("date", monthEnd),
      admin.from("budgets").select("*").eq("month", month).eq("year", year),
      admin.from("daily_checkins").select("*").gte("date", weekStart),
    ]);

  const group = <T extends { user_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) {
      const list = map.get(row.user_id) ?? [];
      list.push(row);
      map.set(row.user_id, list);
    }
    return map;
  };
  const subjectsBy = group(allSubjects);
  const expensesBy = group(allExpenses);
  const budgetsBy = group(allBudgets);
  const checkinsBy = group(allCheckins);

  let written = 0;
  for (const stats of allStats ?? []) {
    const breakdown = computePulseScore({
      subjects: subjectsBy.get(stats.user_id) ?? [],
      monthExpenses: expensesBy.get(stats.user_id) ?? [],
      monthBudgets: budgetsBy.get(stats.user_id) ?? [],
      weekCheckins: checkinsBy.get(stats.user_id) ?? [],
      streak: stats.streak,
      dayOfMonth: now.getDate(),
      daysInMonth: lastDay,
    });
    await admin.from("pulse_scores").upsert(
      {
        user_id: stats.user_id,
        date: today,
        score: breakdown.total,
        breakdown: {
          attendance: breakdown.attendance,
          finance: breakdown.finance,
          consistency: breakdown.consistency,
          mood: breakdown.mood,
        },
      },
      { onConflict: "user_id,date" }
    );
    await admin
      .from("user_stats")
      .update({ pulse_score: breakdown.total, updated_at: new Date().toISOString() })
      .eq("user_id", stats.user_id);
    await admin
      .from("user_profiles")
      .update({ pulse_score: breakdown.total })
      .eq("id", stats.user_id);
    written++;
  }
  return written;
}

/** Monday reset: store last week's champion per category into leaderboard_history. */
async function archiveLeaderboardChampions(): Promise<void> {
  const admin = getSupabaseAdmin();
  const thisWeek = weekStartIST();
  const lastWeek = new Date(thisWeek);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);
  const lastWeekStart = lastWeek.toISOString().slice(0, 10);

  const { data } = await admin
    .from("user_stats")
    .select("*")
    .eq("week_start", lastWeekStart);
  const stats = data ?? [];
  if (stats.length === 0) return;

  type StatRow = (typeof stats)[number];
  const categories: Array<{ id: string; value: (s: StatRow) => number | null }> = [
    { id: "steps", value: (s) => s.steps_week },
    { id: "attendance", value: (s) => (s.attendance_pct !== null ? Number(s.attendance_pct) : null) },
    { id: "budget", value: (s) => (s.budget_remaining_pct !== null ? Number(s.budget_remaining_pct) : null) },
    { id: "pulse", value: (s) => s.pulse_score },
    { id: "mood", value: (s) => (s.mood_avg_week !== null ? Number(s.mood_avg_week) : null) },
  ];

  for (const category of categories) {
    const ranked = stats
      .map((s) => ({ user_id: s.user_id, value: category.value(s) }))
      .filter((e): e is { user_id: string; value: number } => e.value !== null)
      .sort((a, b) => b.value - a.value);
    const champion = ranked[0];
    if (!champion) continue;
    await admin.from("leaderboard_history").upsert(
      {
        week_start: lastWeekStart,
        category: category.id,
        user_id: champion.user_id,
        value: champion.value,
      },
      { onConflict: "week_start,category,user_id" }
    );
  }
}
