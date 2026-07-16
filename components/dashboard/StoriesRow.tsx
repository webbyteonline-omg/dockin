import { Avatar } from "@/components/ui/Avatar";

interface StoryFriend {
  name: string;
  hasStory: boolean;
}

const DEMO_FRIENDS: StoryFriend[] = [
  { name: "Kabir Mehta", hasStory: true },
  { name: "Riya Sharma", hasStory: true },
  { name: "Ishaan Kapoor", hasStory: false },
  { name: "Sneha Iyer", hasStory: true },
];

/** Horizontal stories row: "+You" first, then friends with gradient rings on those with an unseen story. */
export function StoriesRow() {
  return (
    <div className="flex gap-3.5 px-5 pt-5 pb-1.5 overflow-x-auto no-scrollbar">
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="w-[60px] h-[60px] rounded-full border-2 border-dashed border-line/25 flex items-center justify-center text-[22px] text-ink/40">
          +
        </div>
        <div className="text-[11px] font-semibold text-ink-dim">You</div>
      </div>
      {DEMO_FRIENDS.map((f) => (
        <div key={f.name} className="flex flex-col items-center gap-1.5 shrink-0">
          <Avatar name={f.name} size={60} ringed={f.hasStory} />
          <div className={`text-[11px] font-semibold ${f.hasStory ? "text-ink" : "text-ink-dim"}`}>
            {f.name.split(" ")[0]}
          </div>
        </div>
      ))}
    </div>
  );
}
