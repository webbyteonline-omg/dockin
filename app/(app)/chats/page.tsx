"use client";

import Link from "next/link";
import { Circle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { useConversations } from "@/hooks/useChats";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export default function ChatsPage() {
  const { data: conversations = [], isLoading } = useConversations();

  return (
    <div className="min-h-dvh bg-white">
      <PageHeader
        title="Chats"
        underline
        action={
          <Link
            href="/friends"
            aria-label="New chat"
            className="w-10 h-10 rounded-full bg-input border-[1.5px] border-line/[0.08] flex items-center justify-center"
          >
            <Circle className="w-3.5 h-3.5 text-ink" strokeWidth={2.5} />
          </Link>
        }
      />

      {isLoading ? (
        <div className="px-5 text-sm text-ink-dim">Loading…</div>
      ) : conversations.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-ink-dim">No chats yet.</p>
          <Link href="/friends" className="text-sm font-bold text-secondary mt-2 inline-block">
            Find friends to snap and chat with
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {conversations.map(({ friend, lastMessage, unread }) => {
            const name = friend.display_name ?? friend.username ?? "Friend";
            return (
              <Link
                key={friend.id}
                href={`/chats/${friend.id}`}
                className="flex items-center gap-3 px-5 py-3"
              >
                <Avatar name={name} size={52} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-ink truncate">{name}</div>
                  <div className={`text-[13px] mt-0.5 truncate ${unread > 0 ? "text-ink font-semibold" : "text-ink-dim"}`}>
                    {lastMessage.body}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="text-[11.5px] text-ink-faint">{timeAgo(lastMessage.created_at)}</div>
                  {unread > 0 && (
                    <div className="w-[19px] h-[19px] rounded-full bg-secondary text-white text-[10.5px] font-bold flex items-center justify-center">
                      {unread}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
