"use client";

import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { useGroupMembers } from "@/hooks/useGroupMembers";

export default function GroupMembersPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const { data: members = [], isLoading } = useGroupMembers(params.groupId);

  return (
    <div className="min-h-dvh bg-bg">
      <div className="px-5 pt-safe flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink -ml-1.5">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
      </div>
      <PageHeader title="Members" />

      {isLoading ? (
        <div className="px-5 text-sm text-ink-dim">Loading…</div>
      ) : (
        <div className="px-5 flex flex-col gap-2 pb-8">
          {members.map((m) => {
            const name = m.profile?.display_name ?? m.profile?.username ?? "Member";
            return (
              <div key={m.id} className="flex items-center gap-3 flat-card-plain rounded-input px-3.5 py-2.5">
                <Avatar name={name} size={44} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-ink">{name}</div>
                  {m.role === "admin" && <div className="text-[11px] text-secondary font-bold">Admin</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
