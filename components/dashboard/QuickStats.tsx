"use client";

import Link from "next/link";
import { useSubjects } from "@/hooks/useAttendance";
import { attendancePercent } from "@/lib/utils";

/** Two stat tiles: overall attendance % (dark tile) and streak (gradient tile) — replaces the mockup's CGPA/Wallet pair, since Finance is out of scope. */
export function QuickStats() {
  const { data: subjects } = useSubjects();

  const totals = (subjects ?? []).reduce(
    (acc, s) => ({ attended: acc.attended + s.attended_classes, total: acc.total + s.total_classes }),
    { attended: 0, total: 0 }
  );
  const pct = attendancePercent(totals.attended, totals.total);

  return (
    <div className="px-5 pb-[110px] flex gap-2.5">
      <Link href="/attendance" className="flex-1 bg-[#14121C] rounded-btn px-3.5 py-3">
        <div className="text-[10.5px] font-bold text-white/50 tracking-wide">ATTENDANCE</div>
        <div className="text-base font-extrabold text-white mt-0.5">{totals.total > 0 ? `${pct}%` : "—"}</div>
      </Link>
      <Link href="/profile" className="flex-1 dockin-gradient rounded-btn px-3.5 py-3">
        <div className="text-[10.5px] font-bold text-white/70 tracking-wide">STREAK</div>
        <div className="text-base font-extrabold text-white mt-0.5">42 🔥</div>
      </Link>
    </div>
  );
}
