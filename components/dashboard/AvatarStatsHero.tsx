"use client";

import Link from "next/link";
import { AvatarViewer } from "@/components/dashboard/AvatarViewer";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyStreak } from "@/hooks/useStreak";
import { useFriends } from "@/hooks/useFriends";
import { useSentSnapCount } from "@/hooks/useSnaps";
import { useSubjects } from "@/hooks/useAttendance";
import { attendancePercent } from "@/lib/utils";

/**
 * Home screen centerpiece: the user's customizable 3D avatar, with real
 * stats (attendance, streak, friends, snaps) stacked directly below it.
 * Every number here comes from a real query — nothing fabricated.
 */
export function AvatarStatsHero() {
  const { data: profile } = useMyProfile();
  const { data: streak = 0 } = useMyStreak();
  const { data: friends = [] } = useFriends();
  const { data: snapCount = 0 } = useSentSnapCount();
  const { data: subjects = [] } = useSubjects();

  const totals = subjects.reduce(
    (acc, s) => ({ attended: acc.attended + s.attended_classes, total: acc.total + s.total_classes }),
    { attended: 0, total: 0 }
  );
  const attendancePct = totals.total > 0 ? `${attendancePercent(totals.attended, totals.total)}%` : "—";

  return (
    <div className="px-5 pt-2 pb-5 flex flex-col items-center">
      <AvatarViewer modelUrl={profile?.avatar_url_3d} size={200} />

      <div className="grid grid-cols-4 gap-2 w-full mt-5">
        <Link href="/attendance" className="bg-[#14121C] rounded-btn px-2 py-3 text-center">
          <div className="text-base font-extrabold text-white">{attendancePct}</div>
          <div className="text-[9.5px] font-bold text-white/50 tracking-wide mt-0.5">ATTENDANCE</div>
        </Link>
        <div className="dockin-gradient rounded-btn px-2 py-3 text-center">
          <div className="text-base font-extrabold text-white">{streak}{streak > 0 ? " 🔥" : ""}</div>
          <div className="text-[9.5px] font-bold text-white/70 tracking-wide mt-0.5">STREAK</div>
        </div>
        <Link href="/friends" className="flat-card-plain rounded-btn px-2 py-3 text-center">
          <div className="text-base font-extrabold text-ink">{friends.length}</div>
          <div className="text-[9.5px] font-bold text-ink-faint tracking-wide mt-0.5">FRIENDS</div>
        </Link>
        <Link href="/profile" className="flat-card-plain rounded-btn px-2 py-3 text-center">
          <div className="text-base font-extrabold text-ink">{snapCount}</div>
          <div className="text-[9.5px] font-bold text-ink-faint tracking-wide mt-0.5">SNAPS</div>
        </Link>
      </div>
    </div>
  );
}
