"use client";

import Link from "next/link";
import Image from "next/image";
import { useMyGroups } from "@/hooks/useGroups";
import { PageHeader } from "@/components/ui/PageHeader";

export default function GroupsPage() {
  const { data: groups = [], isLoading } = useMyGroups();

  return (
    <div className="min-h-dvh bg-bg">
      <PageHeader title="Groups" />

      <div className="flex px-5 pb-4 gap-1.5">
        <span className="bg-[#14121C] text-white text-[13px] font-bold px-[18px] py-2.5 rounded-pill">Groups</span>
        <Link href="/groups/confessions" className="text-ink-faint text-[13px] font-bold px-[18px] py-2.5">
          Confessions
        </Link>
      </div>

      {isLoading ? (
        <div className="px-5 text-sm text-ink-dim">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-ink-dim">You&apos;re not in any groups yet.</p>
          <Link href="/groups/create" className="text-sm font-bold text-secondary mt-2 inline-block">
            Create your first group
          </Link>
        </div>
      ) : (
        <>
          <div className="px-5 pb-4">
            {groups.slice(0, 1).map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="relative block dockin-dark-diag dotted-bg-dark rounded-hero p-5 overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="text-white font-bold text-base whitespace-nowrap">{g.name}</div>
                  <div className="flex shrink-0">
                    {[g.color, "#FF6B35", "#FF7A3D"].slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        className="w-[26px] h-[26px] rounded-full border-2 border-[#14121C]"
                        style={{ background: c, marginLeft: i > 0 ? -8 : 0 }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-white/50 text-xs mt-0.5">{g.memberCount} members</div>
              </Link>
            ))}
          </div>

          <div className="px-5 pb-6 flex gap-3">
            {groups.slice(1, 3).map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex-1 flat-card-plain rounded-hero overflow-hidden"
              >
                {g.avatar_image_url ? (
                  <div className="relative w-full h-[76px]">
                    <Image src={g.avatar_image_url} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="p-3.5">
                    <div className="w-[30px] h-[30px] rounded-[10px]" style={{ background: g.color }} />
                  </div>
                )}
                <div className="px-3.5 pb-3.5 pt-1">
                  <div className="text-[13.5px] font-bold text-ink">{g.name}</div>
                  <div className="text-[11px] text-ink-dim mt-0.5">{g.memberCount} members</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="px-5 pb-8">
        <Link
          href="/groups/confessions"
          className="flex items-center justify-between bg-white rounded-[20px] px-4 py-3.5 border-2 border-[#14121C] rotate-1"
        >
          <span className="text-[13.5px] font-bold text-ink">See what&apos;s new in confessions</span>
          <span className="text-secondary text-xs font-bold">See all →</span>
        </Link>
      </div>
    </div>
  );
}
