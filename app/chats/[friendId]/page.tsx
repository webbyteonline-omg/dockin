"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Camera as CameraIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useFriendProfile } from "@/hooks/useFriends";
import { useChatRealtime, useMarkThreadRead, useSendMessage, useThread } from "@/hooks/useChats";
import { useIsOnline } from "@/lib/realtime";
import { useAuthStore } from "@/store/authStore";

function bubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams<{ friendId: string }>();
  const friendId = params.friendId;
  const uid = useAuthStore((s) => s.user?.id);

  useChatRealtime(friendId);
  const threadQuery = useThread(friendId);
  const friendQuery = useFriendProfile(friendId);
  const sendMessage = useSendMessage();
  const markRead = useMarkThreadRead();

  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const messages = threadQuery.data ?? [];
  const friend = friendQuery.data?.profile;
  const name = friend?.display_name ?? friend?.username ?? "Chat";
  const online = useIsOnline(friendId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (friendId && messages.some((m) => m.recipient_id === uid && !m.read_at)) {
      markRead.mutate(friendId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, friendId]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      await sendMessage.mutateAsync({ recipientId: friendId, body });
    } catch {
      setText(body);
    }
  };

  return (
    <main className="fixed inset-0 z-30 flex flex-col bg-bg dotted-bg">
      <header className="bg-white border-b-[1.5px] border-line/[0.08] flex items-center gap-3 px-5 pt-safe pb-3.5">
        <button onClick={() => router.push("/chats")} aria-label="Back" className="text-ink -ml-1">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
        <Avatar name={name} size={38} online={online} />
        <div className="flex-1">
          <div className="text-[15px] font-bold text-ink">{name}</div>
          {online && <div className="text-[11.5px] font-bold text-success">Active now</div>}
        </div>
        <div className="w-[34px] h-[34px] rounded-full bg-input" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-[18px] flex flex-col gap-2.5">
        {messages.length === 0 && !threadQuery.isLoading && (
          <p className="mt-10 text-center text-sm text-ink-dim">Say hi to {name} 👋</p>
        )}
        {messages.length > 0 && (
          <div className="text-center text-[11.5px] text-ink-faint mb-1">Today, {bubbleTime(messages[0]!.created_at)}</div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === uid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  mine
                    ? "max-w-[75%] dockin-gradient text-white text-[14.5px] px-[15px] py-[11px] rounded-[18px_18px_4px_18px]"
                    : "max-w-[75%] bg-white text-ink text-[14.5px] px-[15px] py-[11px] rounded-[18px_18px_18px_4px] border-[1.5px] border-line/[0.08]"
                }
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="bg-white border-t-[1.5px] border-line/[0.08] flex items-center gap-2.5 px-4 pt-3 pb-safe">
        <button
          onClick={() => router.push("/snaps/camera")}
          aria-label="Send a snap"
          className="w-[38px] h-[38px] rounded-full bg-[#14121C] flex items-center justify-center shrink-0"
        >
          <CameraIcon className="w-4 h-4 text-white" strokeWidth={2.2} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message…"
          className="flex-1 bg-input rounded-pill px-4 py-[11px] text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sendMessage.isPending}
          aria-label="Send"
          className="w-[38px] h-[38px] rounded-full dockin-gradient flex items-center justify-center text-white text-[15px] shrink-0 disabled:opacity-50"
        >
          ↑
        </button>
      </div>
    </main>
  );
}
