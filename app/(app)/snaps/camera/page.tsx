"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useFriends } from "@/hooks/useFriends";
import { useSendSnap } from "@/hooks/useSnaps";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

/**
 * Full-screen capture page — matches "05 — Camera" in the reference mockup:
 * corner brackets, timer/flip icon row, caption bar, gradient shutter.
 * Uses a file input with capture="environment" under the hood (the
 * practical route for a PWA without native camera access), but the visual
 * chrome around it matches the native-camera mockup exactly.
 */
export default function SnapCameraPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sendSnap = useSendSnap();
  const { data: friends = [] } = useFriends();
  const { toast, showToast } = useToast();

  const pick = (f: File | null) => {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    if (!file || selected.size === 0) return;
    try {
      await Promise.all(
        [...selected].map((recipientId) => sendSnap.mutateAsync({ recipientId, file, caption }))
      );
      showToast(`Snap sent to ${selected.size} ${selected.size === 1 ? "friend" : "friends"} 🎉`);
      setTimeout(() => router.push("/dashboard"), 700);
    } catch {
      showToast("Couldn't send — try again");
    }
  };

  return (
    <main className="fixed inset-0 z-30 bg-[#0A090D] overflow-hidden">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <Image src={preview} alt="Captured snap" fill className="object-cover" unoptimized />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1720] to-[#0A090D]" />
      )}

      {/* Corner brackets */}
      <div className="absolute top-[110px] left-7 w-[22px] h-[22px] border-t-[3px] border-l-[3px] border-white/60 rounded-tl-md" />
      <div className="absolute top-[110px] right-7 w-[22px] h-[22px] border-t-[3px] border-r-[3px] border-white/60 rounded-tr-md" />
      <div className="absolute bottom-[230px] left-7 w-[22px] h-[22px] border-b-[3px] border-l-[3px] border-white/60 rounded-bl-md" />
      <div className="absolute bottom-[230px] right-7 w-[22px] h-[22px] border-b-[3px] border-r-[3px] border-white/60 rounded-br-md" />

      {/* Top row */}
      <div className="absolute top-safe left-5 right-5 flex justify-between pt-safe">
        <Link
          href="/dashboard"
          aria-label="Close camera"
          className="w-9 h-9 rounded-full bg-white/[0.14] backdrop-blur-md flex items-center justify-center text-white"
        >
          <X className="w-4 h-4" />
        </Link>
        <div className="flex gap-2.5">
          <button className="w-9 h-9 rounded-full bg-white/[0.14] backdrop-blur-md flex items-center justify-center">
            <span className="w-3 h-3 rounded-full border-2 border-white" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/[0.14] backdrop-blur-md flex items-center justify-center text-white text-[13px] font-bold">
            3s
          </button>
        </div>
      </div>

      {!preview ? (
        <>
          {/* Caption bar (disabled until a photo exists, shown for visual parity) */}
          <div className="absolute bottom-[150px] left-5 right-5 bg-white/[0.12] backdrop-blur-md rounded-pill px-[18px] py-3 text-white/75 text-[13.5px]">
            Add a caption…
          </div>

          {/* Shutter row */}
          <div className="absolute bottom-11 left-0 right-0 flex items-center justify-around px-[30px]">
            <div className="w-10 h-10 rounded-xl dockin-gradient" />
            <button
              onClick={() => inputRef.current?.click()}
              aria-label="Capture"
              className="w-[76px] h-[76px] rounded-full dockin-gradient p-1 box-border"
            >
              <span className="block w-full h-full rounded-full bg-white" />
            </button>
            <button
              aria-label="Flip camera"
              className="w-10 h-10 rounded-full bg-white/[0.14] backdrop-blur-md flex items-center justify-center text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        <div className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-16 bg-gradient-to-t from-black/70 to-transparent">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={80}
            placeholder="Add a caption…"
            className="w-full bg-white/[0.14] backdrop-blur-md rounded-pill px-[18px] py-3 text-white placeholder:text-white/60 text-[13.5px] focus:outline-none"
          />

          {friends.length > 0 && (
            <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar">
              {friends.map((f) => {
                const name = f.display_name ?? f.username ?? "Friend";
                const on = selected.has(f.id);
                return (
                  <button key={f.id} onClick={() => toggle(f.id)} className="flex flex-col items-center gap-1 shrink-0">
                    <span className={cn("rounded-full", on && "ring-2 ring-secondary ring-offset-2 ring-offset-[#0A090D]")}>
                      <Avatar name={name} size={48} />
                    </span>
                    <span className="max-w-[52px] truncate text-[10.5px] font-semibold text-white/80">{name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => inputRef.current?.click()}
              className="w-11 h-11 rounded-full bg-white/[0.14] backdrop-blur-md flex items-center justify-center text-white shrink-0"
              aria-label="Retake"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={send}
              disabled={selected.size === 0 || sendSnap.isPending}
              className="flex-1 dockin-gradient rounded-pill text-white font-bold text-[15px] disabled:opacity-50"
            >
              {sendSnap.isPending ? "Sending…" : `Send${selected.size > 0 ? ` (${selected.size})` : ""}`}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-pill bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-xl" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
