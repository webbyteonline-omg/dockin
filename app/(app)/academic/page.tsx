"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useSubjects } from "@/hooks/useAttendance";
import { useEvents } from "@/hooks/useAcademic";
import { attendancePercent, daysLabel, daysUntil, formatDate, EVENT_TYPE_META } from "@/lib/utils";

export default function AcademicsPage() {
  const router = useRouter();
  const { data: subjects = [] } = useSubjects();
  const { data: events = [] } = useEvents();

  const upcoming = events.filter((e) => daysUntil(e.date) >= 0).slice(0, 6);

  return (
    <div className="min-h-dvh bg-bg px-5">
      <div className="pt-safe flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink -ml-1.5">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
      </div>
      <h1 className="font-display font-extrabold text-2xl text-ink mt-2">Academics</h1>

      <div className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-3 mt-6">Attendance</div>
      {subjects.length === 0 ? (
        <p className="text-sm text-ink-dim">No subjects added yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {subjects.map((s) => {
            const pct = attendancePercent(s.attended_classes, s.total_classes);
            const ok = pct >= s.required_percentage;
            return (
              <div key={s.id} className="flat-card-plain rounded-input px-4 py-3 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{s.name}</div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {s.attended_classes}/{s.total_classes} classes
                  </div>
                </div>
                <div className={`text-base font-extrabold ${ok ? "text-success" : "text-danger"}`}>{pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-3 mt-7">Upcoming</div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-ink-dim pb-8">Nothing coming up — you&apos;re all clear.</p>
      ) : (
        <div className="flex flex-col gap-2 pb-8">
          {upcoming.map((e) => {
            const meta = EVENT_TYPE_META[e.event_type ?? "other"];
            return (
              <div key={e.id} className="flat-card-plain rounded-input px-4 py-3 flex items-center gap-3">
                <span className="text-lg shrink-0">{meta.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{e.title}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{formatDate(e.date)}</div>
                </div>
                <div className="text-xs font-bold" style={{ color: meta.color }}>
                  {daysLabel(daysUntil(e.date))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
