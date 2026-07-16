"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useGroupById } from "@/hooks/useGroups";
import { useGroupMembers } from "@/hooks/useGroupMembers";

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const { data, isLoading } = useGroupById(params.groupId);
  const { data: members = [] } = useGroupMembers(params.groupId);

  if (isLoading || !data) {
    return <div className="min-h-dvh bg-bg px-5 pt-safe text-sm text-ink-dim">Loading…</div>;
  }

  const { group } = data;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="dockin-dark-diag dotted-bg-dark px-5 pt-safe pb-6">
        <button onClick={() => router.back()} aria-label="Back" className="text-white -ml-1.5 mb-4">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
        <div className="text-white font-display font-extrabold text-2xl">{group.name}</div>
        <div className="text-white/50 text-[13px] mt-1">{members.length} members</div>
      </div>

      <div className="px-5 py-5">
        <Link
          href={`/groups/${group.id}/members`}
          className="flex items-center gap-2 text-sm font-bold text-secondary mb-4"
        >
          <Users className="w-4 h-4" /> View all members
        </Link>

        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const name = m.profile?.display_name ?? m.profile?.username ?? "Member";
            return (
              <div key={m.id} className="flex items-center gap-3 flat-card-plain rounded-input px-3.5 py-2.5">
                <Avatar name={name} size={40} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{name}</div>
                  {m.role === "admin" && <div className="text-[11px] text-secondary font-bold">Admin</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
