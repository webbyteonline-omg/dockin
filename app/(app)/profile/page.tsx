"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useMyProfile } from "@/hooks/useProfile";
import { useFriends } from "@/hooks/useFriends";
import { useSentSnapCount } from "@/hooks/useSnaps";
import { useSubjects } from "@/hooks/useAttendance";
import { attendancePercent } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const BADGES = [
  { label: "Early Bird", color: "#FF7A3D" },
  { label: "Mess MVP", color: "#FF2D78" },
  { label: "Night Owl", color: "#FF6B35" },
];

export default function ProfilePage() {
  const displayName = useAuthStore((s) => s.displayName());
  const { data: profile } = useMyProfile();
  const { data: friends = [] } = useFriends();
  const { data: snapCount = 0 } = useSentSnapCount();
  const { data: subjects = [] } = useSubjects();

  const name = profile?.display_name ?? displayName;
  const totals = subjects.reduce(
    (acc, s) => ({ attended: acc.attended + s.attended_classes, total: acc.total + s.total_classes }),
    { attended: 0, total: 0 }
  );
  const cgpaEquivalent = totals.total > 0 ? `${attendancePercent(totals.attended, totals.total)}%` : "—";

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <div className="relative h-[190px] dockin-gradient overflow-hidden">
        <Image src="/dockin/campus-sunset.png" alt="" fill className="object-cover opacity-[0.85]" />
        <div className="absolute top-[70px] left-6 text-white/80 text-xl -rotate-[10deg]">✦</div>
        <div className="absolute top-[110px] left-[70px] text-white/60 text-sm rotate-[8deg]">✧</div>
        <Link
          href="/profile/edit"
          className="absolute top-14 right-5 bg-white/90 backdrop-blur-sm text-ink text-xs font-bold px-3.5 py-2 rounded-pill"
        >
          Edit
        </Link>
      </div>

      <div className="relative pt-[150px] px-[22px]">
        <div className="flex items-end gap-3.5">
          <div className="relative w-24 h-24 rounded-[28px] border-4 border-bg shrink-0 -mt-[150px]">
            <Avatar name={name} size={96} shape="square" className="rounded-[24px]" />
            <div className="absolute -bottom-2 -right-2 bg-[#14121C] text-accent text-[10px] font-extrabold px-2 py-1 rounded-pill -rotate-[8deg] border-2 border-bg">
              Lvl 12
            </div>
          </div>
          <div className="pb-1.5">
            <div className="font-display font-extrabold text-[19px] text-ink">{name}</div>
            <div className="text-[12.5px] text-ink-faint mt-0.5">
              @{profile?.username ?? "you"} {profile ? "· CS" : ""}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <div className="flex-1 dockin-gradient-soft rounded-[18px] p-3 text-center">
            <div className="font-display font-extrabold text-lg text-white">42</div>
            <div className="text-[10.5px] font-bold text-white/80 mt-0.5">Streak</div>
            <div className="font-hand font-bold text-white text-[13px] -rotate-3">on fire</div>
          </div>
          <div className="flex-1 flat-card-plain rounded-[18px] p-3 text-center">
            <div className="font-display font-extrabold text-lg text-ink">{friends.length}</div>
            <div className="text-[10.5px] font-bold text-ink-dim mt-0.5">Friends</div>
          </div>
          <div className="flex-1 flat-card-plain rounded-[18px] p-3 text-center">
            <div className="font-display font-extrabold text-lg text-ink">{snapCount}</div>
            <div className="text-[10.5px] font-bold text-ink-dim mt-0.5">Snaps</div>
          </div>
        </div>

        <div className="flex gap-[18px] mt-[18px]">
          {BADGES.map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-1.5">
              <div className="w-[38px] h-[38px] rounded-full" style={{ background: b.color }} />
              <div className="text-[10px] text-ink-dim font-semibold text-center max-w-[50px]">{b.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-[18px] flat-card rounded-card overflow-hidden">
          <Link href="/academic" className="flex items-center gap-3 px-4 py-3.5 border-b-[1.5px] border-line/[0.06]">
            <span className="w-6 h-6 rounded-md bg-primary shrink-0" />
            <span className="flex-1 text-[15px] text-ink">Academics</span>
            <span className="text-sm text-ink-faint">{cgpaEquivalent}</span>
            <ChevronRight className="w-4 h-4 text-ink-faint" />
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-6 h-6 rounded-md bg-[#14121C] shrink-0" />
            <span className="flex-1 text-[15px] text-ink">Settings</span>
            <ChevronRight className="w-4 h-4 text-ink-faint" />
          </Link>
        </div>
      </div>
    </div>
  );
}
