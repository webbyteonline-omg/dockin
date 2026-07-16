"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useInboxSnaps, useMarkSnapViewed } from "@/hooks/useSnaps";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

/** Full-screen view-once snap viewer — matches "06 — View-Once Viewer" in the reference mockup. */
export default function SnapViewerPage() {
  const router = useRouter();
  const params = useParams<{ snapId: string }>();
  const { data: snaps = [] } = useInboxSnaps();
  const markViewed = useMarkSnapViewed();
  const snap = snaps.find((s) => s.id === params.snapId);
  const [reply, setReply] = useState("");

  useEffect(() => {
    if (snap && !snap.viewed_at) {
      const t = setTimeout(() => markViewed.mutate(snap.id), 2500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.id]);

  if (!snap) {
    return (
      <main className="fixed inset-0 z-30 bg-[#0A090D] flex items-center justify-center">
        <p className="text-white/60 text-sm">This snap is gone — it expired or was already viewed.</p>
      </main>
    );
  }

  const senderName = snap.sender?.display_name ?? snap.sender?.username ?? "Someone";

  return (
    <main className="fixed inset-0 z-30 bg-[#0A090D] overflow-hidden">
      <Image src={snap.image_url} alt={`Snap from ${senderName}`} fill className="object-cover" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,9,13,0.6) 0%, rgba(10,9,13,0) 22%, rgba(10,9,13,0) 68%, rgba(10,9,13,0.65) 100%)",
        }}
      />

      <div className="absolute top-16 left-5 right-5 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-2.5">
          <Avatar name={senderName} size={32} />
          <div>
            <div className="text-white font-bold text-sm whitespace-nowrap">{senderName}</div>
            <div className="text-white/60 text-[11.5px]">{timeAgo(snap.created_at)}</div>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
        >
          ✕
        </Link>
      </div>

      <div className="absolute top-[114px] left-1/2 -translate-x-1/2 bg-white/[0.15] backdrop-blur-md rounded-pill px-3 py-[5px] text-white text-[10.5px] font-bold tracking-wide">
        VIEW ONCE
      </div>

      {snap.caption && (
        <div className="absolute bottom-[120px] left-6 right-6 text-white text-base font-semibold" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>
          {snap.caption}
        </div>
      )}

      <form
        className="absolute bottom-11 left-5 right-5 flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reply.trim()) return;
          setReply("");
          router.push(`/chats/${snap.sender_id}`);
        }}
      >
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Send a chat"
          className="flex-1 bg-white/[0.14] backdrop-blur-md border border-white/25 rounded-pill px-4 py-3 text-white placeholder:text-white/75 text-[13.5px] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          className="w-11 h-11 rounded-full dockin-gradient flex items-center justify-center text-white shrink-0"
        >
          ↑
        </button>
      </form>
    </main>
  );
}
