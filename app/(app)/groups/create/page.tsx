"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateGroup } from "@/hooks/useGroups";
import { useFriends } from "@/hooks/useFriends";
import { cn } from "@/lib/utils";

const COLORS = ["#FF6B35", "#FF2D78", "#FFD166", "#2FE0A3", "#4FACFE"];
const EMOJIS = ["👥", "🎮", "⚽", "🎨", "📚", "🎵"];

export default function CreateGroupPage() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const { data: friends = [] } = useFriends();

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [emoji, setEmoji] = useState(EMOJIS[0]!);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (!name.trim()) return;
    const group = await createGroup.mutateAsync({
      name: name.trim(),
      avatarEmoji: emoji,
      avatarImageUrl: null,
      color,
      memberIds: [...selected],
    });
    router.replace(`/groups/${group.id}`);
  };

  return (
    <div className="min-h-dvh bg-white">
      <div className="px-5 pt-safe flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink -ml-1.5">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
      </div>

      <div className="px-5 pt-2 pb-8">
        <h1 className="font-display font-extrabold text-2xl text-ink mt-2">New group</h1>

        <div className="mt-6">
          <Input label="Group name" placeholder="CS Batch of 2027" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="mt-5 text-xs font-bold text-ink-dim tracking-wide mb-2">COLOR</div>
        <div className="flex gap-2.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn("w-9 h-9 rounded-full", color === c && "ring-2 ring-offset-2 ring-ink")}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="mt-5 text-xs font-bold text-ink-dim tracking-wide mb-2">ICON</div>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={cn(
                "w-11 h-11 rounded-btn text-lg flex items-center justify-center border-[1.5px]",
                emoji === e ? "border-secondary bg-secondary/10" : "border-line/[0.08] bg-input"
              )}
            >
              {e}
            </button>
          ))}
        </div>

        {friends.length > 0 && (
          <>
            <div className="mt-5 text-xs font-bold text-ink-dim tracking-wide mb-2">ADD MEMBERS</div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              {friends.map((f) => {
                const name = f.display_name ?? f.username ?? "Friend";
                const on = selected.has(f.id);
                return (
                  <button key={f.id} onClick={() => toggle(f.id)} className="flex flex-col items-center gap-1 shrink-0">
                    <span className={cn("rounded-full", on && "ring-2 ring-secondary ring-offset-2 ring-offset-white")}>
                      <Avatar name={name} size={48} />
                    </span>
                    <span className="max-w-[52px] truncate text-[10.5px] font-semibold text-ink">{name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <Button size="lg" className="w-full mt-8" loading={createGroup.isPending} onClick={submit}>
          Create group
        </Button>
      </div>
    </div>
  );
}
