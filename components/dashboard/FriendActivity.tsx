const DEMO_STATUSES = [
  { name: "Kabir", place: "Mess 2" },
  { name: "Riya", place: "Central Library" },
];

/** Simple green-dot "friend is at X" status lines shown between the Who's-free card and the feed. */
export function FriendActivity() {
  return (
    <div className="px-5 pb-3 flex flex-col gap-2">
      {DEMO_STATUSES.map((s) => (
        <div key={s.name} className="flex items-center gap-2 text-[13.5px] text-ink font-medium">
          <span className="w-2 h-2 rounded-full bg-success shrink-0" />
          {s.name} is at {s.place}
        </div>
      ))}
    </div>
  );
}
