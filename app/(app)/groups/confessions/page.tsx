"use client";

import Link from "next/link";
import { useState } from "react";
import { useConfessionRealtime, useConfessions, usePostConfession } from "@/hooks/useConfessions";
import { PageHeader } from "@/components/ui/PageHeader";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default function ConfessionsPage() {
  useConfessionRealtime();
  const { data: confessions = [], isLoading } = useConfessions();
  const post = usePostConfession();
  const [text, setText] = useState("");

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    post.mutate(body);
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <PageHeader title="Groups" />

      <div className="flex px-5 pb-4 gap-1.5">
        <Link href="/groups" className="text-ink-faint text-[13px] font-bold px-[18px] py-2.5">
          Groups
        </Link>
        <span className="bg-[#14121C] text-white text-[13px] font-bold px-[18px] py-2.5 rounded-pill">
          Confessions
        </span>
      </div>

      <div className="flex-1 px-5 flex flex-col gap-3 pb-4">
        {isLoading && <div className="text-sm text-ink-dim">Loading…</div>}
        {!isLoading && confessions.length === 0 && (
          <p className="text-sm text-ink-dim text-center py-8">No confessions yet — be the first.</p>
        )}
        {confessions.map((c, i) => {
          const dark = i % 4 === 3;
          const rotate = i % 2 === 0 ? "-rotate-1" : "rotate-1";
          const dotColor = ["#FF2D78", "#FF6B35", "#FFD166"][i % 3];
          return (
            <div
              key={c.id}
              className={
                dark
                  ? "bg-gradient-to-br from-[#14121C] to-[#3a1440] rounded-[20px] p-4"
                  : `relative bg-white rounded-[20px] px-4 pt-[18px] pb-4 border-[1.5px] border-line/[0.08] ${rotate}`
              }
            >
              {!dark && (
                <span
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow"
                  style={{ background: dotColor }}
                />
              )}
              <div className="flex items-center gap-2">
                <div className={`w-[26px] h-[26px] rounded-full ${dark ? "bg-white/10" : "bg-input"}`} />
                <div className={`text-xs font-bold ${dark ? "text-white/60" : "text-ink-faint"}`}>
                  Anonymous · {timeAgo(c.created_at)}
                </div>
              </div>
              <div className={`text-sm mt-2.5 leading-relaxed ${dark ? "text-white" : "text-ink"}`}>{c.body}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border-t-[1.5px] border-line/[0.08] px-5 py-3.5 pb-safe flex items-center gap-2.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Share a confession…"
          className="flex-1 bg-input rounded-pill px-4 py-[11px] text-[13.5px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || post.isPending}
          className="bg-[#14121C] text-white text-[11.5px] font-bold px-3.5 py-[11px] rounded-pill whitespace-nowrap disabled:opacity-50"
        >
          Anon ✓
        </button>
      </div>
    </div>
  );
}
