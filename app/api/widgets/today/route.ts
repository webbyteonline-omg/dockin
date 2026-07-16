import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { attendancePercent, formatINR, nowIST, todayIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Data feed for the "DockIn Today" PWA widget (adaptive card template at
 * /widgets/pulse-today.json). Uses the session cookie; returns placeholders
 * when signed out so the widget never breaks.
 */
export async function GET() {
  const fallback = {
    attendance: "—",
    todaySpend: "₹0",
    nextClass: "Open DockIn to set up",
    pulseScore: 0,
    warningSubject: "",
  };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(fallback);

  const today = todayIST();
  const dow = nowIST().getDay();
  const nowMinutes = nowIST().getHours() * 60 + nowIST().getMinutes();

  const [{ data: subjects }, { data: expenses }, { data: slots }, { data: profile }] =
    await Promise.all([
      supabase.from("subjects").select("id,name,total_classes,attended_classes,required_percentage"),
      supabase.from("expenses").select("amount").eq("transaction_type", "expense").eq("date", today),
      supabase.from("timetable_slots").select("*").eq("day_of_week", dow).order("start_time"),
      supabase.from("user_profiles").select("pulse_score").eq("id", user.id).maybeSingle(),
    ]);

  const tracked = (subjects ?? []).filter((s) => s.total_classes > 0);
  const avg =
    tracked.length > 0
      ? Math.round(
          tracked.reduce(
            (sum, s) => sum + attendancePercent(s.attended_classes, s.total_classes),
            0
          ) / tracked.length
        )
      : null;

  const todaySpend = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  const subjectById = new Map((subjects ?? []).map((s) => [s.id, s]));
  const nextSlot = (slots ?? []).find((slot) => {
    const [h, m] = slot.start_time.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0) > nowMinutes;
  });
  const nextClass = nextSlot
    ? `${subjectById.get(nextSlot.subject_id)?.name ?? "Class"} - ${formatTime(nextSlot.start_time)}`
    : "No more classes today";

  const warning = tracked
    .map((s) => ({ name: s.name, pct: attendancePercent(s.attended_classes, s.total_classes), req: s.required_percentage }))
    .filter((s) => s.pct < s.req)
    .sort((a, b) => a.pct - b.pct)[0];

  return NextResponse.json({
    attendance: avg !== null ? `${avg}%` : "—",
    todaySpend: formatINR(todaySpend),
    nextClass,
    pulseScore: profile?.pulse_score ?? 0,
    warningSubject: warning ? `${warning.name} (${Math.round(warning.pct)}%)` : "",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}
